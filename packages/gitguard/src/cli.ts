// cli.ts
import { program } from "commander";
import { loadConfig } from "./config";
import { AnalysisService } from "./services/analysis.service";
import { LoggerService } from "./services/logger.service";
import { LogLevel } from "./types/logger.types";

interface CommandOptions {
  verbose?: boolean;
  silent?: boolean;
  format?: "console" | "json" | "markdown";
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

    logger.debug("Initializing analysis service...");
    const analysisService = new AnalysisService({
      logger,
      config,
    });

    logger.info("Starting analysis...");
    const result = await analysisService.analyze({
      branch,
    });

    // Output results based on format
    switch (options.format) {
      case "json":
        logger.raw(JSON.stringify(result, null, 2));
        break;
      case "markdown":
        // TODO: Implement markdown formatting
        logger.error("Markdown format not yet implemented");
        break;
      default:
        logger.newLine();
        logger.info(`Analysis Results for ${result.branch}`);
        logger.info(`Base branch: ${result.baseBranch}`);
        logger.newLine();

        logger.info("Statistics:");
        logger.table([
          {
            "Total Commits": result.stats.totalCommits,
            "Files Changed": result.stats.filesChanged,
            Additions: result.stats.additions,
            Deletions: result.stats.deletions,
          },
        ]);

        if (result.warnings.length > 0) {
          logger.newLine();
          logger.warning(`Found ${result.warnings.length} warnings:`);
          result.warnings.forEach((warning) => {
            logger.warning(`[${warning.type}] ${warning.message}`);
          });
        }
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
