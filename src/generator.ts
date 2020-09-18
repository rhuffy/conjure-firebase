import * as fs from "fs";
import * as yaml from "js-yaml";
import { IConjureSourceFile } from "./conjure";

const CONJURE_INPUT_FILE_PATH = process.argv[2];
const CLIENT_OUTPUT_FILE_PATH = process.argv[3];

interface ServiceDefinition {
  name: string;
  type: "http" | "firebase";
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
import { DefaultHttpApiBridge } from "conjure-client";
import FirebaseApiBridge from "./FirebaseApiBridge";
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
  `import { ${services.map((s) => s.name).join(", ")} } from "../conjure-api"`;
const firebaseServiceToExport = (name: string) =>
  `const ${name}_instance = new ${name}(fab);\nexport { ${name}_instance as ${name} };\n`;

const httpServiceToExport = (name: string) =>
  `const ${name}_instance = new ${name}(hab);\nexport { ${name}_instance as ${name} };\n`;

if (require.main === module) {
  const [services, conjureYml] = parseConjure(CONJURE_INPUT_FILE_PATH);
  const clientCode = generateClient(services);
  fs.writeFileSync(CLIENT_OUTPUT_FILE_PATH, clientCode);
  process.stdout.write(conjureYml);
}
