#!/usr/bin/env node
import { Command } from "commander";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";
import { analyze } from "../commands/analyze.js";
import { hook } from "../commands/hook.js";
import { LoggerService } from "../services/logger.service.js";

interface HookOptions {
  global?: boolean;
  debug?: boolean;
}

interface AnalyzeOptions {
  pr?: string | number;
  branch?: string;
  debug?: boolean;
}

interface PackageJson {
  version: string;
}

async function main(): Promise<void> {
  const logger = new LoggerService({ debug: false });
  const program = new Command();

  // Add error handling for unknown commands and options
  program.showHelpAfterError();
  program.showSuggestionAfterError();

  // Create the program
  program
    .name("gitguard")
    .description("A smart Git commit message and PR analysis tool")
    .option("-d, --debug", "Enable debug mode")
    .option("-c, --config <path>", "Path to config file");

  // Hook command
  program
    .command("hook")
    .description("Manage git hooks")
    .argument("[action]", "Action to perform: install, uninstall, or status")
    .option("-g, --global", "Apply globally")
    .addHelpText(
      "after",
      `
Examples:
  $ gitguard hook                  # Show hook status
  $ gitguard hook status          # Show hook status
  $ gitguard hook install         # Install hook in current repository
  $ gitguard hook install -g      # Install hook globally
  $ gitguard hook uninstall       # Remove hook from current repository`,
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
    .option("-b, --branch <name>", "Branch to analyze (defaults to current)")
    .option("-m, --message <text>", "Commit message to analyze")
    .option(
      "-f, --format <type>",
      "Output format: console, json, markdown",
      "console",
    )
    .option("--no-color", "Disable colored output")
    .option("--detailed", "Show detailed analysis")
    .addHelpText(
      "after",
      `
Usage Examples:
  $ gitguard analyze                    # Analyze current staged changes
  $ gitguard analyze -m "feat: update"  # Analyze with specific commit message
  $ gitguard analyze -p 123             # Analyze PR #123
  $ gitguard analyze -b main            # Analyze branch 'main'
  $ gitguard analyze --format markdown  # Output in markdown format
  $ gitguard analyze --detailed         # Show detailed analysis
  $ gitguard analyze --no-color         # Disable colored output

Options:
  -p, --pr <number>      PR number to analyze
  -b, --branch <name>    Branch to analyze (defaults to current)
  -m, --message <text>   Commit message to analyze
  -f, --format <type>    Output format: console, json, markdown (default: "console")
  --no-color            Disable colored output
  --detailed           Show detailed analysis
  -c, --config <path>   Path to custom config file

Analysis includes:
  • Commit message formatting
  • Security checks
  • AI-powered suggestions
  • Split recommendations
  • Code quality warnings`,
    )
    .action(async (options: AnalyzeOptions) => {
      try {
        await analyze({
          pr: options.pr?.toString(),
          branch: options.branch,
          debug: !!program.opts().debug,
          configPath: program.opts().config as string | undefined,
        });
      } catch (error) {
        logger.error("Analyze command failed:", error);
        process.exit(1);
      }
    });

  // Add a default action when no command is provided
  program.action(() => {
    program.help();
  });

  // Set version - Updated to handle both ESM and CJS environments
  try {
    let packagePath: string;

    if (typeof __dirname !== "undefined") {
      // CJS environment
      packagePath = resolve(__dirname, "../../package.json");
    } else {
      // ESM environment
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      packagePath = resolve(__dirname, "../../package.json");
    }

    const packageJson = JSON.parse(
      await readFile(packagePath, "utf8"),
    ) as PackageJson;

    program.version(packageJson.version);
  } catch (error) {
    logger.error("Failed to load version:", error);
    program.version("0.0.0-dev");
  }

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
