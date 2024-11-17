import { GitService } from "../../services/git.service.js";
import { GitHubService } from "../../services/github.service.js";
import { PRService } from "../../services/pr.service.js";
import { PRAnalysisResult } from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { FileChange } from "../../types/git.types.js";
import { Logger } from "../../types/logger.types.js";
import { FileUtil } from "../../utils/file.util.js";

interface BranchAnalysisControllerParams {
  logger: Logger;
  git: GitService;
  github: GitHubService;
  config: Config;
  prService: PRService;
}

interface BranchValidationResult {
  isValid: boolean;
  isUpToDate: boolean;
  existsLocally: boolean;
  existsRemotely: boolean;
  errors: string[];
  warnings: string[];
}

export class BranchAnalysisController {
  private readonly logger: Logger;
  private readonly git: GitService;

  constructor({ logger, git }: BranchAnalysisControllerParams) {
    this.logger = logger;
    this.git = git;
  }

  async analyzeBranch(params: {
    branchToAnalyze: string;
    enableAI?: boolean;
  }): Promise<PRAnalysisResult> {
    this.logger.info(`\n🔍 Analyzing branch: ${params.branchToAnalyze}`);

    // Prevent analysis on main branch
    if (params.branchToAnalyze === this.git.config.baseBranch) {
      throw new Error(
        `Cannot analyze the base branch (${this.git.config.baseBranch}). Please create and switch to a feature branch first.`,
      );
    }

    const validation = await this.validateBranchContext({
      branchToAnalyze: params.branchToAnalyze,
    });
    if (!validation.isValid) {
      throw new Error(
        `Branch validation failed: ${validation.errors.join(", ")}`,
      );
    }

    const baseBranch = this.git.config.baseBranch;

    // Get commits between branches first
    const commits = await this.git.getCommits({
      from: baseBranch,
      to: params.branchToAnalyze,
    });

    // Get diff between base branch and current branch
    const diffStats = await this.git.execGit({
      command: "diff",
      args: [`${baseBranch}...${params.branchToAnalyze}`, "--numstat"],
    });

    // Parse the diff stats into FileChange objects
    const files: FileChange[] = diffStats
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [additions = "0", deletions = "0", path = ""] = line.split(/\s+/);
        return {
          path,
          status: "modified",
          additions: parseInt(additions, 10),
          deletions: parseInt(deletions, 10),
          ...FileUtil.getFileType({ path }),
        };
      });

    // Get the complete diff content
    const diff = await this.git.execGit({
      command: "diff",
      args: [`${baseBranch}...${params.branchToAnalyze}`],
    });

    // Group files by directory using the commit service's scope detection
    const filesByDirectory = files.reduce(
      (acc, file) => {
        const directory = file.path.split("/")[0];
        if (!acc[directory]) {
          acc[directory] = [];
        }
        acc[directory].push(file.path);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    return {
      branch: params.branchToAnalyze,
      baseBranch,
      commits,
      stats: {
        totalCommits: commits.length,
        filesChanged: files.length,
        additions: files.reduce((sum, f) => sum + f.additions, 0),
        deletions: files.reduce((sum, f) => sum + f.deletions, 0),
        authors: [...new Set(commits.map((c) => c.author))],
        timeSpan: {
          firstCommit: commits[commits.length - 1]?.date ?? new Date(),
          lastCommit: commits[0]?.date ?? new Date(),
        },
      },
      warnings: [],
      filesByDirectory,
      files,
      diff,
    };
  }

  async validateBranchContext({
    branchToAnalyze,
  }: {
    branchToAnalyze: string;
  }): Promise<BranchValidationResult> {
    this.logger.info("\n🔎 Validating branch context...");

    const result: BranchValidationResult = {
      isValid: true,
      isUpToDate: true,
      existsLocally: false,
      existsRemotely: false,
      errors: [],
      warnings: [],
    };

    try {
      const localBranches = await this.git.getLocalBranches();
      const remoteBranches = localBranches.filter((b) =>
        b.startsWith("origin/"),
      );

      result.existsLocally = localBranches.includes(branchToAnalyze);
      result.existsRemotely = remoteBranches.includes(
        `origin/${branchToAnalyze}`,
      );

      if (!result.existsLocally) {
        if (result.existsRemotely) {
          result.errors.push(
            `Branch '${branchToAnalyze}' exists remotely but needs to be checked out locally first`,
          );
        } else {
          result.errors.push(
            `Branch '${branchToAnalyze}' not found locally or remotely`,
          );
        }
        result.isValid = false;
        return result;
      }

      // Check if branch is up to date with remote
      if (result.existsLocally && result.existsRemotely) {
        const localCommit = await this.git.execGit({
          command: "rev-parse",
          args: [branchToAnalyze],
        });
        const remoteCommit = await this.git.execGit({
          command: "rev-parse",
          args: [`origin/${branchToAnalyze}`],
        });

        result.isUpToDate = localCommit.trim() === remoteCommit.trim();
        if (!result.isUpToDate) {
          result.warnings.push(
            `Branch '${branchToAnalyze}' is not up to date with remote`,
          );
        }
      }

      return result;
    } catch (error) {
      this.logger.error("Failed to validate branch context:", error);
      result.isValid = false;
      result.errors.push(
        `Failed to validate branch: ${error instanceof Error ? error.message : String(error)}`,
      );
      return result;
    }
  }
}
