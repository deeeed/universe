import chalk from "chalk";
import { Command } from "commander";
import {
  DEFAULT_CONTEXT_LINES,
  DEFAULT_MAX_PROMPT_TOKENS,
} from "../constants.js";
import { AIFactory } from "../services/factories/ai.factory.js";
import { GitService } from "../services/git.service.js";
import { GitHubService } from "../services/github.service.js";
import { LoggerService } from "../services/logger.service.js";
import { PRService } from "../services/pr.service.js";
import { ReporterService } from "../services/reporter.service.js";
import { SecurityService } from "../services/security.service.js";
import { PRAnalysisResult } from "../types/analysis.types.js";
import { GitConfig } from "../types/config.types.js";
import { checkAILimits } from "../utils/ai-limits.util.js";
import { generatePRDescriptionPrompt } from "../utils/ai-prompt.util.js";
import { copyToClipboard } from "../utils/clipboard.util.js";
import { loadConfig } from "../utils/config.util.js";
import { formatDiffForAI } from "../utils/diff.util.js";
import { checkGitHubToken } from "../utils/github.util.js";
import {
  promptAIAction,
  promptInput,
  promptYesNo,
} from "../utils/user-prompt.util.js";

interface BranchCommandOptions {
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
  edit?: boolean;
}

interface BranchAnalyzeParams {
  options: BranchCommandOptions;
}

