#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import { readFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { branchCommand } from "../commands/branch.js";
import { commitCommand } from "../commands/commit.js";
import { initCommand } from "../commands/init.js";
import { statusCommand } from "../commands/status.js";
import { LoggerService } from "../services/logger.service.js";
import { addGlobalOptions, GlobalOptions } from "../cli/shared-options.js";

interface PackageJson {
  version: string;
}

function isDebugEnabled(): boolean {
  return (
    process.argv.includes("--debug") ||
    process.env.GITGUARD_DEBUG === "true" ||
    process.env.DEBUG === "true"
  );
}

function disableColors(): void {
  process.env.FORCE_COLOR = "0";
}

async function main(): Promise<void> {
  const debug: boolean = isDebugEnabled();
  const logger = new LoggerService({ debug });
  const program = new Command();
  addGlobalOptions(program);

  // Add error handling for unknown commands and options
  program.showHelpAfterError();
  program.showSuggestionAfterError();

  // Set version early
  let version = "0.0.0-dev";
  try {
    let packagePath: string;

    if (typeof __dirname !== "undefined") {
      packagePath = resolve(__dirname, "../../package.json");
    } else {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      packagePath = resolve(__dirname, "../../package.json");
    }

    const packageJson = JSON.parse(
      await readFile(packagePath, "utf8"),
    ) as PackageJson;
    version = packageJson.version;
  } catch (error) {
    logger.error("Failed to load version:", error);
  }

  // Create the program
  program
    .name("gitguard")
    .version(version)
    .helpOption("-h, --help", "Display help for command")
    .configureHelp({
      sortSubcommands: true,
      sortOptions: true,
    })
    .configureOutput({
      writeOut: (str) => {
        if (!str.includes("Usage: gitguard")) {
          process.stdout.write(str);
        }
      },
      writeErr: (str) => process.stderr.write(str),
    })
    .addHelpText(
      "beforeAll",
      `${chalk.blue(`GitGuard v${version}`)} - A Git workflow enhancement tool that provides:

  ${chalk.green("•")} Commit message validation and formatting
  ${chalk.green("•")} AI-powered suggestions
  ${chalk.green("•")} Security checks for secrets and sensitive files
  ${chalk.green("•")} PR template validation
  ${chalk.green("•")} Local and global configuration

${chalk.blue("Commands:")}
  ${chalk.cyan("commit")} [options]              ${chalk.gray("Analyze and create commits with enhanced validation")}
  ${chalk.cyan("branch")} [options]              ${chalk.gray("Analyze branch-level changes and pull requests")}
  ${chalk.cyan("status")} [options]              ${chalk.gray("Show GitGuard status (hooks and configuration)")}
  ${chalk.cyan("init")} [options]                ${chalk.gray("Initialize GitGuard configuration")}

${chalk.blue("Options:")}
  ${chalk.yellow("-d, --debug")}              Enable debug mode
  ${chalk.yellow("-c, --config <path>")}      Path to config file
  ${chalk.yellow("-V, --version")}            Output the version number
  ${chalk.yellow("-h, --help")}               Display help for command`,
    )
    .addCommand(commitCommand)
    .addCommand(branchCommand)
    .addCommand(statusCommand)
    .addCommand(initCommand);

  // Add a default action when no command is provided
  program.action(() => {
    program.help();
  });

  // Add this before program.hook
  program.hook("preAction", (thisCommand: Command) => {
    const rootOptions = program.opts<GlobalOptions>();
    const currentOptions = thisCommand.opts<GlobalOptions>();

    // Get all parent options
    let parent = thisCommand.parent;
    while (parent) {
      const parentOpts = parent.opts<GlobalOptions>();
      Object.assign(currentOptions, parentOpts);
      parent = parent.parent;
    }

    // Handle color option
    if (rootOptions.noColors || currentOptions.noColors) {
      disableColors();
    }

    // Ensure debug is properly set
    if (rootOptions.debug || currentOptions.debug) {
      Object.assign(currentOptions, { debug: true });
      thisCommand.setOptionValue("debug", true);
      process.env.GITGUARD_DEBUG = "true";
    }
  });

  // Parse arguments
  await program.parseAsync(process.argv);
}

// Updated execution check that works in both environments
const isDirectlyExecuted = (): boolean => {
  if (typeof require !== "undefined" && require.main === module) {
    return true;
  }

  if (import.meta.url) {
    const executedFile = fileURLToPath(import.meta.url);
    return (
      process.argv[1] === executedFile ||
      process.argv[1].endsWith("gitguard.cjs") ||
      process.argv[1].endsWith("gitguard.js")
    );
  }

  return false;
};

if (isDirectlyExecuted()) {
  const logger = new LoggerService({ debug: false });
  main().catch((error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}

export { main };
