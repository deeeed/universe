#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "../src/commands/init";
import { releaseCommand } from "../src/commands/release";
import { validateCommand } from "../src/commands/validate";
import pkg from "../package.json";

const program = new Command();

program
  .name("publisher")
  .description("Monorepo release management tool")
  .version(pkg.version);

program.addCommand(initCommand);
program.addCommand(releaseCommand);
program.addCommand(validateCommand);

program.parse(process.argv);
