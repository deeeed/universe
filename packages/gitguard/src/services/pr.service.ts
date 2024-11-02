// services/pr.service.ts
import * as fs from "fs/promises";
import { AIProvider } from "../types/ai.types";
import {
  AnalysisWarning,
  PRAnalysisOptions,
  PRAnalysisResult,
  PRDescription,
  PRSplitSuggestion,
  PRStats,
} from "../types/analysis.types";
import { Config } from "../types/config.types";
import { CommitInfo, FileChange } from "../types/git.types";
import { SecurityFinding } from "../types/security.types";
import { ServiceOptions } from "../types/service.types";
import { BaseService } from "./base.service";
import { GitService } from "./git.service";
import { PromptService } from "./prompt.service";
import { SecurityService } from "./security.service";

export class PRService extends BaseService {
  private readonly git: GitService;
  private readonly security: SecurityService;
  private readonly ai?: AIProvider;
  private readonly prompt: PromptService;
  private readonly config: Config;

  constructor(
    params: ServiceOptions & {
      config: Config;
      git: GitService;
      security: SecurityService;
      prompt: PromptService;
      ai?: AIProvider;
    },
  ) {
    super(params);
    this.git = params.git;
    this.security = params.security;
    this.ai = params.ai;
    this.prompt = params.prompt;
    this.config = params.config;
  }

  private createEmptyResult(
    branch: string,
    baseBranch: string,
  ): PRAnalysisResult {
    return {
      branch,
      baseBranch,
      commits: [],
      stats: {
        totalCommits: 0,
        filesChanged: 0,
        additions: 0,
        deletions: 0,
        authors: [],
        timeSpan: {
          firstCommit: new Date(),
          lastCommit: new Date(),
        },
      },
      warnings: [],
      filesByDirectory: {},
    };
  }

  private mapSecurityToWarnings(
    findings: SecurityFinding[],
  ): AnalysisWarning[] {
    return findings.map((finding) => ({
      type: "file",
      severity: finding.severity === "high" ? "error" : "warning",
      message: `Security issue in ${finding.path}: ${finding.type}`,
    }));
  }

  public groupByDirectory(commits: CommitInfo[]): Record<string, string[]> {
    const filesByDir: Record<string, Set<string>> = {};

    commits.forEach((commit) => {
      commit.files.forEach((file) => {
        const dir = file.path.split("/")[0];
        if (!filesByDir[dir]) {
          filesByDir[dir] = new Set();
        }
        filesByDir[dir].add(file.path);
      });
    });

    return Object.fromEntries(
      Object.entries(filesByDir).map(([dir, files]) => [
        dir,
        Array.from(files),
      ]),
    );
  }

  private generateSplitCommands(params: {
    suggestedPRs: PRSplitSuggestion["suggestedPRs"];
    baseBranch: string;
  }): string[] {
    const commands: string[] = [`# Stash current changes`, `git stash push -u`];

    params.suggestedPRs.forEach((pr, index) => {
      const branchName = `split/${index + 1}/${pr.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      commands.push(
        ``,
        `# Create and switch to new branch for ${pr.title}`,
        `git checkout -b ${branchName} ${params.baseBranch}`,
        `# Cherry-pick relevant commits`,
        ...pr.files.map((f) => `git checkout HEAD ${f.path}`),
        `git add .`,
        `git commit -m "${pr.title}"`,
      );
    });

    commands.push(
      ``,
      `# Return to original branch`,
      `git checkout -`,
      `git stash pop`,
    );

