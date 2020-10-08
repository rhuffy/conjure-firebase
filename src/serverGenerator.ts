import {
  FunctionDeclaration,
  Project,
  SourceFile,
  VariableDeclarationKind,
} from "ts-morph";
import { IServiceDefinition, IEndpoint } from "./conjure";

const FIREBASE_CALLABLE_CONTEXT = "functions.https.CallableContext";

export default function generateServer(
  services: IServiceDefinition[],
  project: Project,
  serverOutputDir: string
) {
  for (const service of services.filter((x) => x.type === "firebase")) {
    const fileName = `${serverOutputDir}/${service.name}.ts`;
    //TODO be smart about the file path
    let file = project.addSourceFileAtPathIfExists(fileName);

    if (file === undefined) {
      file = project.createSourceFile(fileName);
    }

    const firebaseImport = file.getImportDeclaration(
      (dec) => dec.getModuleSpecifierValue() === "firebase-functions"
    );

    if (firebaseImport === undefined) {
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
        Array.from(
          new Set(
            service.endpoints
              .map((e) => e.inputType)
              .concat(service.endpoints.map((e) => e.returns))
          )
        )
      );
    } else {
      file.addImportDeclaration({
        // TODO be smart about where this path is
        moduleSpecifier: "./conjure-api",
        namedImports: Array.from(
          new Set(
            service.endpoints
              .map((e) => e.inputType)
              .concat(service.endpoints.map((e) => e.returns))
          )
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
    handleExports(service.endpoints, file);
  }
}

function createFunctionForEndpointInFile(
  endpoint: IEndpoint,
  file: SourceFile
) {
  file.addFunction({
    name: endpoint.name,
    parameters: [
      { name: "data", type: endpoint.inputType },
      { name: "context", type: FIREBASE_CALLABLE_CONTEXT },
    ],
    returnType: endpoint.returns,
    statements: (writer) =>
      writer.write("throw new Error(").quote("Not Implemented!").write(");"),
  });
  file.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: `__${endpoint.name}`,
        initializer: `functions.https.onCall(${endpoint.name})`,
      },
    ],
  });
  file.addExportDeclaration({
    namedExports: (writer) =>
      writer.write(`__${endpoint.name} as ${endpoint.name}`),
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

function handleExports(endpoints: IEndpoint[], file: SourceFile) {
  for (const endpoint of endpoints) {
    const statement = file.getVariableStatement(`__${endpoint.name}`);
    statement?.remove();
    file.addVariableStatement({
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: `__${endpoint.name}`,
          initializer: `functions.https.onCall(${endpoint.name})`,
        },
      ],
    });
  }
  for (const endpoint of endpoints) {
    const statement = file.getExportDeclaration((dec) =>
      dec
        .getNamedExports()
        .some((named) => named.getName() === `__${endpoint.name}`)
    );
    statement?.remove();
  }
  file.addExportDeclaration({
    namedExports: endpoints.map(
      (endpoint) => `__${endpoint.name} as ${endpoint.name}`
    ),
  });
}
