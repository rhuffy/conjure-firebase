import * as fs from "fs";
import * as yaml from "js-yaml";
import { exec } from "child_process";
import { IConjureSourceFile } from "./conjure";
import { conjure_version } from "../package.json";

interface ServiceDefinition {
  name: string;
  type: "http" | "firebase";
}

export function run(
  conjureInputFilePath: string,
  clientOutputFilePath: string
) {
  const [services, conjureYml] = parseConjure(conjureInputFilePath);
  const clientCode = generateClient(services);
  fs.writeFileSync(clientOutputFilePath, clientCode);
  fs.writeFileSync("generated-conjure.yml", conjureYml);
  exec(
    `rm -rf conjure-api && mkdir conjure-api &&
  ./node_modules/conjure-firebase/conjure-${conjure_version}/bin/conjure compile generated-conjure.yml generated.conjure.json &&
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

function parseConjure(path: string): [ServiceDefinition[], string] {
  const declaredServices: ServiceDefinition[] = [];
  const doc = yaml.safeLoad(
    fs.readFileSync(path, "utf8")
  ) as IConjureSourceFile;
  for (const serviceName in doc.services) {
    if (doc.services[serviceName]["firebase-callable"] === true) {
      declaredServices.push({ name: serviceName, type: "firebase" });
      delete doc.services[serviceName]["firebase-callable"];
      for (const functionName in doc.services[serviceName].endpoints) {
        doc.services[serviceName].endpoints[functionName][
          "http"
        ] = `POST /${functionName}`;
      }
    } else {
      declaredServices.push({ name: serviceName, type: "http" });
    }
  }
  return [declaredServices, yaml.safeDump(doc)];
}

function generateClient(services: ServiceDefinition[]): string {
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

const servicesToImport = (services: ServiceDefinition[]) =>
  `import { DefaultHttpApiBridge, FirebaseApiBridge, ${services
    .map((s) => s.name)
    .join(", ")} } from "conjure-firebase"`;
const firebaseServiceToExport = (name: string) =>
  `const ${name}_instance = new ${name}(fab);\nexport { ${name}_instance as ${name} };\n`;

const httpServiceToExport = (name: string) =>
  `const ${name}_instance = new ${name}(hab);\nexport { ${name}_instance as ${name} };\n`;