    return commands;
  }

  private generatePRTitle(commits: CommitInfo[], files: FileChange[]): string {
    // If single commit, use its message
    if (commits.length === 1) {
      return commits[0].message;
    }

    // Otherwise, detect type based on files
    const type = this.detectPRType(files);
    return `${type}: Combined changes for ${commits.length} commits`;
  }

  private detectPRType(files: FileChange[]): string {
    const hasFeature = files.some(
      (f) =>
        f.path.includes("/src/") ||
        f.path.includes("/components/") ||
        f.path.includes("/features/"),
    );
    const hasTests = files.some(
      (f) => f.path.includes("/test/") || f.path.includes(".test."),
    );
    const hasDocs = files.some(
      (f) => f.path.includes("/docs/") || f.path.endsWith(".md"),
    );
    const hasConfig = files.some(
      (f) =>
        f.path.includes(".config.") ||
        f.path.includes(".gitignore") ||
        f.path.includes(".env"),
    );

    if (hasFeature) return "feat";
    if (hasTests) return "test";
    if (hasDocs) return "docs";
    if (hasConfig) return "chore";
    return "feat"; // Default to feat
  }

  private shouldSplitPR(params: {
    stats: PRStats;
    warnings: AnalysisWarning[];
  }): boolean {
    // Split if:
    // 1. Too many files changed
    if (params.stats.filesChanged > this.config.analysis.maxFileSize)
      return true;

    // 2. Changes span multiple packages
    const hasMultiPackageWarning = params.warnings.some((w) =>
      w.message.includes("multiple packages"),
    );
    if (hasMultiPackageWarning) return true;

    // 3. Too many commits
    if (params.stats.totalCommits > 10) return true;

    // 4. Changes span a long time period
    const timeSpanDays =
      (params.stats.timeSpan.lastCommit.getTime() -
        params.stats.timeSpan.firstCommit.getTime()) /
      (1000 * 60 * 60 * 24);
    if (timeSpanDays > 7) return true;

    return false;
  }

  private async loadPRTemplate(): Promise<string | undefined> {
    const templatePath =
      this.config.pr?.template?.path || ".github/pull_request_template.md";
    try {
      return await fs.readFile(templatePath, "utf-8");
    } catch {
      return undefined;
    }
  }

  private async generateAIDescription(params: {
    commits: CommitInfo[];
    stats: PRStats;
    files: FileChange[];
    baseBranch: string;
  }): Promise<PRDescription | undefined> {
    if (!this.ai) return undefined;

    const template = await this.loadPRTemplate();

    const prompt = this.prompt.generatePRDescriptionPrompt({
      commits: params.commits,
      stats: params.stats,
      files: params.files,
      template,
      baseBranch: params.baseBranch,
    });

    try {
      return await this.ai.generateCompletion<PRDescription>({
        prompt,
        options: {
          requireJson: true,
          temperature: 0.7,
          systemPrompt:
            "You are an expert code reviewer helping to write clear PR descriptions.",
        },
      });
    } catch (error) {
      this.logger.error("Failed to generate PR description:", error);
      return undefined;
    }
  }

  private async generateSplitSuggestion(params: {
    commits: CommitInfo[];
    files: FileChange[];
    baseBranch: string;
  }): Promise<PRSplitSuggestion | undefined> {
    if (!this.ai) return undefined;

    const prompt = this.prompt.generatePRSplitPrompt({
      commits: params.commits,
      files: params.files,
      baseBranch: params.baseBranch,
    });

    try {
      return await this.ai.generateCompletion<PRSplitSuggestion>({
        prompt,
        options: {
          requireJson: true,
          temperature: 0.7,
        },
      });
    } catch (error) {
      this.logger.error("Failed to generate split suggestion:", error);
      return undefined;
    }
  }

  public checkSize(params: { stats: PRStats }): AnalysisWarning[] {
    const warnings: AnalysisWarning[] = [];

    // Check total files changed
    if (params.stats.filesChanged > this.config.analysis.maxFileSize) {
      warnings.push({
        type: "size",
        severity: "warning",
        message: `PR changes too many files (${params.stats.filesChanged} > ${this.config.analysis.maxFileSize})`,
      });
    }

    // Check total changes (additions + deletions)
    const totalChanges = params.stats.additions + params.stats.deletions;
    if (totalChanges > this.config.analysis.maxFileSize * 100) {
      warnings.push({
        type: "size",
        severity: "warning",
        message: `PR has too many changes (${totalChanges} lines)`,
      });
    }

    // Check number of commits
    if (params.stats.totalCommits > 10) {
      warnings.push({
        type: "size",
        severity: "warning",
        message: `PR has too many commits (${params.stats.totalCommits} > 10)`,
      });
    }

    return warnings;
  }

  async analyze(params: PRAnalysisOptions): Promise<PRAnalysisResult> {
    try {
      const branch = params.branch || (await this.git.getCurrentBranch());
      const baseBranch = this.git.config.baseBranch;

      // Get all commits and changes
      const commits = await this.git.getCommits({
        from: baseBranch,
        to: branch,
      });

      // Exit early if no commits
      if (commits.length === 0) {
        return this.createEmptyResult(branch, baseBranch);
      }

      // Calculate stats
      const stats = this.calculateStats({ commits });

      // Collect warnings
      const warnings: AnalysisWarning[] = [];

      // Add size warnings using the dedicated method
      warnings.push(...this.checkSize({ stats }));

      // Group files by directory for better analysis
      const filesByDirectory = this.groupByDirectory(commits);

      // Add directory-based warnings
      if (Object.keys(filesByDirectory).length > 3) {
        warnings.push({
          type: "structure",
          severity: "warning",
          message: `PR spans too many directories (${Object.keys(filesByDirectory).length} > 3)`,
        });
      }

      // Security checks
      const diff = await this.git.getDiff({
        from: baseBranch,
        to: branch,
        type: "range",
      });

      const securityAnalysis =
        params.securityResult ??
        this.security.analyzeSecurity({
          files: commits.flatMap((c) => c.files),
          diff,
        });

      if (securityAnalysis.secretFindings.length > 0) {
        warnings.push(
          ...this.mapSecurityToWarnings(securityAnalysis.secretFindings),
        );
      }

      let description: PRDescription | undefined;
      let splitSuggestion: PRSplitSuggestion | undefined;

      // Always check if PR should be split
      const shouldSplit = this.shouldSplitPR({ stats, warnings });

      // Generate AI-powered content if enabled
      if (params.enableAI && this.ai) {
        description = await this.generateAIDescription({
          commits,
          stats,
          files: commits.flatMap((c) => c.files),
          baseBranch,
        });
      }

      // Always provide split suggestion if needed
      if (shouldSplit) {
        splitSuggestion =
          params.enableAI && this.ai
            ? await this.generateSplitSuggestion({
                commits,
                files: commits.flatMap((c) => c.files),
                baseBranch,
              })
            : this.createBasicSplitSuggestion({
                commits,
                baseBranch,
              });
      }

      return {
        branch,
        baseBranch,
        commits,
        stats,
        warnings,
        description,
        splitSuggestion,
        filesByDirectory,
      };
    } catch (error) {
      this.logger.error("PR validation failed:", error);
      throw error;
    }
  }

  private calculateStats(params: { commits: CommitInfo[] }): PRStats {
    const files = new Set<string>();
    let additions = 0;
    let deletions = 0;
    const authors = new Set<string>();
    let firstCommit = params.commits[0].date;
    let lastCommit = params.commits[0].date;

    params.commits.forEach((commit) => {
      authors.add(commit.author);
      firstCommit = new Date(
        Math.min(firstCommit.getTime(), commit.date.getTime()),
      );
      lastCommit = new Date(
        Math.max(lastCommit.getTime(), commit.date.getTime()),
      );

      commit.files.forEach((file) => {
        files.add(file.path);
        additions += file.additions;
        deletions += file.deletions;
      });
    });

    return {
      totalCommits: params.commits.length,
      filesChanged: files.size,
      additions,
      deletions,
      authors: Array.from(authors),
      timeSpan: {
        firstCommit,
        lastCommit,
      },
    };
  }

  private createBasicSplitSuggestion(params: {
    commits: CommitInfo[];
    baseBranch: string;
  }): PRSplitSuggestion {
    const files = params.commits.flatMap((c) => c.files);

    // Group files by scope
    const filesByScope = files.reduce(
      (acc, file) => {
        const scope = file.path.startsWith("packages/")
          ? file.path.split("/")[1]
          : "root";

        if (!acc[scope]) {
          acc[scope] = {
            files: [],
            commits: new Set<string>(),
          };
        }
        acc[scope].files.push(file);
        // Track which commits modified this scope
        params.commits
          .filter((c) => c.files.some((f) => f.path === file.path))
          .forEach((c) => acc[scope].commits.add(c.hash));
        return acc;
      },
      {} as Record<string, { files: FileChange[]; commits: Set<string> }>,
    );

    // Create split suggestions
    const suggestedPRs = Object.entries(filesByScope).map(
      ([scope, data], index) => ({
        title: `${scope}: ${this.generatePRTitle(
          params.commits.filter((c) => data.commits.has(c.hash)),
          data.files,
        )}`,
        description: `Changes related to ${scope} package`,
        files: data.files,
        order: index + 1,
        baseBranch: params.baseBranch,
        dependencies: [], // Will be filled based on commit history
      }),
    );

    // Generate git commands for splitting
    const commands = this.generateSplitCommands({
      suggestedPRs,
      baseBranch: params.baseBranch,
    });

    return {
      reason:
        "Changes span multiple packages and should be split into separate PRs",
      suggestedPRs,
      commands,
    };
  }
}
