// packages/gitguard/src/services/reporter.service.ts
import { BaseService } from "./base.service";
import { ServiceOptions } from "../types/service.types";
import {
  CommitAnalysisResult,
  PRAnalysisResult,
  AnalysisWarning,
} from "../types/analysis.types";
import { CommitInfo, FileChange } from "../types/commit.types";

export interface ReportOptions {
  format: "console" | "json" | "markdown";
  color?: boolean;
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
  }): string {
    const { result, options } = params;

    switch (options.format) {
      case "json":
        return this.generateJsonReport({ result });
      case "markdown":
        return this.generateMarkdownReport({
          result,
          detailed: options.detailed,
        });
      default:
        return this.generateConsoleReport({ result, color: options.color });
    }
  }

  private generateJsonReport(params: { result: AnalysisResult }): string {
    return JSON.stringify(params.result, null, 2);
  }

  private generateMarkdownReport(params: {
    result: AnalysisResult;
    detailed?: boolean;
  }): string {
    const { result, detailed } = params;
    let report = `# Analysis Report\n\n`;

    report += `## Summary\n\n`;
    report += `- Branch: \`${result.branch}\`\n`;
    report += `- Base: \`${result.baseBranch}\`\n`;

    if (this.isPRResult(result)) {
      report += `- Total Commits: ${result.stats.totalCommits}\n`;
      report += `- Files Changed: ${result.stats.filesChanged}\n`;
      report += `- Changes: +${result.stats.additions} -${result.stats.deletions}\n`;
      report += `- Authors: ${result.stats.authors.join(", ")}\n\n`;
    } else {
      report += `- Files Changed: ${result.stats.filesChanged}\n`;
      report += `- Changes: +${result.stats.additions} -${result.stats.deletions}\n\n`;
    }

    if (result.warnings.length > 0) {
      report += `## Warnings\n\n`;
      result.warnings.forEach((warning: AnalysisWarning) => {
        report += `- **${warning.type}**: ${warning.message}\n`;
      });
      report += "\n";
    }

    if (detailed && this.isPRResult(result)) {
      report += `## Commits\n\n`;
      result.commits.forEach((commit: CommitInfo) => {
        report += `### ${commit.hash.slice(0, 7)}\n\n`;
        report += `- Author: ${commit.author}\n`;
        report += `- Date: ${commit.date.toISOString()}\n`;
        report += `- Message: ${commit.message}\n\n`;

        if (commit.files.length > 0) {
          report += `Changed files:\n`;
          commit.files.forEach((file: FileChange) => {
            report += `- \`${file.path}\` (+${file.additions} -${file.deletions})\n`;
          });
          report += "\n";
        }
      });
    }

    return report;
  }

  private generateConsoleReport(params: {
    result: AnalysisResult;
    color?: boolean;
  }): string {
    const { result } = params;

    // Using logger for console output to handle colors automatically
    this.logger.info(`Analysis Results for ${result.branch}`);
    this.logger.info(`Base branch: ${result.baseBranch}`);
    this.logger.newLine();

    this.logger.info("Statistics:");
    if (this.isPRResult(result)) {
      this.logger.table([
        {
          "Total Commits": result.stats.totalCommits,
          "Files Changed": result.stats.filesChanged,
          Additions: result.stats.additions,
          Deletions: result.stats.deletions,
        },
      ]);
    } else {
      this.logger.table([
        {
          "Files Changed": result.stats.filesChanged,
          Additions: result.stats.additions,
          Deletions: result.stats.deletions,
        },
      ]);
    }

    if (result.warnings.length > 0) {
      this.logger.newLine();
      this.logger.warning(`Found ${result.warnings.length} warnings:`);
      result.warnings.forEach((warning: AnalysisWarning) => {
        this.logger.warning(`[${warning.type}] ${warning.message}`);
      });
    }

    return "";
  }

  private isPRResult(result: AnalysisResult): result is PRAnalysisResult {
    return "commits" in result;
  }
}
