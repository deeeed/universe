import chalk from "chalk";
import { BranchCommandOptions } from "../../commands/branch.js";
import { GitService } from "../../services/git.service.js";
import { GitHubService } from "../../services/github.service.js";
import { PRService } from "../../services/pr.service.js";
import { PRAnalysisResult } from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { Logger } from "../../types/logger.types.js";
import { copyToClipboard } from "../../utils/clipboard.util.js";
import { checkGitHubToken } from "../../utils/github.util.js";
import { promptYesNo } from "../../utils/user-prompt.util.js";

interface BranchPRControllerParams {
  logger: Logger;
  git: GitService;
  github: GitHubService;
  prService: PRService;
  config: Config;
}

export class BranchPRController {
  private readonly logger: Logger;
  private readonly git: GitService;
  private readonly github: GitHubService;
  private readonly prService: PRService;
  private readonly config: Config;

  constructor({
    logger,
    git,
    github,
    prService,
    config,
  }: BranchPRControllerParams) {
    this.logger = logger;
    this.git = git;
    this.github = github;
    this.prService = prService;
    this.config = config;
  }

  public async validateGitHubAccess(): Promise<boolean> {
    if (!checkGitHubToken({ config: this.config, logger: this.logger })) {
      this.logger.info("\n❌ Cannot create PR without GitHub token");
      return false;
    }

    const githubInfo = await this.github.getGitHubInfo();
    if (!githubInfo) {
      this.logger.error("\n❌ Unable to get GitHub repository information");
      return false;
    }

    return true;
  }

  async handleRemoteBranch({
    branchToAnalyze,
  }: {
    branchToAnalyze: string;
  }): Promise<boolean> {
    try {
      await this.github.getBranch({ branch: branchToAnalyze });
      return true;
    } catch (error) {
      this.logger.info(`\n⚠️ Branch '${branchToAnalyze}' not found on remote`);

      const localBranches = await this.git.getLocalBranches();
      if (!localBranches.includes(branchToAnalyze)) {
        this.logger.error(
          `\n❌ Branch '${branchToAnalyze}' not found locally either`,
        );
        return false;
      }

      const shouldPush = await promptYesNo({
        message: "\nWould you like to push this branch to remote?",
        logger: this.logger,
        defaultValue: true,
      });

      if (shouldPush) {
        this.logger.info("\n📤 Pushing branch to remote...");
        await this.git.execGit({
          command: "push",
          args: ["-u", "origin", branchToAnalyze],
        });
        this.logger.info("✅ Branch pushed successfully!");
        return true;
      } else {
        this.logger.info("\n📝 Next steps:");
        this.logger.info(
          [
            "1. Push your branch to remote using:",
            `git push -u origin ${branchToAnalyze}`,
          ].join(" "),
        );
        this.logger.info("2. Run this command again to create the PR");
        return false;
      }
    }
  }

  private async getPRContent({
    options,
    analysisResult,
    branchToAnalyze,
  }: {
    options: BranchCommandOptions;
    analysisResult: PRAnalysisResult;
    branchToAnalyze: string;
  }): Promise<{ title: string; description: string } | null> {
    let title = options.title;
    let description = options.description;

    if (!title || !description) {
      if (options.ai && analysisResult.description) {
        this.logger.info("\n📝 AI generated a PR description:");
        this.logger.info(`\nTitle: ${analysisResult.description.title}`);
        this.logger.info(
          `\nDescription:\n${analysisResult.description.description}`,
        );

        const useAIContent = await promptYesNo({
          message: "\nWould you like to use this AI-generated content?",
          logger: this.logger,
          defaultValue: true,
        });

        if (useAIContent) {
          title = analysisResult.description.title;
          description = analysisResult.description.description;
        }
      }

      if (!title || !description) {
        title = this.generateTitle(analysisResult, branchToAnalyze);
        description = this.generateDescription(analysisResult);
      }
    }

    return { title, description };
  }

