#!/usr/bin/env node

// cli.ts
import { program } from "commander";
import { loadConfig } from "./config";
import { AnalysisService } from "./services/analysis.service";
import { LoggerService } from "./services/logger.service";
import { ReporterService } from "./services/reporter.service";
import { LogLevel } from "./types/logger.types";

interface CommandOptions {
  verbose: boolean;
  silent: boolean;
  format: "console" | "json" | "markdown";
  color: boolean;
  detailed: boolean;
}

async function analyze(
  branch: string | undefined,
  options: CommandOptions,
): Promise<void> {
  const logger = new LoggerService({
    level: options.verbose ? LogLevel.DEBUG : LogLevel.INFO,
    silent: options.silent,
  });

  try {
    logger.debug("Loading configuration...");
    const config = await loadConfig();

    logger.debug("Initializing services...");
    const analysisService = new AnalysisService({
      logger,
      config,
    });

    const reporterService = new ReporterService({
      logger,
    });

    logger.info("Starting analysis...");
    const result = await analysisService.analyze({
      branch,
    });

    const report = await reporterService.generateReport({
      result,
      options: {
        format: options.format,
        color: options.color,
        detailed: options.detailed,
      },
    });

    if (options.format === "json" || options.format === "markdown") {
      logger.raw(report);
    }

    if (result.warnings.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    logger.error("Analysis failed:", error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  try {
    program.name("gitguard").description("PR Analysis Tool").version("0.1.0");

    program
      .command("analyze")
      .description("Analyze current branch or specific branch")
      .argument("[branch]", "branch to analyze (defaults to current branch)")
      .option("-v, --verbose", "enable verbose output")
      .option("-s, --silent", "disable all output")
      .option(
        "-f, --format <format>",
        "output format (console, json, markdown)",
        "console",
      )
      .option("--no-color", "disable colored output")
      .option("-d, --detailed", "include detailed commit information")
      .action(analyze);

    await program.parseAsync();
  } catch (error) {
    console.error("Command failed:", error);
    process.exit(1);
  }
}

// Handle top-level async
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
