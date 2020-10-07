import { FunctionDeclaration, Project, SourceFile } from "ts-morph";
import { IServiceDefinition, IEndpoint } from "./conjure";

const FIREBASE_CALLABLE_CONTEXT = "functions.https.CallableContext";

export default function generateServer(
  services: IServiceDefinition[],
  project: Project
) {
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
      importDec.addNamedImports(
        Array.from(new Set(service.endpoints.map((e) => e.inputType)))
      );
    } else {
      file.addImportDeclaration({
        // TODO be smart about where this path is
        moduleSpecifier: "./conjure-api",
        namedImports: Array.from(
          new Set(service.endpoints.map((e) => e.inputType))
        ),
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
