import chalk from "chalk";
import {
  DEFAULT_CONTEXT_LINES,
  DEFAULT_MAX_PROMPT_TOKENS,
} from "../../constants.js";
import { GitService } from "../../services/git.service.js";
import { GitHubService } from "../../services/github.service.js";
import { PRService } from "../../services/pr.service.js";
import { AIProvider } from "../../types/ai.types.js";
import {
  PRAnalysisResult,
  PRSplitSuggestion,
} from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { Logger } from "../../types/logger.types.js";
import { checkAILimits, displayTokenInfo } from "../../utils/ai-limits.util.js";
import {
  generatePRDescriptionPrompt,
  generatePRSplitPrompt,
} from "../../utils/ai-prompt.util.js";
import { formatDiffForAI } from "../../utils/diff.util.js";
import {
  DiffStrategy,
  handleClipboardCopy,
  selectBestDiff,
} from "../../utils/shared-ai-controller.util.js";
import {
  AIAction,
  promptActionChoice,
  promptYesNo,
} from "../../utils/user-prompt.util.js";

interface BranchAIControllerParams {
  logger: Logger;
  ai?: AIProvider;
  prService: PRService;
  github: GitHubService;
  git: GitService;
  config: Config;
}

interface SelectBestDiffLocalParams {
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
  }: SelectBestDiffLocalParams): DiffStrategy {
    return selectBestDiff({
      fullDiff,
      prioritizedDiffs,
      isClipboardAction,
      config: this.config,
      ai: this.ai,
      logger: this.logger,
    });
  }

  private async generatePrompt(
    analysisResult: PRAnalysisResult,
    bestDiff: DiffStrategy,
    format: "api" | "human" = "api",
  ): Promise<string> {
    this.logger.info("\n📝 Loading PR template...");
    const template = await this.prService.loadPRTemplate();

    if (template) {
      this.logger.info("✅ PR template loaded successfully");
      this.logger.debug("Template details:", {
        sections: template.match(/##\s+([^\n]+)/g)?.map((s) => s.trim()),
        hasCheckboxes: template.includes("- [ ]"),
        length: template.length,
      });
    } else {
      this.logger.debug("No PR template found");
    }

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

    const tokenUsage = this.ai.calculateTokenUsage({ prompt });

    displayTokenInfo({
      tokenUsage,
      prompt,
      maxTokens: this.config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS,
      logger: this.logger,
    });

    if (
      !checkAILimits({ tokenUsage, config: this.config, logger: this.logger })
    ) {
      return analysisResult;
    }

    const { action } = await promptActionChoice<AIAction>({
      message: "Choose how to proceed:",
      choices: [
        {
          label: "Continue without AI assistance",
          value: "skip",
          isDefault: true,
        },
        {
          label: `Generate PR description (estimated cost: ${tokenUsage.estimatedCost})`,
          value: "generate",
        },
        {
          label: "Copy API prompt to clipboard",
          value: "copy-api",
        },
        {
          label: "Copy human-friendly prompt to clipboard",
          value: "copy-manual",
        },
      ],
      logger: this.logger,
    });

    switch (action) {
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
            const existingPR = await this.github.getPRForBranch({
              branch: analysisResult.branch,
            });

            if (existingPR) {
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

      case "copy-api":
      case "copy-manual": {
        await handleClipboardCopy({
          prompt: action === "copy-api" ? prompt : humanFriendlyPrompt,
          isApi: action === "copy-api",
          ai: this.ai,
          config: this.config,
          logger: this.logger,
        });
        break;
      }

      case "skip":
        this.logger.info("\n⏭️  Continuing without AI assistance");
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

    this.logger.info("\n Preparing AI suggestions...");

    const fullDiff = await this.git.getDiff({
      type: "range",
      from: this.git.config.baseBranch,
      to: analysisResult.branch,
    });

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

    return this.processAIAction({
      analysisResult,
      prompt,
      humanFriendlyPrompt,
    });
  }

  public async handleSplitSuggestions({
    analysisResult,
  }: {
    analysisResult: PRAnalysisResult;
  }): Promise<PRAnalysisResult> {
    this.logger.debug("Starting split suggestions with:", {
      hasAI: Boolean(this.ai),
      commitCount: analysisResult.commits.length,
      fileCount: analysisResult.files.length,
    });

    if (!this.ai) {
      this.logger.debug("No AI provider available, skipping split suggestions");
      return analysisResult;
    }

    this.logger.info("\n🤖 Analyzing PR structure...");

    try {
      const fullDiff = await this.git.getDiff({
        type: "range",
        from: this.git.config.baseBranch,
        to: analysisResult.branch,
      });

      this.logger.debug("Retrieved diff for split analysis:", {
        diffSize: fullDiff.length,
        fromBranch: this.git.config.baseBranch,
        toBranch: analysisResult.branch,
      });

      const bestDiff = this.selectBestDiff({
        fullDiff,
        prioritizedDiffs: formatDiffForAI({
          files: analysisResult.files,
          diff: fullDiff,
          maxLength:
            this.config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS,
          logger: this.logger,
          options: {
            includeTests: false,
            prioritizeCore: true,
            contextLines: DEFAULT_CONTEXT_LINES,
          },
        }),
        isClipboardAction: false,
      });

      const prompt = generatePRSplitPrompt({
        commits: analysisResult.commits,
        files: analysisResult.files,
        baseBranch: analysisResult.baseBranch,
        diff: bestDiff.content,
        logger: this.logger,
      });

      const tokenUsage = this.ai.calculateTokenUsage({ prompt });

      displayTokenInfo({
        tokenUsage,
        prompt,
        maxTokens: this.config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS,
        logger: this.logger,
      });

      if (
        !checkAILimits({ tokenUsage, config: this.config, logger: this.logger })
      ) {
        return analysisResult;
      }

      const { action } = await promptActionChoice<AIAction>({
        message: "Choose how to proceed:",
        choices: [
          {
            label: "Continue without split suggestions",
            value: "skip",
            isDefault: true,
          },
          {
            label: `Generate split suggestions (estimated cost: ${tokenUsage.estimatedCost})`,
            value: "generate",
          },
          {
            label: "Copy API prompt to clipboard",
            value: "copy-api",
          },
          {
            label: "Copy human-friendly prompt to clipboard",
            value: "copy-manual",
          },
        ],
        logger: this.logger,
      });

      switch (action) {
        case "generate": {
          this.logger.debug("Generating split suggestions with AI...");
          this.logger.info("\nGenerating split suggestions...");
          const splitSuggestion =
            await this.ai.generateCompletion<PRSplitSuggestion>({
              prompt,
              options: { requireJson: true },
            });

          if (splitSuggestion) {
            this.logger.info("\n📦 Suggested PR splits:");
            splitSuggestion.suggestedPRs.forEach((pr, index) => {
              this.logger.info(`\n${index + 1}. ${chalk.cyan(pr.title)}`);
              this.logger.info(`   Description: ${pr.description}`);
              this.logger.info(`   Files: ${pr.files.length}`);
              if (pr.dependencies?.length) {
                this.logger.info(
                  `   Dependencies: ${pr.dependencies.join(", ")}`,
                );
              }
            });

            return { ...analysisResult, splitSuggestion };
          }
          break;
        }

        case "copy-api":
        case "copy-manual": {
          await handleClipboardCopy({
            prompt:
              action === "copy-api"
                ? prompt
                : generatePRSplitPrompt({
                    commits: analysisResult.commits,
                    files: analysisResult.files,
                    baseBranch: analysisResult.baseBranch,
                    diff: bestDiff.content,
                    logger: this.logger,
                    format: "human",
                  }),
            isApi: action === "copy-api",
            ai: this.ai,
            config: this.config,
            logger: this.logger,
          });
          break;
        }
      }
    } catch (error) {
      this.logger.error("Failed to process split suggestions:", error);
      return analysisResult;
    }

    return analysisResult;
  }
}
