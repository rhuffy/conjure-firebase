import { Project, VariableDeclarationKind } from "ts-morph";
import { IServiceDefinition } from "./conjure";

export default function generateClient(
  services: IServiceDefinition[],
  project: Project,
  clientOutputFilePath: string
): void {
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
  conjureServiceImports.addNamedImports(
    services.map((s) =>
      Object({
        name: s.name,
        alias: s.type === "firebase" ? "__" + s.name : undefined,
      })
    )
  );

  sourceFile.addVariableStatements([
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

  sourceFile.addVariableStatements(
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

  sourceFile.addExportDeclaration({
    namedExports: services.map((s) => s.name),
  });
}
