#!/usr/bin/env node
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-console */
import { Command } from "commander";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { analyze } from "../commands/analyze.js";
import { hook } from "../commands/hook.js";

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

async function main() {
  console.log("GitGuard CLI Starting...");

  const program = new Command();

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
    .action(async (action: string, options: HookOptions) => {
      console.log("Hook command called with:", { action, options });
      try {
        await hook({
          action: action as "install" | "uninstall",
          global: !!options.global,
          debug: !!program.opts().debug,
        });
      } catch (error) {
        console.error("Hook command failed:", error);
        process.exit(1);
      }
    });

  // Analyze command
  program
    .command("analyze")
    .description("Analyze current changes or PR")
    .option("-p, --pr <number>", "PR number to analyze")
    .option("-b, --branch <name>", "Branch to analyze")
    .action(async (options: AnalyzeOptions) => {
      try {
        await analyze({
          pr: options.pr?.toString(),
          branch: options.branch,
          debug: !!program.opts().debug,
          configPath: program.opts().config as string | undefined,
        });
      } catch (error) {
        console.error("Analyze command failed:", error);
        process.exit(1);
      }
    });

  // Set version
  try {
    const packagePath = new URL("../../package.json", import.meta.url);
    const packageJson = JSON.parse(
      await readFile(fileURLToPath(packagePath), "utf8"),
    ) as PackageJson;
    program.version(packageJson.version);
  } catch (error) {
    console.error("Failed to load version:", error);
    program.version("0.0.0-dev");
  }

  // Parse arguments
  await program.parseAsync(process.argv);
}

// Direct execution check
if (require.main === module || process.argv[1].endsWith("gitguard.cjs")) {
  console.log("Direct execution detected");
  console.log("Process argv:", process.argv);
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { main };
