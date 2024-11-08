import { GitService } from "../../services/git.service.js";
import { GitHubService } from "../../services/github.service.js";
import { PRService } from "../../services/pr.service.js";
import { PRAnalysisResult } from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { Logger } from "../../types/logger.types.js";

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
  private readonly github: GitHubService;
  private readonly prService: PRService;
  private readonly config: Config;

  constructor({
    logger,
    git,
    github,
    config,
    prService,
  }: BranchAnalysisControllerParams) {
    this.logger = logger;
    this.git = git;
    this.github = github;
    this.config = config;
    this.prService = prService;
  }

  async analyzeBranch({
    branchToAnalyze,
    enableAI,
  }: {
    branchToAnalyze: string;
    enableAI: boolean;
  }): Promise<PRAnalysisResult> {
    this.logger.info(`\n🔍 Analyzing branch: ${branchToAnalyze}`);

    const validation = await this.validateBranchContext({ branchToAnalyze });
    if (!validation.isValid) {
      throw new Error(
        `Branch validation failed: ${validation.errors.join(", ")}`,
      );
    }

    const baseBranch = await this.getBaseBranch();

    this.logger.info(`📊 Analysis configuration:
  • Base branch: ${baseBranch}
  • AI enabled: ${enableAI ? "yes" : "no"}
  • Branch to analyze: ${branchToAnalyze}
  • Repository type: ${(await this.git.isMonorepo()) ? "Monorepo" : "Standard"}
`);

    const result = await this.prService.analyze({
      branch: branchToAnalyze,
      enableAI,
      enablePrompts: true,
    });

    this.displayAnalysisStats(result);

    return result;
  }

  private async getBaseBranch(): Promise<string> {
    try {
      const configuredBase = this.config.git.baseBranch;
      if (configuredBase) {
        return configuredBase;
      }

      const defaultBranch = await this.github.getBranch({ branch: "main" });
      return defaultBranch.name;
    } catch (error) {
      this.logger.debug("Failed to get GitHub default branch:", error);
      return "main";
    }
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

  private displayAnalysisStats(result: PRAnalysisResult): void {
    try {
      this.logger.info("\n📈 Analysis Results:");

      if (result.stats) {
        this.logger.info(`  • Files changed: ${result.stats.filesChanged}`);
        this.logger.info(`  • Additions: ${result.stats.additions}`);
        this.logger.info(`  • Deletions: ${result.stats.deletions}`);
      }

      if (result.warnings.length > 0) {
        this.logger.warn("\n⚠️ Warnings:");
        result.warnings.forEach((warning) => {
          this.logger.warn(`  • ${warning.message}`);
        });
      }
    } catch (error) {
      this.logger.error("Failed to display analysis stats:", error);
    }
  }
}