export async function analyzeBranch({
  options,
}: BranchAnalyzeParams): Promise<PRAnalysisResult> {
  const isDebug = options.debug || process.env.GITGUARD_DEBUG === "true";
  const logger = new LoggerService({ debug: isDebug });
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

    // If AI is enabled, optimize the diff before generating descriptions
    if (options.ai && ai) {
      logger.info("\n🤖 Preparing AI suggestions...");

      // Compare different diff strategies
      const fullDiff = analysisResult.diff;
      const prioritizedDiffs = formatDiffForAI({
        files: analysisResult.files,
        diff: fullDiff,
        maxLength: config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS,
        logger,
        options: {
          includeTests: false,
          prioritizeCore: true,
          contextLines: DEFAULT_CONTEXT_LINES,
        },
      });

      // Compare and select the best diff strategy
      const diffs = [
        {
          name: "full",
          content: fullDiff,
          score:
            fullDiff.length >
            (config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS) / 4
              ? 0
              : 1,
        },
        {
          name: "prioritized",
          content: prioritizedDiffs,
          score: prioritizedDiffs.length > 0 ? 2 : 0,
        },
      ];

      // Log details about each diff strategy
      logger.debug("Diff strategies comparison:", {
        full: {
          length: fullDiff.length,
          preview: fullDiff.slice(0, 100) + "...",
          score: diffs[0].score,
        },
        prioritized: {
          length: prioritizedDiffs.length,
          preview: prioritizedDiffs.slice(0, 100) + "...",
          score: diffs[1].score,
        },
      });

      // Select the best strategy based on score and length
      const bestDiff = diffs.reduce((best, current) => {
        logger.debug(`Comparing diffs:`, {
          current: {
            name: current.name,
            score: current.score,
            length: current.content.length,
          },
          best: {
            name: best.name,
            score: best.score,
            length: best.content.length,
          },
        });

        if (current.score > best.score) return current;
        if (
          current.score === best.score &&
          current.content.length < best.content.length
        )
          return current;
        return best;
      }, diffs[0]);

      logger.info(
        `Using ${chalk.cyan(bestDiff.name)} diff strategy (${chalk.bold(bestDiff.content.length)} chars)`,
      );

      // Generate prompt with the best diff
      const prompt = generatePRDescriptionPrompt({
        commits: analysisResult.commits,
        files: analysisResult.files,
        baseBranch: analysisResult.baseBranch,
        template: await prService.loadPRTemplate(),
        diff: bestDiff.content,
        logger,
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
      logger.info(
        `📝 ${chalk.cyan("Prompt size:")} ${chalk.bold(
          Math.round(prompt.length / 1024),
        )}KB (${chalk.bold(prompt.length)} chars)`,
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
            baseBranch: analysisResult.baseBranch,
            prompt,
          });

          if (description) {
            logger.info("\n📝 AI generated a PR description:");
            logger.info(`\nTitle: ${description.title}`);
            logger.info(`\nDescription:\n${description.description}`);

            const useAIContent = await promptYesNo({
              message: "\nWould you like to use this AI-generated content?",
              logger,
              defaultValue: true,
            });

            if (useAIContent) {
              analysisResult.description = description;
              logger.info("\n✅ PR description updated successfully!");
            } else {
              logger.info("\n⏭️  Skipping AI-generated content");
            }
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

        // Check remote branch using GitHubService directly
        try {
          await github.getBranch({ branch: branchToAnalyze });
        } catch (error) {
          logger.info(`\n⚠️ Branch '${branchToAnalyze}' not found on remote`);

          // Check if branch exists locally using GitService
          const localBranches = await git.getLocalBranches();
          if (!localBranches.includes(branchToAnalyze)) {
            logger.error(
              `\n❌ Branch '${branchToAnalyze}' not found locally either`,
            );
            return analysisResult;
          }

          const shouldPush = await promptYesNo({
            message: "\nWould you like to push this branch to remote?",
            logger,
            defaultValue: true,
          });

          if (shouldPush) {
            logger.info("\n📤 Pushing branch to remote...");
            await git.execGit({
              command: "push",
              args: ["-u", "origin", branchToAnalyze],
            });
            logger.info("✅ Branch pushed successfully!");
          } else {
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
            } else {
              // If user declines AI content, prompt for manual input
              title = await promptInput({
                message: "\nEnter PR title:",
                logger,
                defaultValue: branchToAnalyze,
              });

              description = await promptInput({
                message: "\nEnter PR description:",
                logger,
                defaultValue: "",
              });
            }
          } else {
            // If no AI content available, prompt for manual input
            title = await promptInput({
              message: "\nEnter PR title:",
              logger,
              defaultValue: branchToAnalyze,
            });

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
    }

    logger.debug("Branch analysis completed successfully");
    return analysisResult;
  } catch (error) {
    logger.error(`\n${chalk.red("❌")} Branch analysis failed:`, error);
    logger.debug("Full analysis error details:", error);
    throw error;
  }
}

// Subcommands
const analyze = new Command("analyze")
  .description("Analyze current branch changes")
  .option("--detailed", "Generate a detailed report")
  .option("--ai", "Enable AI-powered suggestions")
  .option("--format <format>", "Output format (console, json, markdown)")
  .option("--security", "Include security analysis")
  .option("--debug", "Enable debug mode")
  .action(async (cmdOptions: BranchCommandOptions) => {
    await analyzeBranch({ options: cmdOptions });
  });

const create = new Command("pr")
  .description("Create a pull request")
  .option("--draft", "Create PR as draft")
  .option("--title <title>", "PR title")
  .option("--description <description>", "PR description")
  .option("--base <branch>", "Base branch for PR", "main")
  .option("--labels <labels...>", "PR labels")
  .option("--ai", "Use AI to generate content")
  .option("--debug", "Enable debug mode")
  .action(async (cmdOptions: BranchCommandOptions) => {
    await analyzeBranch({ options: { ...cmdOptions, createPR: true } });
  });

const edit = new Command("edit")
  .description("Edit existing PR")
  .option("--ai", "Use AI to generate content")
  .option("--title <title>", "New PR title")
  .option("--description <description>", "New PR description")
  .option("--debug", "Enable debug mode")
  .action(async (cmdOptions: BranchCommandOptions) => {
    await analyzeBranch({ options: { ...cmdOptions, edit: true } });
  });

// Main branch command
export const branchCommand = new Command("branch")
  .description("Branch management and pull request operations")
  .option("--name <branch>", "Branch name (defaults to current)")
  .option("--debug", "Enable debug mode")
  .addHelpText(
    "after",
    `
${chalk.blue("Examples:")}
  ${chalk.yellow("$")} gitguard branch analyze          # Analyze current branch
  ${chalk.yellow("$")} gitguard branch analyze --ai     # Get AI suggestions
  ${chalk.yellow("$")} gitguard branch pr --draft       # Create draft PR
  ${chalk.yellow("$")} gitguard branch edit --ai        # Edit PR with AI help
  ${chalk.yellow("$")} gitguard branch pr --base dev    # Create PR against dev branch`,
  );

// Add subcommands
branchCommand
  .addCommand(analyze)
  .addCommand(create)
  .addCommand(edit)
  .action(async (cmdOptions: BranchCommandOptions) => {
    await analyzeBranch({ options: cmdOptions });
  });

// Keep the original analyzeBranch export for backward compatibility
export async function analyzeBranchLegacy(
  params: BranchAnalyzeParams,
): Promise<PRAnalysisResult> {
  return analyzeBranch(params);
}
