import chalk from "chalk";
import { AIFactory } from "../services/factories/ai.factory.js";
import { GitService } from "../services/git.service.js";
import { GitHubService } from "../services/github.service.js";
import { LoggerService } from "../services/logger.service.js";
import { PRService } from "../services/pr.service.js";
import { ReporterService } from "../services/reporter.service.js";
import { SecurityService } from "../services/security.service.js";
import { PRAnalysisResult } from "../types/analysis.types.js";
import { GitConfig } from "../types/config.types.js";
import { generatePRDescriptionPrompt } from "../utils/ai-prompt.util.js";
import { copyToClipboard } from "../utils/clipboard.util.js";
import { loadConfig } from "../utils/config.util.js";
import { checkGitHubToken } from "../utils/github.util.js";
import {
  promptAIAction,
  promptInput,
  promptYesNo,
} from "../utils/user-prompt.util.js";
import { checkAILimits } from "../utils/ai-limits.util.js";

interface BranchAnalyzeParams {
  options: {
    name?: string;
    pr?: string | number;
    format?: "console" | "json" | "markdown";
    color?: boolean;
    detailed?: boolean;
    ai?: boolean;
    debug?: boolean;
    configPath?: string;
    createPR?: boolean;
    draft?: boolean;
    labels?: string[];
    title?: string;
    description?: string;
    base?: string;
    security?: boolean;
  };
}

async function ensureRemoteBranch(params: {
  branch: string;
  git: GitService;
  github: GitHubService;
  logger: LoggerService;
}): Promise<boolean> {
  const { branch, git, github, logger } = params;

  try {
    await github.getBranch({ branch });
    return true;
  } catch (error) {
    logger.info(`\n⚠️ Branch '${branch}' not found on remote`);

    try {
      // Check if branch exists locally
      const localBranches = await git.getLocalBranches();
      if (!localBranches.includes(branch)) {
        logger.error(`\n❌ Branch '${branch}' not found locally either`);
        return false;
      }

      // Ask user if they want to push the branch
      const shouldPush = await promptYesNo({
        message: "\nWould you like to push this branch to remote?",
        logger,
        defaultValue: true,
      });

      if (shouldPush) {
        logger.info("\n📤 Pushing branch to remote...");
        await git.execGit({
          command: "push",
          args: ["-u", "origin", branch],
        });
        logger.info("✅ Branch pushed successfully!");
        return true;
      }

      return false;
    } catch (innerError) {
      logger.error("\n❌ Failed to check local branches:", innerError);
      return false;
    }
  }
}

