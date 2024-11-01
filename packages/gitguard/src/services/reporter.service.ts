import { BaseService } from "./base.service";
import { ServiceOptions } from "../types/service.types";
import { AnalysisResult } from "../types/analysis.types";

export interface ReportOptions {
  format: "console" | "json" | "markdown";
  color?: boolean;
  detailed?: boolean;
}

export class ReporterService extends BaseService {
  constructor(params: ServiceOptions) {
    super(params);
    this.logger.debug("ReporterService initialized");
  }

  public async generateReport(params: {
    result: AnalysisResult;
    options: ReportOptions;
  }): Promise<string> {
    const { result, options } = params;

    await Promise.resolve(); // Dummy await to satisfy TypeScript
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
    let report = `# PR Analysis Report\n\n`;

    report += `## Summary\n\n`;
    report += `- Branch: \`${result.branch}\`\n`;
    report += `- Base: \`${result.baseBranch}\`\n`;
    report += `- Total Commits: ${result.stats.totalCommits}\n`;
    report += `- Files Changed: ${result.stats.filesChanged}\n`;
    report += `- Changes: +${result.stats.additions} -${result.stats.deletions}\n\n`;

    if (result.warnings.length > 0) {
      report += `## Warnings\n\n`;
      result.warnings.forEach((warning) => {
        report += `- **${warning.type}**: ${warning.message}\n`;
      });
      report += "\n";
    }

    if (detailed) {
      report += `## Commits\n\n`;
      result.commits.forEach((commit) => {
        report += `### ${commit.hash.slice(0, 7)}\n\n`;
        report += `- Author: ${commit.author}\n`;
        report += `- Date: ${commit.date.toISOString()}\n`;
        report += `- Message: ${commit.message}\n\n`;

        if (commit.files.length > 0) {
          report += `Changed files:\n`;
          commit.files.forEach((file) => {
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
    const report = "";

    // Using logger for console output to handle colors automatically
    this.logger.info(`Analysis Results for ${result.branch}`);
    this.logger.info(`Base branch: ${result.baseBranch}`);
    this.logger.newLine();

    this.logger.info("Statistics:");
    this.logger.table([
      {
        "Total Commits": result.stats.totalCommits,
        "Files Changed": result.stats.filesChanged,
        Additions: result.stats.additions,
        Deletions: result.stats.deletions,
      },
    ]);

    if (result.warnings.length > 0) {
      this.logger.newLine();
      this.logger.warning(`Found ${result.warnings.length} warnings:`);
      result.warnings.forEach((warning) => {
        this.logger.warning(`[${warning.type}] ${warning.message}`);
      });
    }

    return report;
  }
}
