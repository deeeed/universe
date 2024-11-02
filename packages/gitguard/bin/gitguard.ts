#!/usr/bin/env node
import { Command } from "commander";
import { version } from "../package.json";
import { analyze } from "../src/commands/analyze";
import { hook } from "../src/commands/hook";

interface GlobalOptions {
  debug?: boolean;
  config?: string;
}

interface HookOptions {
  global?: boolean;
}

interface AnalyzeOptions {
  pr?: string;
  branch?: string;
}

const program = new Command();

program
  .name("gitguard")
  .description("A smart Git commit message and PR analysis tool")
  .version(version)
  .option("-d, --debug", "Enable debug mode")
  .option("-c, --config <path>", "Path to config file");

program
  .command("hook")
  .description("Manage git hooks")
  .argument("<action>", "Action to perform: install or uninstall")
  .option("-g, --global", "Apply globally")
  .action(async (action: string, options: HookOptions) => {
    const globalOptions = program.opts<GlobalOptions>();
    await hook({
      action: action as "install" | "uninstall",
      global: Boolean(options.global),
      debug: Boolean(globalOptions.debug),
    });
  });

program
  .command("analyze")
  .description("Analyze current changes or PR")
  .option("-p, --pr <number>", "PR number to analyze")
  .option("-b, --branch <name>", "Branch to analyze")
  .action(async (options: AnalyzeOptions) => {
    const globalOptions = program.opts<GlobalOptions>();
    await analyze({
      pr: options.pr,
      branch: options.branch,
      debug: Boolean(globalOptions.debug),
      configPath: globalOptions.config,
    });
  });

program.parse();
