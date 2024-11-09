import chalk from "chalk";
import {
  DEFAULT_CONTEXT_LINES,
  DEFAULT_MAX_PROMPT_TOKENS,
} from "../../constants.js";
import { GitService } from "../../services/git.service.js";
import { GitHubService } from "../../services/github.service.js";
import { PRService } from "../../services/pr.service.js";
import { AIProvider } from "../../types/ai.types.js";
import { PRAnalysisResult } from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { Logger } from "../../types/logger.types.js";
import { checkAILimits } from "../../utils/ai-limits.util.js";
import { generatePRDescriptionPrompt } from "../../utils/ai-prompt.util.js";
import { copyToClipboard } from "../../utils/clipboard.util.js";
import { formatDiffForAI } from "../../utils/diff.util.js";
import { promptAIAction, promptYesNo } from "../../utils/user-prompt.util.js";

interface BranchAIControllerParams {
  logger: Logger;
  ai?: AIProvider;
  prService: PRService;
  github: GitHubService;
  git: GitService;
  config: Config;
}

interface DiffStrategy {
  name: string;
  content: string;
  score: number;
}

interface SelectBestDiffParams {
  fullDiff: string;
  prioritizedDiffs: string;
  isClipboardAction: boolean;
}

export class BranchAIController {
  private readonly logger: Logger;
  private readonly ai?: AIProvider;
  private readonly prService: PRService;
  private readonly github: GitHubService;
  private readonly git: GitService;
  private readonly config: Config;

  constructor({
    logger,
    ai,
    prService,
    github,
    git,
    config,
  }: BranchAIControllerParams) {
    this.logger = logger;
    this.ai = ai;
    this.prService = prService;
    this.github = github;
    this.git = git;
    this.config = config;
  }

  private selectBestDiff({
    fullDiff,
    prioritizedDiffs,
    isClipboardAction,
  }: SelectBestDiffParams): DiffStrategy {
    const diffs: DiffStrategy[] = [
      {
        name: "full",
        content: fullDiff,
        score: isClipboardAction
          ? 2
          : fullDiff.length >
              (this.config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS) / 4
            ? 0
            : 1,
      },
      {
        name: "prioritized",
        content: prioritizedDiffs,
        score: !isClipboardAction && prioritizedDiffs.length > 0 ? 2 : 0,
      },
    ];

    this.logger.debug("Diff strategies comparison:", {
      full: {
        length: diffs[0].content.length,
        preview: diffs[0].content.slice(0, 100) + "...",
        score: diffs[0].score,
      },
      prioritized: {
        length: diffs[1].content.length,
        preview: diffs[1].content.slice(0, 100) + "...",
        score: diffs[1].score,
      },
    });

    return diffs.reduce((best, current) => {
      if (current.score > best.score) return current;
      if (
        current.score === best.score &&
        current.content.length < best.content.length
      )
        return current;
      return best;
    }, diffs[0]);
  }

  private async generatePrompt(
    analysisResult: PRAnalysisResult,
    bestDiff: DiffStrategy,
    format: "api" | "human" = "api",
  ): Promise<string> {
    const template = await this.prService.loadPRTemplate();
    const diff =
      bestDiff.content ||
      (await this.git.getDiff({
        type: "range",
        from: this.git.config.baseBranch,
        to: analysisResult.branch,
      }));

    const formattedDiff = formatDiffForAI({
      files: analysisResult.files,
      diff,
      maxLength: this.config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS,
      logger: this.logger,
      options: {
        includeTests: false,
        prioritizeCore: true,
        contextLines: DEFAULT_CONTEXT_LINES,
      },
    });

    return generatePRDescriptionPrompt({
      commits: analysisResult.commits,
      files: analysisResult.files,
      baseBranch: analysisResult.baseBranch,
      template,
      diff: formattedDiff,
      logger: this.logger,
      format,
    });
  }

