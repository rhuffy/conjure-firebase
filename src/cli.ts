#!/usr/bin/env node
import { run } from "./generator";
import * as fs from "fs";
import { Command } from "commander";

import package_json = require("../package.json");

const command = new Command();
command
  .version(package_json.version)
  .description(
    "To use Conjure with Firebase, specify the input and output paths and the project path to save server functions."
  )
  .option(
    "-c, --config",
    'use a config file in json format with name ".conjure-firebase-config" for arguments given as "input", "output", and functionsProject"'
  )
  .parse(process.argv);

/** Do we have two different run functions with diff inputs? or do we always accept same number of inputs
  .option(
    "-cl, --client",
    'use config file in json format with name ".conjure-firebase-config" with argument "input" and "output" to generate only client '
  )
  .option(
    "-s, --server",
    'use config file in json format with name ".conjure-firebase-config" with arguments'
  )
*/
let input_path = "";
let output_path = "";
let functions_source = "";

if (command.config) {
  console.log("using config file...");
  const data = fs.readFileSync(".conjure-firebase-config", {
    encoding: "utf8",
    flag: "r",
  });
  const parsedData = JSON.parse(data);

  /** check that all arguments are given in config file*/
  if (
    !("conjureDefinitions" in parsedData) ||
    !("clientFile" in parsedData) ||
    !("functionsPath" in parsedData)
  ) {
    console.log(
      "Error: config file is missing field or not formatted properly. Specify input, output, and functionsProject properties"
    );
    console.log(command.helpInformation());
    process.exit();
  }

  input_path = parsedData.conjureDefinitions;
  output_path = parsedData.clientFile;
  functions_source = parsedData.functionsPath;
  console.log("config file was read successfully");
} else {
  /** check that there are two inputs */
  const num_args = process.argv.slice(2).length;
  if (num_args === 0) {
    console.log("Error: no config file or arguments were given");
    console.log(command.helpInformation());
    process.exit();
  }
  if (process.argv.slice(2).length === 1) {
    console.log("Error: expected three arguments but only one was given");
    console.log(command.helpInformation());
    process.exit();
  }
  if (process.argv.slice(2).length === 2) {
    console.log("Error: expected three arguments but only two were given");
    console.log(command.helpInformation());
    process.exit();
  }
  input_path = process.argv[2];
  output_path = process.argv[3];
  functions_source = process.argv[4];
}

if (!fs.lstatSync(input_path).isFile()) {
  console.log("Error: input file does not exist");
  console.log(command.helpInformation());
  process.exit();
}

/** check if function source folder is valid path */
if (!fs.lstatSync(functions_source).isDirectory()) {
  console.log("Error: output functions directory does not exist");
  console.log(command.helpInformation());
  process.exit();
}

run(input_path, output_path, functions_source);
