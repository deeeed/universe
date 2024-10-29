#!/usr/bin/env node
// packages/publisher/bin/publisher.ts
import { Command } from "commander";
import { initCommand } from "../src/commands/init";
import { releaseCommand } from "../src/commands/release";
import { validateCommand } from "../src/commands/validate";
import { changelogCommand } from "../src/commands/changelog";
import { integrityCommand } from "../src/commands/integrity";
import pkg from "../package.json";
import workspacesCommand from "../src/commands/workspaces";

const program = new Command();

program
  .name("publisher")
  .description("Monorepo release management tool")
  .version(pkg.version);

program.addCommand(initCommand);
program.addCommand(releaseCommand);
program.addCommand(validateCommand);
program.addCommand(workspacesCommand);
program.addCommand(changelogCommand);
program.addCommand(integrityCommand);
program.parse(process.argv);