  private async processAIAction({
    analysisResult,
    prompt,
    humanFriendlyPrompt,
  }: {
    analysisResult: PRAnalysisResult;
    prompt: string;
    humanFriendlyPrompt: string;
  }): Promise<PRAnalysisResult> {
    if (!this.ai) return analysisResult;

    const aiPromptResult = await promptAIAction({
      logger: this.logger,
      tokenUsage: this.ai.calculateTokenUsage({ prompt }),
    });

    switch (aiPromptResult.action) {
      case "generate": {
        this.logger.info("\nGenerating PR description...");
        const description = await this.prService.generateAIDescription({
          commits: analysisResult.commits,
          files: analysisResult.files,
          baseBranch: analysisResult.baseBranch,
          prompt,
        });

        if (description) {
          this.logger.info("\n📝 AI generated a PR description:");
          this.logger.info(`\nTitle: ${description.title}`);
          this.logger.info(`\nDescription:\n${description.description}`);

          const useAIContent = await promptYesNo({
            message: "\nWould you like to use this AI-generated content?",
            logger: this.logger,
            defaultValue: true,
          });

          if (useAIContent) {
            analysisResult.description = description;

            // Get existing PR using github service directly
            const existingPR = await this.github.getPRForBranch({
              branch: analysisResult.branch,
            });

            if (existingPR) {
              // Update the existing PR with new content
              await this.github.updatePRFromBranch({
                number: existingPR.number,
                title: description.title,
                description: description.description,
              });
              this.logger.info(
                "\n✅ PR description and title updated successfully!",
              );
            } else {
              this.logger.warn("\n⚠️ Could not find existing PR to update");
            }
          } else {
            this.logger.info("\n⏭️  Skipping AI-generated content");
          }
        } else {
          this.logger.warn("\n⚠️  No AI description could be generated.");
        }
        break;
      }
      case "copy-api": {
        await this.handleClipboardCopy({
          prompt,
          isApi: true,
        });
        break;
      }
      case "copy-manual": {
        await this.handleClipboardCopy({
          prompt: humanFriendlyPrompt,
          isApi: false,
        });
        break;
      }
      case "skip":
        this.logger.info("\n⏭️  Skipping AI suggestions");
        break;
    }

    return analysisResult;
  }

  async handleAISuggestions({
    analysisResult,
  }: {
    analysisResult: PRAnalysisResult;
  }): Promise<PRAnalysisResult> {
    if (!this.ai) {
      return analysisResult;
    }

    this.logger.info("\n🤖 Preparing AI suggestions...");

    // Get full diff using git service instead of github
    const fullDiff = await this.git.getDiff({
      type: "range",
      from: this.git.config.baseBranch,
      to: analysisResult.branch,
    });

    // Get prioritized diffs
    const prioritizedDiffs = formatDiffForAI({
      files: analysisResult.files,
      diff: fullDiff,
      maxLength: this.config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS,
      logger: this.logger,
      options: {
        includeTests: false,
        prioritizeCore: true,
        contextLines: DEFAULT_CONTEXT_LINES,
      },
    });

    const bestDiff = this.selectBestDiff({
      fullDiff,
      prioritizedDiffs,
      isClipboardAction: false,
    });

    this.logger.info(
      `Using ${chalk.cyan(bestDiff.name)} diff strategy (${chalk.bold(bestDiff.content.length)} chars)`,
    );

    const prompt = await this.generatePrompt(analysisResult, bestDiff, "api");
    const humanFriendlyPrompt = await this.generatePrompt(
      analysisResult,
      bestDiff,
      "human",
    );

    if (
      !checkAILimits({
        tokenUsage: this.ai.calculateTokenUsage({ prompt }),
        config: this.config,
        logger: this.logger,
      })
    ) {
      return analysisResult;
    }

    return this.processAIAction({
      analysisResult,
      prompt,
      humanFriendlyPrompt,
    });
  }

  private async handleClipboardCopy({
    prompt,
    isApi,
  }: {
    prompt: string;
    isApi: boolean;
  }): Promise<void> {
    const clipboardTokens = this.ai?.calculateTokenUsage({
      prompt,
      options: { isClipboardAction: true },
    });

    if (!clipboardTokens) {
      this.logger.error(
        "\n❌ Failed to calculate token usage for clipboard content",
      );
      return;
    }

    if (
      checkAILimits({
        tokenUsage: clipboardTokens,
        config: this.config,
        logger: this.logger,
        isClipboardAction: true,
      })
    ) {
      await copyToClipboard({ text: prompt, logger: this.logger });
      this.logger.info("\n✅ AI prompt copied to clipboard!");
      if (isApi) {
        this.logger.info(
          chalk.dim(
            "\nTip: This prompt will return a JSON response that matches the API format.",
          ),
        );
      } else {
        this.logger.info(
          chalk.dim(
            "\nTip: Paste this prompt into ChatGPT or similar AI assistant for interactive suggestions.",
          ),
        );
      }
    } else {
      this.logger.warn("\n⚠️ Content exceeds maximum clipboard token limit");
    }
  }
}
