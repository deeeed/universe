// packages/gitguard/src/services/reporter.service.ts
import {
  AnalysisWarning,
  CommitAnalysisResult,
  PRAnalysisResult,
} from "../types/analysis.types.js";
import { CommitInfo, FileChange } from "../types/git.types.js";
import { ServiceOptions } from "../types/service.types.js";
import { BaseService } from "./base.service.js";

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
        return this.generateConsoleReport({ result, options });
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
    options: ReportOptions;
  }): string {
    const { result, options } = params;

    this.logger.info("\n📊 Analysis Report");
    this.logger.info(`Branch: ${result.branch}`);
    this.logger.info(`Base branch: ${result.baseBranch}`);
    this.logger.newLine();

    this.logger.info("Changes Summary:");
    if (this.isPRResult(result)) {
      this.logger.table([
        {
          "Total Commits": result.stats.totalCommits,
          "Files Changed": result.stats.filesChanged,
          "Lines Added": `+${result.stats.additions}`,
          "Lines Removed": `-${result.stats.deletions}`,
        },
      ]);

      // Show file changes by directory for PR
      if (result.commits.length > 0 && options.detailed) {
        this.logger.newLine();
        this.logger.info("Changed Files:");
        result.commits.forEach((commit) => {
          commit.files.forEach((file: FileChange) => {
            this.logger.info(
              `  • ${file.path} (+${file.additions} -${file.deletions})`,
            );
          });
        });
      }
    } else {
      // Enhanced commit analysis display
      this.logger.table([
        {
          "Files Changed": result.stats.filesChanged,
          "Lines Added": `+${result.stats.additions}`,
          "Lines Removed": `-${result.stats.deletions}`,
        },
      ]);

      if (result.formattedMessage) {
        this.logger.newLine();
        this.logger.info("Commit Message:");
        this.logger.info(`Original: ${result.originalMessage}`);
        this.logger.info(`Formatted: ${result.formattedMessage}`);
      }

      // Show files from staged/unstaged changes
      const files = (result as CommitAnalysisResult & { files?: FileChange[] })
        .files;
      if (!files?.length) {
        return "";
      }

      // Group files by directory manually
      const filesByDir = files.reduce((acc, file) => {
        const dir = file.path.split("/").slice(0, -1).join("/") || ".";
        if (!acc.has(dir)) {
          acc.set(dir, []);
        }
        acc.get(dir)?.push(file);
        return acc;
      }, new Map<string, FileChange[]>());

      // Display files grouped by directory
      Array.from(filesByDir.entries()).forEach(([dir, dirFiles]) => {
        this.logger.info(`  ${dir}/`);
        dirFiles.forEach((file) => {
          const fileName = file.path.split("/").pop() ?? file.path;
          this.logger.info(
            `    • ${fileName} (+${file.additions} -${file.deletions})`,
            { color: options.color },
          );
        });
      });
    }

    if (result.warnings.length > 0) {
      this.logger.newLine();
      this.logger.warning(`⚠️  Found ${result.warnings.length} warnings:`);
      result.warnings.forEach((warning: AnalysisWarning) => {
        this.logger.warning(`  • [${warning.type}] ${warning.message}`);
      });
    } else {
      this.logger.newLine();
      this.logger.info("✅ No issues detected");
    }

    return "";
  }

  private isPRResult(result: AnalysisResult): result is PRAnalysisResult {
    return "commits" in result;
  }
}
