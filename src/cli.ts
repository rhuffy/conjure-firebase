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
    "To use Conjure with Firebase, specify the input and output paths."
  )
  .option(
    "-c, --config",
    'use a config file with name ".conjure-firebase-config.json" for arguments given as "input" and "output"'
  )
  .parse(process.argv);

if (command.config) {
  console.log("using config file");
  /**
    const data = require(".conjure-firebase-config.json");
    console.log(data);
    */
  process.exit();
} else {
  /** check that there are two inputs */
  const num_args = process.argv.slice(2).length;
  if (num_args === 0) {
    console.log("Error: no config file or arguments were given");
    process.exit();
  }
  if (process.argv.slice(2).length === 1) {
    console.log("Error: expected two arguments but only one was given");
    process.exit();
  } else {
    const input_path = process.argv[2];
    const output_path = process.argv[3];

    /** check if input path is valid */
    fs.open(input_path, "r", (err, fd) => {
      if (err) {
        console.log(err);
        process.exit();
      }
    });

    /** check if output path is valid */
    if (isInvalid(output_path, { file: true })) {
      console.log("Error: output path is an invalid file path");
      process.exit();
    }

    run(input_path, output_path, "functions/src");
  }
}

/**
     fs.stat(input_path, (exists) => {
        if (exists == null) {
            return true;
         } else if (exists.code === 'ENOENT') {
             return false;
         }
     });
*/

/** return error if null path and true if valid file
function checkInputPath(input_path: any): boolean {
    fs.open(input_path, 'r', (err, fd) => {
      if (err) {
        if (err.code === 'ENOENT') {
          console.error('${input_path} does not exist');
          return false;
        }

        throw err;
      }
    }
     return true;
}
*/
/**
function checkOutputPath(output_path: any): boolean {
    return true;
}
*/

/**
run(input_path, output_path);
*/
