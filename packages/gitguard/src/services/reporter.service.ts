// packages/gitguard/src/services/reporter.service.ts
import {
  AnalysisWarning,
  CommitAnalysisResult,
  PRAnalysisResult,
} from "../types/analysis.types.js";
import { FileChange } from "../types/git.types.js";
import { ServiceOptions } from "../types/service.types.js";
import { BaseService } from "./base.service.js";
import chalk from "chalk";

export interface ReportOptions {
  format?: "console";
  detailed?: boolean;
}

type AnalysisResult = CommitAnalysisResult | PRAnalysisResult;

export class ReporterService extends BaseService {
  constructor(params: ServiceOptions) {
    super(params);
    this.logger.debug("ReporterService initialized");
  }

  public generateReport(params: {
    result: AnalysisResult;
    options: ReportOptions;
  }): void {
    const { result, options } = params;
    this.generateConsoleReport({ result, options });
  }

  private generateConsoleReport(params: {
    result: AnalysisResult;
    options: ReportOptions;
  }): void {
    const { result, options } = params;

    this.logger.info("\n📊 " + chalk.bold("Analysis Report"));
    this.logger.info(`Branch: ${chalk.cyan(result.branch)}`);
    this.logger.info(`Base branch: ${chalk.cyan(result.baseBranch)}`);
    this.logger.newLine();

    if (this.isPRResult(result) && options.detailed) {
      this.logger.info("Commits:");
      result.commits.forEach((commit) => {
        this.logger.info(`\n  ${chalk.yellow(commit.hash.slice(0, 7))}`);
        this.logger.info(`  Author: ${chalk.cyan(commit.author)}`);
        this.logger.info(`  Date: ${commit.date.toISOString()}`);
        this.logger.info(`  Message: ${commit.message}`);

        if (commit.files.length > 0) {
          this.logger.info("  Changed files:");
          commit.files.forEach((file) => {
            this.logger.info(
              `    • ${chalk.cyan(file.path)} (+${chalk.green(file.additions)} -${chalk.red(file.deletions)})`,
            );
          });
        }
      });
      this.logger.newLine();
    }

    if ("complexity" in result) {
      this.logger.info("Complexity Analysis:");
      this.logger.table([
        {
          "Complexity Score": result.complexity.score,
          "Needs Structure": result.complexity.needsStructure ? "Yes" : "No",
        },
      ]);

      if (result.complexity.reasons.length > 0) {
        this.logger.info("\nComplexity Factors:");
        result.complexity.reasons.forEach((reason) => {
          this.logger.info(`  • ${chalk.yellow(reason)}`);
        });
        this.logger.newLine();
      }
    }

    this.logger.info("Changes Summary:");
    if (this.isPRResult(result)) {
      this.logger.table([
        {
          "Total Commits": result.stats.totalCommits,
          "Files Changed": result.stats.filesChanged,
          "Lines Added": result.stats.additions,
          "Lines Removed": result.stats.deletions,
        },
      ]);

      this.logger.info(
        `Lines: ${chalk.green(`+${result.stats.additions}`)} ${chalk.red(`-${result.stats.deletions}`)}`,
      );

      if (result.commits.length > 0 && options.detailed) {
        this.logger.newLine();
        this.logger.info("Changed Files:");
        result.commits.forEach((commit) => {
          commit.files.forEach((file: FileChange) => {
            this.logger.info(
              `  • ${chalk.cyan(file.path)} (+${chalk.green(file.additions)} -${chalk.red(file.deletions)})`,
            );
          });
        });
      }
    } else {
      this.logger.table([
        {
          "Files Changed": result.stats.filesChanged,
          "Lines Added": `+${chalk.green(result.stats.additions)}`,
          "Lines Removed": `-${chalk.red(result.stats.deletions)}`,
        },
      ]);

      if (result.formattedMessage) {
        this.logger.newLine();
        this.logger.info("Commit Message:");
        this.logger.info(`Original: ${result.originalMessage}`);
        this.logger.info(`Formatted: ${result.formattedMessage}`);
      }
    }

    if (result.warnings.length > 0) {
      this.logger.newLine();
      this.logger.warning(`⚠️  Found ${result.warnings.length} warnings:`);
      result.warnings.forEach((warning: AnalysisWarning) => {
        this.logger.warning(
          `  • ${chalk.yellow(`[${warning.type}] ${warning.message}`)}`,
        );
      });
    } else {
      this.logger.newLine();
      this.logger.info("✅ " + chalk.green("No issues detected"));
    }
  }

  private isPRResult(result: AnalysisResult): result is PRAnalysisResult {
    return "commits" in result;
  }
}
