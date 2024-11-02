#!/usr/bin/env node
import { Command } from "commander";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
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
    .argument("<action>", "Action to perform: install or uninstall")
    .option("-g, --global", "Apply globally")
    .addHelpText(
      "after",
      `
Examples:
  $ gitguard hook install          # Install hook in current repository
  $ gitguard hook install -g       # Install hook globally
  $ gitguard hook uninstall        # Remove hook from current repository`,
    )
    .action(async (action: string, options: HookOptions) => {
      if (!["install", "uninstall"].includes(action)) {
        logger.error(`Invalid action: ${action}`);
        logger.info("\nValid actions are: install, uninstall");
        process.exit(1);
      }
      try {
        await hook({
          action: action as "install" | "uninstall",
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
    .description("Analyze current changes or PR")
    .option("-p, --pr <number>", "PR number to analyze")
    .option("-b, --branch <name>", "Branch to analyze")
    .addHelpText(
      "after",
      `
Examples:
  $ gitguard analyze               # Analyze current changes
  $ gitguard analyze -p 123        # Analyze PR #123
  $ gitguard analyze -b main       # Analyze branch 'main'`,
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

  // Set version
  try {
    const packagePath = new URL("../../package.json", import.meta.url);
    const packageJson = JSON.parse(
      await readFile(fileURLToPath(packagePath), "utf8"),
    ) as PackageJson;
    program.version(packageJson.version);
  } catch (error) {
    logger.error("Failed to load version:", error);
    program.version("0.0.0-dev");
  }

  // Parse arguments
  await program.parseAsync(process.argv);
}

// Direct execution check
if (require.main === module || process.argv[1].endsWith("gitguard.cjs")) {
  const logger = new LoggerService({ debug: false });
  main().catch((error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}

export { main };
