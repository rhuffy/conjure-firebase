import * as fs from "fs";
import * as yaml from "js-yaml";
import {
  FunctionDeclaration,
  InterfaceDeclaration,
  Project,
  SourceFile,
} from "ts-morph";
import { exec } from "child_process";
import { IConjureSourceFile } from "./conjure";
const package_json = require("../package.json");

const FIREBASE_CALLABLE_CONTEXT = "functions.https.CallableContext";
const CLOUD_FUNCTIONS_URL =
  "https://us-central1-my-cool-project.cloudfunctions.net";

interface IServiceDefinition {
  name: string;
  type: "http" | "firebase";
  endpoints: IEndpoint[];
}

interface IEndpoint {
  name: string;
  inputType: string;
  returns: string;
}

export function run(
  conjureInputFilePath: string,
  clientOutputFilePath: string
) {
  const [services, conjureYml] = parseConjure(conjureInputFilePath);
  generateServer(services);
  const clientCode = generateClient(services);
  fs.writeFileSync(clientOutputFilePath, clientCode);
  fs.writeFileSync("generated-conjure.yml", conjureYml);
  exec(
    `rm -rf conjure-api && mkdir conjure-api &&
  ./node_modules/conjure-firebase/conjure-${package_json.conjure_version}/bin/conjure compile generated-conjure.yml generated.conjure.json &&
  conjure-typescript generate --rawSource generated.conjure.json conjure-api &&
  rm generated-conjure.yml generated.conjure.json`,
    (e, stdout, stderr) => {
      if (e) {
        console.error(e);
      }
      process.stdout.write(stdout);
      process.stderr.write(stderr);
    }
  );
}

function parseConjure(path: string): [IServiceDefinition[], string] {
  const declaredServices: IServiceDefinition[] = [];
  const doc = yaml.safeLoad(
    fs.readFileSync(path, "utf8")
  ) as IConjureSourceFile;
  for (const serviceName in doc.services) {
    if (doc.services[serviceName]["firebase-callable"] === true) {
      const endpointNames = Object.keys(doc.services[serviceName].endpoints);
      const endpoints: IEndpoint[] = endpointNames.map((name) => {
        return {
          name,
          inputType: "I" + doc.services[serviceName].endpoints[name].args.data,
          returns: "I" + doc.services[serviceName].endpoints[name].returns,
        };
      });
      declaredServices.push({
        name: serviceName,
        type: "firebase",
        endpoints: endpoints,
      });
      delete doc.services[serviceName]["firebase-callable"];
      for (const functionName in doc.services[serviceName].endpoints) {
        doc.services[serviceName].endpoints[functionName][
          "http"
        ] = `POST /${functionName}`;
      }
    } else {
      declaredServices.push({
        name: serviceName,
        type: "http",
        endpoints: doc.services[serviceName].endpoints,
      });
    }
  }
  return [declaredServices, yaml.safeDump(doc)];
}

function generateServer(services: IServiceDefinition[]) {
  const project = new Project();

  for (const service of services.filter((x) => x.type === "firebase")) {
    const fileName = `${service.name}.ts`;
    //TODO be smart about the file path
    let file = project.addSourceFileAtPathIfExists(fileName);

    if (file === undefined) {
      file = project.createSourceFile(fileName);
      file.addImportDeclaration({
        namespaceImport: "functions",
        moduleSpecifier: "firebase-functions",
      });
    }

    const importDec = file.getImportDeclaration((i) => {
      return i.getModuleSpecifierValue().split("/").pop() === "conjure-api";
    });

    if (importDec) {
      importDec.removeNamedImports();
      importDec.addNamedImports([
        ...new Set(service.endpoints.map((e) => e.inputType)),
      ]);
    } else {
      file.addImportDeclaration({
        // TODO be smart about where this path is
        moduleSpecifier: "./conjure-api",
        namedImports: [...new Set(service.endpoints.map((e) => e.inputType))],
      });
    }

    for (const endpoint of service.endpoints) {
      const endpointFunction = file.getFunction(endpoint.name);
      if (endpointFunction) {
        modifyFunctionForEndpoint(endpoint, endpointFunction);
      } else {
        createFunctionForEndpointInFile(endpoint, file);
      }
    }
  }

  project.save();
}

function createFunctionForEndpointInFile(
  endpoint: IEndpoint,
  file: SourceFile
) {
  file.addFunction({
    name: endpoint.name,
    isExported: true,
    parameters: [
      { name: "data", type: endpoint.inputType },
      { name: "context", type: FIREBASE_CALLABLE_CONTEXT },
    ],
    returnType: endpoint.returns,
    statements: (writer) =>
      writer.write("throw new Error(").quote("Not Implemented!").write(");"),
  });
}

function modifyFunctionForEndpoint(
  endpoint: IEndpoint,
  functionDec: FunctionDeclaration
) {
  functionDec.getParameter("data")?.setType(endpoint.inputType);
  if (functionDec.isAsync()) {
    functionDec.setReturnType(`Promise<${endpoint.returns}>`);
  } else {
    functionDec.setReturnType(endpoint.returns);
  }
}

function generateClient(services: IServiceDefinition[]): string {
  const cloudFunctionsBaseUrl =
    "https://us-central1-my-cool-project.cloudfunctions.net";

  let serviceExports = "";
  for (const definition of services) {
    if (definition.type === "firebase") {
      serviceExports += firebaseServiceToExport(definition.name);
    }
    if (definition.type === "http") {
      serviceExports += httpServiceToExport(definition.name);
    }
  }
  const clientCode = `
${servicesToImport(services)}

const fab = new FirebaseApiBridge();
const hab = new DefaultHttpApiBridge({
  baseUrl: "${cloudFunctionsBaseUrl}",
  userAgent: {
    productName: "conjure-firebase",
    productVersion: "1.0.0",
  },
});

${serviceExports}
  `;
  return clientCode;
}

const servicesToImport = (services: IServiceDefinition[]) =>
  `import { DefaultHttpApiBridge, FirebaseApiBridge } from "conjure-firebase";
import { ${services.map((s) => s.name).join(", ")} } from "./conjure-api";`;

const firebaseServiceToExport = (name: string) =>
  `const ${name}_instance = new ${name}(fab);\nexport { ${name}_instance as ${name} };\n`;

const httpServiceToExport = (name: string) =>
  `const ${name}_instance = new ${name}(hab);\nexport { ${name}_instance as ${name} };\n`;
