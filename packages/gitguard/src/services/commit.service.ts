// services/commit.service.ts
import { AIProvider } from "../types/ai.types";
import { FileChange } from "../types/commit.types";
import { Config } from "../types/config.types";
import { ServiceOptions } from "../types/service.types";
import {
  CommitAnalysisResult,
  CommitAnalysisOptions,
  CommitStats,
  AnalysisWarning,
  CommitSplitSuggestion,
} from "../types/analysis.types";
import { SecurityFinding } from "../types/security.types";
import { BaseService } from "./base.service";
import { GitService } from "./git.service";
import { SecurityService } from "./security.service";

export class CommitService extends BaseService {
  private readonly git: GitService;
  private readonly security: SecurityService;
  private readonly ai?: AIProvider;
  private readonly config: Config;

  constructor(
    params: ServiceOptions & {
      config: Config;
      git: GitService;
      security: SecurityService;
      ai?: AIProvider;
    },
  ) {
    super(params);
    this.git = params.git;
    this.security = params.security;
    this.ai = params.ai;
    this.config = params.config;
  }

  async analyze(params: CommitAnalysisOptions): Promise<CommitAnalysisResult> {
    try {
      // Get current branch info
      const branch = await this.git.getCurrentBranch();
      const baseBranch = this.git.config.baseBranch;

      // Get staged changes
      const files = await this.git.getStagedChanges();

      if (files.length === 0) {
        return this.createEmptyResult(branch, baseBranch);
      }

      // Get original message
      const originalMessage = await this.readMessageFile(params.messageFile);

      // Calculate stats
      const stats = this.calculateStats({ files });

      // Collect warnings
      const warnings: AnalysisWarning[] = [];

      // Security checks
      const securityIssues = await this.checkSecurity({ files });
      if (securityIssues.length > 0) {
        warnings.push(
          ...this.mapSecurityToWarnings({ findings: securityIssues }),
        );
      }

      // Size and scope checks
      const scopeWarnings = this.checkScope({ files });
      warnings.push(...scopeWarnings);

      // Determine if we need to split
      const shouldSplit = this.shouldSplitCommit({ warnings, stats });

      // Generate split suggestion or commit suggestions
      let splitSuggestion;
      let suggestions;

      if (shouldSplit && this.ai?.analyzeCommitChanges) {
        try {
          const diff = await this.git.getStagedDiff();
          const analysis = await this.ai.analyzeCommitChanges({
            files,
            diff,
            originalMessage,
            options: {
              strategy: params.splitStrategy || "module",
            },
          });

          splitSuggestion = analysis.suggestedSplits
            ? {
                reason: analysis.reason || "Changes span multiple areas",
                suggestions: analysis.suggestedSplits.map((split, index) => ({
                  message: split.reasoning,
                  files: files.filter((f) =>
                    split.files.some((sf) => sf === f.path),
                  ),
                  order: index + 1,
                  type: split.type || "chore",
                  scope: split.scope,
                })),
                commands: this.generateSplitCommands({
                  filesByDir: this.groupFilesByDirectory({
                    files: files.filter((f) =>
                      analysis.suggestedSplits?.[0].files.some(
                        (sf) => sf === f.path,
                      ),
                    ),
                  }),
                }),
              }
            : undefined;
        } catch (error) {
          this.logger.warning("Failed to generate split suggestion:", error);
          splitSuggestion = this.createBasicSplitSuggestion({
            files,
            originalMessage,
          });
        }
      } else if (this.ai && !shouldSplit) {
        try {
          const diff = await this.git.getStagedDiff();
          suggestions = await this.ai.generateCommitSuggestions({
            files,
            originalMessage,
            diff,
          });
        } catch (error) {
          this.logger.warning("Failed to generate commit suggestions:", error);
        }
      }

      return {
        branch,
        baseBranch,
        originalMessage,
        stats,
        warnings,
        splitSuggestion,
        suggestions,
      };
    } catch (error) {
      this.logger.error("Commit analysis failed:", error);
      throw error;
    }
  }

  private calculateStats(params: { files: FileChange[] }): CommitStats {
    return {
      filesChanged: params.files.length,
      additions: params.files.reduce((sum, file) => sum + file.additions, 0),
      deletions: params.files.reduce((sum, file) => sum + file.deletions, 0),
    };
  }

  private async checkSecurity(params: {
    files: FileChange[];
  }): Promise<SecurityFinding[]> {
    const diff = await this.git.getStagedDiff();
    const analysis = this.security.analyzeSecurity({
      files: params.files,
      diff,
    });
    return analysis.findings;
  }

  private checkScope(params: { files: FileChange[] }): AnalysisWarning[] {
    const warnings: AnalysisWarning[] = [];

    // Check total number of files
    if (params.files.length > this.config.analysis.maxFileSize) {
      warnings.push({
        type: "file",
        severity: "warning",
        message: `Too many files in commit (${params.files.length} > ${this.config.analysis.maxFileSize})`,
      });
    }

    // Check for mixed concerns
    const filesByDir = this.groupFilesByDirectory({ files: params.files });
    if (Object.keys(filesByDir).length > 2) {
      warnings.push({
        type: "general",
        severity: "warning",
        message: "Changes span multiple unrelated directories",
      });
    }

    return warnings;
  }

  private shouldSplitCommit(params: {
    warnings: AnalysisWarning[];
    stats: CommitStats;
  }): boolean {
    return (
      params.warnings.some(
        (w) =>
          w.severity === "error" ||
          (w.type === "file" && w.severity === "warning"),
      ) || params.stats.filesChanged > this.config.analysis.maxFileSize
    );
  }

  private createBasicSplitSuggestion(params: {
    files: FileChange[];
    originalMessage: string;
  }): CommitSplitSuggestion {
    const filesByDir = this.groupFilesByDirectory({ files: params.files });

    return {
      reason: "Changes span multiple directories",
      suggestions: Object.entries(filesByDir).map(([dir, files], index) => ({
        message: `${params.originalMessage} (${dir})`,
        files,
        order: index + 1,
        type: "chore" as const,
        scope: dir,
      })),
      commands: this.generateSplitCommands({ filesByDir }),
    };
  }

  private generateSplitCommands(params: {
    filesByDir: Record<string, FileChange[]>;
  }): string[] {
    return Object.entries(params.filesByDir).map(
      ([_, files]) =>
        `git reset HEAD ${files.map((f) => `"${f.path}"`).join(" ")}`,
    );
  }

  private async readMessageFile(path: string): Promise<string> {
    try {
      const { readFile } = await import("fs/promises");
      return (await readFile(path, "utf-8")).trim();
    } catch (error) {
      this.logger.error("Failed to read message file:", error);
      throw error;
    }
  }

  private groupFilesByDirectory(params: {
    files: FileChange[];
  }): Record<string, FileChange[]> {
    const groups: Record<string, FileChange[]> = {};

    for (const file of params.files) {
      const dir = file.path.split("/")[0];
      groups[dir] = groups[dir] || [];
      groups[dir].push(file);
    }

    return groups;
  }

  private mapSecurityToWarnings(params: {
    findings: SecurityFinding[];
  }): AnalysisWarning[] {
    return params.findings.map((finding) => ({
      type: "file",
      severity: "error",
      message: `Security issue in ${finding.path}: ${finding.type}`,
    }));
  }

  private createEmptyResult(
    branch: string,
    baseBranch: string,
  ): CommitAnalysisResult {
    return {
      branch,
      baseBranch,
      originalMessage: "",
      stats: {
        filesChanged: 0,
        additions: 0,
        deletions: 0,
      },
      warnings: [],
    };
  }
}
