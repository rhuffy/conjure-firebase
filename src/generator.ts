import * as fs from "fs";
import * as yaml from "js-yaml";
import { exec } from "child_process";
import { IConjureSourceFile, IServiceDefinition, IEndpoint } from "./conjure";
import generateClient from "./clientGenerator";
import generateServer from "./serverGenerator";
import { Project } from "ts-morph";

import package_json from "../package.json";

export function run(
  conjureInputFilePath: string,
  clientOutputFilePath: string,
  serverOutputDir: string
): void {
  const [services, conjureYml] = parseConjure(conjureInputFilePath);

  const project = new Project();
  generateServer(services, project, serverOutputDir);
  generateClient(services, project, clientOutputFilePath);
  project.save();

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
          inputType: "I" + doc.services[serviceName].endpoints[name].data,
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
        doc.services[serviceName].endpoints[functionName]["args"] = {
          data: doc.services[serviceName].endpoints[functionName].data,
        };
        delete doc.services[serviceName].endpoints[functionName].data;
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
