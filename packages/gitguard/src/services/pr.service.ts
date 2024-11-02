// services/pr.service.ts
import { AIProvider } from "../types/ai.types";
import {
  AnalysisWarning,
  PRAnalysisOptions,
  PRAnalysisResult,
  PRSplitSuggestion,
  PRStats,
} from "../types/analysis.types";
import { Config } from "../types/config.types";
import { CommitInfo } from "../types/git.types";
import { SecurityFinding } from "../types/security.types";
import { ServiceOptions } from "../types/service.types";
import { BaseService } from "./base.service";
import { GitService } from "./git.service";
import { SecurityService } from "./security.service";

export class PRService extends BaseService {
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

  private groupByDirectory(commits: CommitInfo[]): Record<string, string[]> {
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
    dirs: string[];
    baseBranch: string;
  }): string[] {
    return [
      `git checkout -b feature/${params.dirs[0]} ${params.baseBranch}`,
      ...params.dirs
        .slice(1)
        .map((dir) => `git checkout -b feature/${dir} ${params.baseBranch}`),
    ];
  }

  private createBasicSplitSuggestion(params: {
    commits: CommitInfo[];
    baseBranch: string;
  }): PRSplitSuggestion {
    const filesByDir = this.groupByDirectory(params.commits);

    return {
      reason: "PR is too large and spans multiple areas",
      suggestedPRs: Object.entries(filesByDir).map(([dir, files], index) => ({
        title: `[${dir}] Split PR changes`,
        description: `Changes related to ${dir} directory`,
        files: files.map((path) => ({
          path,
          additions: 0,
          deletions: 0,
          isTest: path.includes("test") || path.includes("spec"),
          isConfig: path.includes("config") || path.endsWith(".json"),
        })),
        order: index + 1,
        baseBranch: params.baseBranch,
        dependencies: [],
      })),
      commands: this.generateSplitCommands({
        dirs: Object.keys(filesByDir),
        baseBranch: params.baseBranch,
      }),
    };
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

      // Size checks
      const sizeWarnings = this.checkSize({ stats });
      warnings.push(...sizeWarnings);

      // Check commit messages
      if (this.config.analysis.checkConventionalCommits) {
        const conventionalWarnings = this.checkCommitMessages({ commits });
        warnings.push(...conventionalWarnings);
      }

      // Security checks
      const diff = await this.git.getDiff({
        from: baseBranch,
        to: branch,
      });

      const securityAnalysis = this.security.analyzeSecurity({
        files: commits.flatMap((c) => c.files),
        diff,
      });

      if (securityAnalysis.secretFindings.length > 0) {
        warnings.push(
          ...this.mapSecurityToWarnings(securityAnalysis.secretFindings),
        );
      }

      // Generate description and split suggestion if needed
      let description;
      let splitSuggestion;

      const shouldSplit = this.shouldSplitPR({ stats, warnings });

      this.logger.info(`Should split: ${shouldSplit}`);

      return {
        branch,
        baseBranch,
        commits,
        stats,
        warnings,
        description,
        splitSuggestion,
      };
    } catch (error) {
      this.logger.error("PR analysis failed:", error);
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

  private checkSize(params: { stats: PRStats }): AnalysisWarning[] {
    const warnings: AnalysisWarning[] = [];

    if (params.stats.totalCommits > 10) {
      warnings.push({
        type: "general",
        severity: "warning",
        message: `PR contains too many commits (${params.stats.totalCommits} > 10)`,
      });
    }

    if (params.stats.filesChanged > this.config.analysis.maxFileSize * 2) {
      warnings.push({
        type: "file",
        severity: "warning",
        message: `PR changes too many files (${params.stats.filesChanged} > ${this.config.analysis.maxFileSize * 2})`,
      });
    }

    return warnings;
  }

  private checkCommitMessages(params: {
    commits: CommitInfo[];
  }): AnalysisWarning[] {
    return params.commits
      .filter((commit) => !commit.parsed.type || !commit.parsed.description)
      .map((commit) => ({
        type: "commit" as const,
        severity: "warning" as const,
        message: `Invalid conventional commit format: ${commit.hash.slice(0, 7)}`,
      }));
  }

  private shouldSplitPR(params: {
    stats: PRStats;
    warnings: AnalysisWarning[];
  }): boolean {
    return (
      params.warnings.some((w) => w.severity === "error") ||
      params.stats.totalCommits > 10 ||
      params.stats.filesChanged > this.config.analysis.maxFileSize * 2
    );
  }
}
