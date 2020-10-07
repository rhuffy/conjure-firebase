import * as fs from "fs";
import * as yaml from "js-yaml";
import { exec } from "child_process";
import { IConjureSourceFile } from "./conjure";
import { Project, VariableDeclarationKind, Writers } from "ts-morph";
import { SourceFile } from "typescript";
const package_json = require("../package.json");

interface ServiceDefinition {
  name: string;
  type: "http" | "firebase";
}

export function run(
  conjureInputFilePath: string,
  clientOutputFilePath: string
) {
  const [services, conjureYml] = parseConjure(conjureInputFilePath);
  fs.writeFileSync("generated-conjure.yml", conjureYml);
  generateClient(clientOutputFilePath, services);

  // exec(
  //     `rm -rf conjure-api && mkdir conjure-api &&
  // ./node_modules/conjure-firebase/conjure-${package_json.conjure_version}/bin/conjure compile generated-conjure.yml generated.conjure.json &&
  // conjure-typescript generate --rawSource generated.conjure.json conjure-api &&
  // rm generated-conjure.yml generated.conjure.json`,
  //     (e, stdout, stderr) => {
  //         if (e) {
  //             console.error(e);
  //         }
  //         process.stdout.write(stdout);
  //         process.stderr.write(stderr);
  //     }
  // );
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

function generateClient(
  clientOutputFilePath: string,
  services: ServiceDefinition[]
) {
  const project = new Project();
  const sourceFile = project.createSourceFile(clientOutputFilePath, "", {
    overwrite: true,
  });

  const importDeclarationStructures = [
    {
      namedImports: ["DefaultHttpApiBridge", "FirebaseApiBridge"],
      moduleSpecifier: "conjure-firebase",
    },
    {
      moduleSpecifier: "./conjure-api",
    },
  ];
  // TODO: be smart about import filepaths
  const importDeclarations = sourceFile.addImportDeclarations(
    importDeclarationStructures
  );
  const conjureServiceImports = importDeclarations[1];
  const aliasedImports = conjureServiceImports.addNamedImports(
    services.map((s) =>
      Object({
        name: s.name,
        alias: s.type === "firebase" ? "__" + s.name : undefined,
      })
    )
  );

  const apiBridgeVariableStatements = sourceFile.addVariableStatements([
    {
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: "fab",
          initializer: "new FirebaseApiBridge()",
        },
      ],
    },
  ]);

  const serviceVariableStatements = sourceFile.addVariableStatements(
    services
      .filter((s) => s.type === "firebase")
      .map((s) => {
        return {
          declarationKind: VariableDeclarationKind.Const,
          declarations: [
            {
              name: s.name,
              initializer: `new __${s.name}(fab)`,
            },
          ],
        };
      })
  );

  const exportDeclarations = sourceFile.addExportDeclaration({
    namedExports: services.map((s) => s.name),
  });

  project.save();
}