  private generateTitle(
    analysisResult: PRAnalysisResult,
    branchName: string,
  ): string {
    if (analysisResult.commits.length > 0) {
      if (analysisResult.commits.length === 1) {
        return analysisResult.commits[0].message;
      }
      return `Combined changes (${analysisResult.commits.length} commits)`;
    }
    return branchName;
  }

  private generateDescription(analysisResult: PRAnalysisResult): string {
    const sections: string[] = [];

    if (analysisResult.commits.length > 0) {
      sections.push("## Commits\n");
      analysisResult.commits.forEach((commit) => {
        sections.push(`- ${commit.message} (${commit.hash.slice(0, 7)})`);
      });
    }

    sections.push("\n## Changes\n");
    sections.push(`- Files changed: ${analysisResult.stats.filesChanged}`);
    sections.push(`- Additions: +${analysisResult.stats.additions}`);
    sections.push(`- Deletions: -${analysisResult.stats.deletions}`);
    sections.push(`- Total commits: ${analysisResult.stats.totalCommits}`);

    if (Object.keys(analysisResult.filesByDirectory).length > 0) {
      sections.push("\n## Modified Directories\n");
      Object.entries(analysisResult.filesByDirectory).forEach(
        ([dir, files]) => {
          sections.push(`\n### ${dir}/`);
          files.forEach((file) => sections.push(`- ${file}`));
        },
      );
    }

    return sections.join("\n");
  }

  private async handleSuccessfulPR(prUrl: string): Promise<void> {
    this.logger.info(`\n✅ Pull Request created successfully!`);
    this.logger.info(`🔗 ${chalk.cyan(prUrl)}`);

    const shouldCopy = await promptYesNo({
      message: "\nWould you like to copy the PR URL to clipboard?",
      logger: this.logger,
      defaultValue: true,
    });

    if (shouldCopy) {
      await copyToClipboard({
        text: prUrl,
        logger: this.logger,
      });
      this.logger.info("\n✅ Copied to clipboard!");
    }

    this.logger.info("\n📝 Next steps:");
    this.logger.info(
      "1. Review the PR description and make any necessary edits",
    );
    this.logger.info("2. Request reviewers for your PR");
    this.logger.info("3. Address any automated checks or CI feedback");
  }

  async createPullRequest({
    options,
    analysisResult,
    branchToAnalyze,
  }: {
    options: BranchCommandOptions;
    analysisResult: PRAnalysisResult;
    branchToAnalyze: string;
  }): Promise<PRAnalysisResult> {
    try {
      this.logger.info("\n🚀 Preparing to create Pull Request...");

      // Validate GitHub access
      if (!(await this.validateGitHubAccess())) {
        return analysisResult;
      }

      // Check if PR already exists
      const existingPR = await this.github.getPRForBranch({
        branch: branchToAnalyze,
      });
      if (existingPR) {
        this.logger.info(
          `\n⚠️ A pull request already exists for branch '${branchToAnalyze}'`,
        );
        this.logger.info(`🔗 ${chalk.cyan(existingPR.url)}`);
        return analysisResult;
      }

      // Handle remote branch
      if (!(await this.handleRemoteBranch({ branchToAnalyze }))) {
        return analysisResult;
      }

      // Get PR content
      const prContent = await this.getPRContent({
        options,
        analysisResult,
        branchToAnalyze,
      });

      if (!prContent) {
        this.logger.error("\n❌ Failed to get PR content");
        return analysisResult;
      }

      // Create PR
      const pr = await this.prService.createPRFromBranch({
        branch: branchToAnalyze,
        draft: options.draft,
        labels: options.labels,
        useAI: options.ai,
        title: prContent.title,
        description: prContent.description,
        base: options.base,
      });

      if (pr) {
        await this.handleSuccessfulPR(pr.url);
      }

      return analysisResult;
    } catch (error) {
      this.logger.error(
        `\n${chalk.red("❌")} Pull Request creation failed:`,
        error,
      );
      this.logger.debug("Full PR creation error details:", error);
      return analysisResult;
    }
  }
}
