#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import { readFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { analyze } from "../commands/analyze.js";
import { hook } from "../commands/hook.js";
import { init, InitOptions } from "../commands/init.js";
import { status } from "../commands/status.js";
import { LoggerService } from "../services/logger.service.js";

interface HookOptions {
  global?: boolean;
  debug?: boolean;
}

interface AnalyzeOptions {
  pr?: string | number;
  branch?: string;
  debug?: boolean;
  message?: string;
  format?: "console" | "json" | "markdown";
  color?: boolean;
  detailed?: boolean;
  unstaged?: boolean;
  staged?: boolean;
  all?: boolean;
  ai?: boolean;
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
  ${chalk.green("•")} Customizable Git hooks
  ${chalk.green("•")} Local and global configuration

${chalk.blue("Commands:")}
  ${chalk.cyan("hook")} [options] [action]        ${chalk.gray("Manage git hooks")}
  ${chalk.cyan("analyze")} [options]              ${chalk.gray("Analyze git changes and get suggestions")}
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

  // Hook command
  program
    .command("hook")
    .description("Manage git hooks")
    .argument("[action]", "Action to perform: install, uninstall, or status")
    .option("-g, --global", "Apply globally")
    .addHelpText(
      "after",
      `
${chalk.blue("Examples:")}
  ${chalk.yellow("$")} gitguard hook                  # Show hook status
  ${chalk.yellow("$")} gitguard hook status          # Show hook status
  ${chalk.yellow("$")} gitguard hook install         # Install hook in current repository
  ${chalk.yellow("$")} gitguard hook install -g      # Install hook globally
  ${chalk.yellow("$")} gitguard hook uninstall       # Remove hook from current repository`,
    )
    .action(async (action: string | undefined, options: HookOptions) => {
      // Default to status if no action provided
      const hookAction = action || "status";

      if (!["install", "uninstall", "status"].includes(hookAction)) {
        logger.error(`Invalid action: ${hookAction}`);
        logger.info("\nValid actions are: install, uninstall, status");
        process.exit(1);
      }

      try {
        await hook({
          action: hookAction as "install" | "uninstall" | "status",
          global: !!options.global,
          debug: !!program.opts().debug,
          skipHook: !!process.env.SKIP_GITGUARD,
        });
      } catch (error) {
        logger.error("Hook command failed:", error);
        process.exit(1);
      }
    });

  // Analyze command
  program
    .command("analyze")
    .description("Analyze git changes and get suggestions")
    .option("-p, --pr <number>", "PR number to analyze")
    .option("-b, --branch <name>", "Branch to analyze")
    .option("-m, --message <text>", "Commit message to analyze")
    .option(
      "-f, --format <type>",
      "Output format: console, json, markdown",
      "console",
    )
    .option("--no-color", "Disable colored output")
    .option("--detailed", "Show detailed analysis")
    .option("--unstaged", "Include analysis of unstaged changes")
    .option("--staged", "Include analysis of staged changes (default: true)")
    .option("--all", "Analyze both staged and unstaged changes")
    .option("--ai", "Enable AI-powered suggestions")
    .addHelpText(
      "after",
      `
${chalk.blue("Examples:")}
  ${chalk.yellow("$")} gitguard analyze                  # Analyze staged changes only
  ${chalk.yellow("$")} gitguard analyze --unstaged       # Include unstaged changes
  ${chalk.yellow("$")} gitguard analyze --all            # Analyze both staged and unstaged changes
  ${chalk.yellow("$")} gitguard analyze --no-staged      # Analyze only unstaged changes (with --unstaged)

${chalk.blue("Analysis includes:")}
  ${chalk.green("•")} Package cohesion checks
  ${chalk.green("•")} Commit message suggestions
  ${chalk.green("•")} Security checks
  ${chalk.green("•")} Split recommendations
  ${chalk.green("•")} Next steps guidance`,
    )
    .action(async (options: AnalyzeOptions) => {
      try {
        const debug = isDebugEnabled() || options.debug;

        if (debug) {
          logger.debug("Debug mode enabled");
          logger.debug("CLI Options:", options);
          logger.debug("Environment:", {
            NODE_ENV: process.env.NODE_ENV,
            GITGUARD_DEBUG: process.env.GITGUARD_DEBUG,
          });
        }

        await analyze({
          pr: options.pr?.toString(),
          branch: options.branch,
          debug,
          configPath: program.opts().config as string | undefined,
          message: options.message,
          format: options.format,
          color: options.color,
          detailed: options.detailed,
          staged: options.staged,
          unstaged: options.unstaged,
          all: options.all,
          ai: options.ai,
        });

        process.exit(0);
      } catch (error) {
        logger.error("Analyze command failed:", error);
        process.exit(1);
      }
    });

  // Status command
  program
    .command("status")
    .description("Show GitGuard status (hooks and configuration)")
    .option("-c, --config-only", "Show only configuration status")
    .option("-h, --hooks-only", "Show only hooks status")
    .addHelpText(
      "after",
      `
Examples:
  $ gitguard status           # Show all status information
  $ gitguard status -c        # Show only configuration status
  $ gitguard status -h        # Show only hooks status`,
    )
    .action(async (options: { configOnly?: boolean; hooksOnly?: boolean }) => {
      try {
        await status({
          debug: isDebug || !!program.opts().debug, // Check both sources
          configOnly: options.configOnly,
          hooksOnly: options.hooksOnly,
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
