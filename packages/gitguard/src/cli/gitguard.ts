#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import { readFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { analyzeBranch } from "../commands/branch.js";
import { analyzeCommit } from "../commands/commit.js";
import { init, InitOptions } from "../commands/init.js";
import { status } from "../commands/status.js";
import { LoggerService } from "../services/logger.service.js";

interface CommitCommandOptions {
  message?: string;
  staged?: boolean;
  unstaged?: boolean;
  all?: boolean;
  ai?: boolean;
  execute?: boolean;
  debug?: boolean;
  configPath?: string;
}

interface BranchCommandOptions {
  ai?: boolean;
  debug?: boolean;
  configPath?: string;
  createPR?: boolean;
  draft?: boolean;
  title?: string;
  description?: string;
  base?: string;
}

interface PackageJson {
  version: string;
}

function isDebugEnabled(): boolean {
  // Check environment variable first
  const debugEnv = process.env.GITGUARD_DEBUG;
  if (debugEnv) {
    return ["1", "true", "yes", "on", "y"].includes(debugEnv.toLowerCase());
  }

  // Check CLI flag
  return process.argv.includes("--debug") || process.argv.includes("-d");
}

async function main(): Promise<void> {
  // Check both CLI flag and environment variable for debug mode
  const isDebug = isDebugEnabled();
  const logger = new LoggerService({ debug: isDebug });
  const program = new Command();

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
        // Prevent default help output
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
  ${chalk.cyan("branch")} [options]                ${chalk.gray("Analyze branch-level changes and pull requests")}
  ${chalk.cyan("status")} [options]               ${chalk.gray("Show GitGuard status (hooks and configuration)")}
  ${chalk.cyan("init")} [options]                 ${chalk.gray("Initialize GitGuard configuration")}

${chalk.blue("Options:")}
  ${chalk.yellow("-d, --debug")}              Enable debug mode
  ${chalk.yellow("-c, --config <path>")}      Path to config file
  ${chalk.yellow("-V, --version")}            Output the version number
  ${chalk.yellow("-h, --help")}               Display help for command`,
    )
    .option(`${chalk.yellow("-d, --debug")}`, "Enable debug mode")
    .option(`${chalk.yellow("-c, --config <path>")}`, "Path to config file");

  // Commit command
  program
    .command("commit")
    .description("Analyze and create commits with enhanced validation")
    .option("-m, --message <text>", "Commit message")
    .option("--staged", "Include analysis of staged changes (default: true)")
    .option("--unstaged", "Include analysis of unstaged changes")
    .option("--all", "Analyze both staged and unstaged changes")
    .option("--ai", "Enable AI-powered suggestions")
    .option("-e, --execute", "Execute the commit")
    .option("-d, --debug", "Enable debug mode")
    .addHelpText(
      "after",
      `
${chalk.blue("Examples:")}
  ${chalk.yellow("$")} gitguard commit                    # Analyze staged changes
  ${chalk.yellow("$")} gitguard commit -m "feat: new"     # Analyze with message
  ${chalk.yellow("$")} gitguard commit --ai -e            # AI suggestions and commit
  ${chalk.yellow("$")} gitguard commit --all              # Analyze all changes`,
    )
    .action(async (options: CommitCommandOptions) => {
      try {
        await analyzeCommit({
          options: {
            ...options,
            debug: isDebugEnabled() || options.debug,
          },
        });
      } catch (error) {
        logger.error("Commit command failed:", error);
        process.exit(1);
      }
    });

  // Branch command
  program
    .command("branch")
    .description("Analyze branch-level changes and pull requests")
    .option("--ai", "Enable AI-powered suggestions")
    .option("-d, --debug", "Enable debug mode")
    .option("--create-pr", "Create a pull request from the branch")
    .option("--draft", "Create PR as draft (implies --create-pr)")
    .option("--title <title>", "PR title")
    .option("--description <description>", "PR description")
    .option("--base <branch>", "Base branch for PR", "main")
    .addHelpText(
      "after",
      `
${chalk.blue("Examples:")}
  ${chalk.yellow("$")} gitguard branch                # Analyze current branch
  ${chalk.yellow("$")} gitguard branch --ai           # Get AI suggestions for PR
  ${chalk.yellow("$")} gitguard branch --create-pr    # Create PR from current branch
  ${chalk.yellow("$")} gitguard branch --create-pr --draft  # Create draft PR`,
    )
    .action(async (options: BranchCommandOptions) => {
      const debug = isDebugEnabled() || options.debug;
      const logger = new LoggerService({ debug });

      logger.debug("Starting branch command with options:", options);

      try {
        await analyzeBranch({
          options: {
            ...options,
            debug,
          },
        });
        logger.debug("Branch command completed successfully");
        process.exit(0);
      } catch (error) {
        logger.error("Branch command failed:", error);
        logger.debug("Full error details:", error);
        process.exit(1);
      }
    });

  // Status command
  program
    .command("status")
    .description("Show GitGuard status")
    .addHelpText(
      "after",
      `
Examples:
  $ gitguard status           # Show status information`,
    )
    .action(async (options: { configOnly?: boolean }) => {
      try {
        await status({
          debug: isDebug || !!program.opts().debug, // Check both sources
          configOnly: options.configOnly,
        });
      } catch (error) {
        logger.error(chalk.red("Failed to get status:"), error);
        process.exit(1);
      }
    });

  // Init command
  program
    .command("init")
    .description("Initialize GitGuard configuration")
    .option("-g, --global", "Create global configuration")
    .addHelpText(
      "after",
      `
${chalk.blue("Examples:")}
  ${chalk.yellow("$")} gitguard init           # Initialize local configuration
  ${chalk.yellow("$")} gitguard init -g        # Initialize global configuration

${chalk.blue("Configuration includes:")}
  ${chalk.green("•")} Git base branch
  ${chalk.green("•")} Conventional commits validation
  ${chalk.green("•")} Security checks
  ${chalk.green("•")} AI assistance
  ${chalk.green("•")} PR template validation`,
    )
    .action(async (options: InitOptions) => {
      try {
        await init({
          global: options.global,
          debug: !!program.opts().debug,
        });
      } catch (error) {
        logger.error("Init command failed:", error);
        process.exit(1);
      }
    });

  // Add a default action when no command is provided
  program.action(() => {
    program.help();
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