export async function analyzeBranch({
  options,
}: BranchAnalyzeParams): Promise<PRAnalysisResult> {
  const logger = new LoggerService({ debug: options.debug });
  const detailed = options.detailed ?? false;
  let analysisResult: PRAnalysisResult | null = null;

  try {
    const config = await loadConfig({ configPath: options.configPath });
    const gitConfig: GitConfig = {
      ...config.git,
      github: config.git.github,
      baseBranch: config.git.baseBranch || "main",
      monorepoPatterns: config.git.monorepoPatterns || [],
    };

    const git = new GitService({ gitConfig, logger });

    // Initialize GitHub service first
    const github = new GitHubService({ config, logger, git });

    // Initialize other services
    const security = options.security
      ? new SecurityService({ config, logger })
      : undefined;
    const ai = options.ai ? AIFactory.create({ config, logger }) : undefined;

    // Initialize PR service with GitHub service
    const prService = new PRService({
      config,
      logger,
      git,
      github,
      security,
      ai,
    });

    // Get branch to analyze
    const currentBranch = await git.getCurrentBranch();
    const branchToAnalyze = options.name ?? currentBranch;
    const baseBranch = gitConfig.baseBranch;

    logger.debug("Branch analysis context:", {
      currentBranch,
      branchToAnalyze,
      baseBranch,
    });

    // Get branch analysis
    analysisResult = await prService.analyze({
      branch: branchToAnalyze,
      enableAI: Boolean(options.ai),
      enablePrompts: true,
    });

    // Initialize report service and show analysis results
    const reporter = new ReporterService({ logger });
    reporter.generateReport({
      result: analysisResult,
      options: {
        detailed,
      },
    });

    // Add PR creation logic after analysis
    if (options.createPR || options.draft) {
      try {
        logger.info("\n🚀 Preparing to create Pull Request...");

        // Check GitHub token first
        if (!checkGitHubToken({ config, logger })) {
          logger.info("\n❌ Cannot create PR without GitHub token");
          return analysisResult;
        }

        // Check if PR already exists
        const githubInfo = await github.getGitHubInfo();
        if (!githubInfo) {
          logger.error("\n❌ Unable to get GitHub repository information");
          return analysisResult;
        }

        // Ensure branch exists on remote
        const branchExists = await ensureRemoteBranch({
          branch: branchToAnalyze,
          git,
          github,
          logger,
        });

        if (!branchExists) {
          logger.info("\n📝 Next steps:");
          logger.info(
            [
              "1. Push your branch to remote using:",
              `git push -u origin ${branchToAnalyze}`,
            ].join(" "),
          );
          logger.info("2. Run this command again to create the PR");
          return analysisResult;
        }

        // Get PR content
        let title = options.title;
        let description = options.description;

        if (!title || !description) {
          if (options.ai && analysisResult.description) {
            logger.info("\n📝 AI generated a PR description:");
            logger.info(`\nTitle: ${analysisResult.description.title}`);
            logger.info(
              `\nDescription:\n${analysisResult.description.description}`,
            );

            const useAIContent = await promptYesNo({
              message: "\nWould you like to use this AI-generated content?",
              logger,
              defaultValue: true,
            });

            if (useAIContent) {
              title = analysisResult.description.title;
              description = analysisResult.description.description;
            }
          }

          // If still missing title/description, prompt user
          if (!title) {
            title = await promptInput({
              message: "\nEnter PR title:",
              logger,
              defaultValue: branchToAnalyze,
            });
          }

          if (!description) {
            description = await promptInput({
              message: "\nEnter PR description:",
              logger,
              defaultValue: "",
            });
          }
        }

        const pr = await prService.createPRFromBranch({
          branch: branchToAnalyze,
          draft: options.draft,
          labels: options.labels,
          useAI: options.ai,
          title,
          description,
          base: options.base,
        });

        if (pr) {
          logger.info(`\n✅ Pull Request created successfully!`);
          logger.info(`🔗 ${chalk.cyan(pr.url)}`);

          const shouldCopy = await promptYesNo({
            message: "\nWould you like to copy the PR URL to clipboard?",
            logger,
            defaultValue: true,
          });

          if (shouldCopy) {
            await copyToClipboard({
              text: pr.url,
              logger,
            });
            logger.info("\n✅ Copied to clipboard!");
          }

          logger.info("\n📝 Next steps:");
          logger.info(
            "1. Review the PR description and make any necessary edits",
          );
          logger.info("2. Request reviewers for your PR");
          logger.info("3. Address any automated checks or CI feedback");
        }
      } catch (error) {
        logger.error(
          `\n${chalk.red("❌")} Pull Request creation failed:`,
          error,
        );
        logger.debug("Full PR creation error details:", error);
        // Don't throw here, as the analysis was successful
      }
    } else if (options.ai && ai) {
      const prompt = generatePRDescriptionPrompt({
        commits: analysisResult.commits,
        files: analysisResult.files,
        baseBranch,
        template: await prService.loadPRTemplate(),
        diff: analysisResult.diff,
        logger,
        options: {
          includeTesting: config.pr?.template?.sections?.testing,
          includeChecklist: config.pr?.template?.sections?.checklist,
        },
      });

      const tokenUsage = ai.calculateTokenUsage({ prompt });

      logger.info(
        `\n💰 ${chalk.cyan("Estimated cost:")} ${chalk.bold(tokenUsage.estimatedCost)}`,
      );
      logger.info(
        `📊 ${chalk.cyan("Estimated tokens:")} ${chalk.bold(tokenUsage.count)}/${chalk.dim(
          config.ai.maxPromptTokens,
        )}`,
      );

      // Check AI limits before proceeding
      if (!checkAILimits({ tokenUsage, config, logger })) {
        return analysisResult;
      }

      const aiPromptResult = await promptAIAction({
        logger,
        tokenUsage,
      });

      switch (aiPromptResult.action) {
        case "generate": {
          logger.info("\nGenerating PR description...");
          const description = await prService.generateAIDescription({
            commits: analysisResult.commits,
            files: analysisResult.files,
            baseBranch,
            prompt,
          });

          if (description) {
            analysisResult.description = description;
          } else {
            logger.warn("\n⚠️  No AI description could be generated.");
          }
          break;
        }
        case "copy": {
          await copyToClipboard({ text: prompt, logger });
          logger.info("\n✅ AI prompt copied to clipboard!");
          break;
        }
        case "skip":
          logger.info("\n⏭️  Skipping AI suggestions");
          break;
      }
    }

    logger.debug("Branch analysis completed successfully");
    return analysisResult;
  } catch (error) {
    logger.error(`\n${chalk.red("❌")} Branch analysis failed:`, error);
    logger.debug("Full analysis error details:", error);
    throw error;
  }
}
