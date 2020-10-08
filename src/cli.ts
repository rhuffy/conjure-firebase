#!/usr/bin/env node
import { run } from "./generator";
import * as fs from "fs";
import { Command } from "commander";

const isInvalid = require("is-invalid-path");
const package_json = require("../package.json");

const command = new Command();
command
  .version(package_json.version)
  .description(
    "To use Conjure with Firebase, specify the input and output paths and the project path to save service functions."
  )
  .option(
    "-c, --config",
    'use a config file with name ".conjure-firebase-config.json" for arguments given as "input", "output", and "functionsProject"'
  )
  .parse(process.argv);

var input_path = "";
var output_path = "";
var functions_source = "";

if (command.config) {
  console.log("using config file...");
  const data = fs.readFileSync("conjure-firebase-config.json", {
    encoding: "utf8",
    flag: "r",
  });
  const parsedData = JSON.parse(data);

  /** check that all arguments are given in config file*/
  if (
    !parsedData.hasOwnProperty("input") ||
    !parsedData.hasOwnProperty("output") ||
    !parsedData.hasOwnProperty("functionsProject")
  ) {
    console.log(
      "Error: config file is missing field or not formatted properly. Specify input, output, and functionsProject properties"
    );
    console.log(command.helpInformation());
    process.exit();
  }

  input_path = parsedData.input;
  output_path = parsedData.output;
  functions_source = parsedData.functionsProject;
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

/** check if input path is valid */
fs.open(input_path, "r", (err, fd) => {
  if (err) {
    console.log(err);
    console.log(command.helpInformation());
    process.exit();
  }
});

/** check if output path is valid */
if (isInvalid(output_path)) {
  console.log("Error: output path is an invalid file path");
  console.log(command.helpInformation());
  process.exit();
}

/** check if function source folder is valid path */
if (isInvalid(functions_source)) {
  console.log("Error: functions source folder is not a valid path");
  console.log(command.helpInformation());
  process.exit();
}

run(input_path, output_path, functions_source);
