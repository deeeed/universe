import chalk from "chalk";
import { DEFAULT_MAX_PROMPT_TOKENS } from "../../constants.js";
import { CommitService } from "../../services/commit.service.js";
import { GitService } from "../../services/git.service.js";
import { AIProvider } from "../../types/ai.types.js";
import {
  CommitAnalysisResult,
  CommitCohesionAnalysis,
  CommitSplitSuggestion,
  CommitSuggestion,
} from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { FileChange } from "../../types/git.types.js";
import { Logger } from "../../types/logger.types.js";
import { SecurityCheckResult } from "../../types/security.types.js";
import { checkAILimits, displayTokenInfo } from "../../utils/ai-limits.util.js";
import {
  generateCommitSuggestionPrompt,
  generateSplitSuggestionPrompt,
} from "../../utils/ai-prompt.util.js";
import {
  DiffStrategy,
  handleClipboardCopy,
  selectBestDiff,
} from "../../utils/shared-ai-controller.util.js";
import {
  AIAction,
  displayAISuggestions,
  promptActionChoice,
  promptCommitSuggestion,
} from "../../utils/user-prompt.util.js";

interface CommitAIControllerParams {
  logger: Logger;
  ai?: AIProvider;
  git: GitService;
  config: Config;
}

interface HandleAISuggestionsParams {
  result: CommitAnalysisResult;
  files: FileChange[];
  message?: string;
  shouldExecute?: boolean;
}

interface HandleSplitSuggestionsParams {
  result: CommitAnalysisResult;
  files: FileChange[];
  message?: string;
  securityResult: SecurityCheckResult;
  enableAI: boolean;
}

interface GeneratePromptParams {
  files: FileChange[];
  message?: string;
  bestDiff: DiffStrategy;
  result: CommitAnalysisResult;
  format?: "api" | "human";
}

interface ExecuteCommitParams {
  suggestion: CommitSuggestion;
  detectedScope?: string;
}

interface SelectBestDiffLocalParams {
  fullDiff: string;
  prioritizedDiffs: string;
  isClipboardAction: boolean;
}

export class CommitAIController {
  private readonly logger: Logger;
  private readonly ai?: AIProvider;
  private readonly git: GitService;
  private readonly config: Config;
  private readonly commitService: CommitService;

  constructor({ logger, ai, git, config }: CommitAIControllerParams) {
    this.logger = logger;
    this.ai = ai;
    this.git = git;
    this.config = config;
    this.commitService = new CommitService({
      config,
      git,
      logger,
      ai,
    });
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

  private generatePrompt({
    files,
    message,
    bestDiff,
    result,
    format = "api",
  }: GeneratePromptParams): string {
    return generateCommitSuggestionPrompt({
      files,
      message: message ?? "",
      diff: bestDiff.content,
      logger: this.logger,
      needsDetailedMessage: result.complexity.needsStructure,
      format,
    });
  }

  private async executeCommit({
    suggestion,
    detectedScope,
  }: ExecuteCommitParams): Promise<void> {
    const scopeDisplay = detectedScope ? `(${detectedScope})` : "";
    const commitMessage = `${suggestion.type}${scopeDisplay}: ${suggestion.title}${
      suggestion.message ? `\n\n${suggestion.message}` : ""
    }`;

    this.logger.info("\n📝 Creating commit with selected message...");
    try {
      await this.git.createCommit({ message: commitMessage });
      this.logger.info(chalk.green("✅ Commit created successfully!"));
    } catch (error) {
      this.logger.error(chalk.red("❌ Failed to create commit:"), error);
      throw error;
    }
  }

  async handleSplitSuggestions(
    params: HandleSplitSuggestionsParams,
  ): Promise<CommitAnalysisResult> {
    // Get basic analysis from commit service
    const basicAnalysis = this.commitService.analyzeCommitCohesion({
      files: params.files,
      originalMessage: params.message ?? "",
    });

    const shouldSplit =
      params.result.complexity.needsStructure ||
      (params.result.splitSuggestion?.suggestions?.length ?? 0) > 0;

    if (params.enableAI && this.ai && shouldSplit) {
      try {
        const diff = await this.git.getStagedDiff();
        const prioritizedDiffs = this.commitService.getPrioritizedDiffs({
          files: params.files,
          diff,
          maxLength:
            this.config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS,
        });

        const prompt = generateSplitSuggestionPrompt({
          files: params.files,
          message: params.message ?? "",
          diff: prioritizedDiffs,
          basicSuggestion: basicAnalysis.splitSuggestion,
          logger: this.logger,
        });

        const tokenUsage = this.ai.calculateTokenUsage({ prompt });

        displayTokenInfo({
          tokenUsage,
          prompt,
          maxTokens:
            this.config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS,
          logger: this.logger,
        });

        if (
          !checkAILimits({
            tokenUsage,
            config: this.config,
            logger: this.logger,
          })
        ) {
          return params.result;
        }

        const { action } = await promptActionChoice<AIAction>({
          message: "Choose how to proceed:",
          choices: [
            {
              label: "Continue with current commit",
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
            this.logger.info("\nGenerating split suggestions...");
            const aiSuggestions =
              await this.ai.generateCompletion<CommitSplitSuggestion>({
                prompt,
                options: { requireJson: true },
              });

            if (aiSuggestions?.suggestions?.length) {
              return {
                ...params.result,
                splitSuggestion: {
                  ...aiSuggestions,
                  suggestions: aiSuggestions.suggestions,
                },
              };
            }
            break;
          }

          case "copy-api":
          case "copy-manual": {
            await this.handleClipboardCopy({
              prompt,
              isApi: action === "copy-api",
            });
            break;
          }

          case "skip":
            this.logger.info("\n⏭️  Continuing with current commit");
            break;
        }
      } catch (error) {
        this.logger.error("Failed to get AI enhanced analysis:", error);
      }
    }

    // Fall back to basic analysis
    return {
      ...params.result,
      splitSuggestion: basicAnalysis.splitSuggestion,
    };
  }

  async handleAISuggestions({
    result,
    files,
    message,
    shouldExecute = false,
  }: HandleAISuggestionsParams): Promise<CommitAnalysisResult> {
    if (!this.ai) {
      this.logger.debug("AI service not available, skipping suggestions");
      return result;
    }

    this.logger.info("\n🤖 Preparing AI suggestions...");

    const fullDiff = await this.git.getStagedDiff();
    const prioritizedDiffs = this.commitService.getPrioritizedDiffs({
      files,
      diff: fullDiff,
      maxLength: this.config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS,
    });

    const bestDiff = this.selectBestDiff({
      fullDiff,
      prioritizedDiffs,
      isClipboardAction: false,
    });
    const prompt = this.generatePrompt({
      files,
      message,
      bestDiff,
      result,
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
      return result;
    }

    const { action } = await promptActionChoice<AIAction>({
      message: "Choose how to proceed:",
      choices: [
        {
          label: "Continue with current commit",
          value: "skip",
          isDefault: true,
        },
        {
          label: `Generate commit message suggestions (estimated cost: ${tokenUsage.estimatedCost})`,
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
        this.logger.info("\nGenerating AI suggestions...");
        const suggestions = await this.commitService.generateAISuggestions({
          files,
          message: message ?? "",
          diff: bestDiff.content,
          needsDetailedMessage: result.complexity.needsStructure,
        });

        if (!suggestions?.length) {
          this.logger.warn("\n⚠️  No AI suggestions could be generated.");
          return result;
        }

        const detectedScope = this.commitService.detectScope(files);
        displayAISuggestions({
          suggestions,
          detectedScope,
          logger: this.logger,
        });

        if (shouldExecute) {
          const selectedSuggestion = await promptCommitSuggestion({
            suggestions,
            logger: this.logger,
          });

          if (selectedSuggestion) {
            await this.executeCommit({
              suggestion: selectedSuggestion,
              detectedScope,
            });
          }
        }

        return {
          ...result,
          suggestions,
        };
      }

      case "copy-api": {
        const bestDiff = this.selectBestDiff({
          fullDiff,
          prioritizedDiffs,
          isClipboardAction: true,
        });

        const apiPrompt = this.generatePrompt({
          files,
          message,
          bestDiff,
          result,
          format: "api",
        });

        await this.handleClipboardCopy({
          prompt: apiPrompt,
          isApi: true,
        });
        break;
      }

      case "copy-manual": {
        const bestDiff = this.selectBestDiff({
          fullDiff,
          prioritizedDiffs,
          isClipboardAction: true,
        });

        const manualPrompt = this.generatePrompt({
          files,
          message,
          bestDiff,
          result,
          format: "human",
        });

        await this.handleClipboardCopy({
          prompt: manualPrompt,
          isApi: false,
        });
        break;
      }

      case "skip":
        this.logger.info("\n⏭️  Skipping AI suggestions");
        break;
    }

    return result;
  }

  private async handleClipboardCopy(params: {
    prompt: string;
    isApi: boolean;
  }): Promise<void> {
    return handleClipboardCopy({
      ...params,
      ai: this.ai,
      config: this.config,
      logger: this.logger,
    });
  }

  handleAISplitAnalysis(params: {
    files: FileChange[];
    message?: string;
    enablePrompts?: boolean;
  }): CommitCohesionAnalysis {
    if (!this.ai) {
      return { shouldSplit: false, warnings: [] };
    }

    // Directly use analyzeCommitCohesion since we don't need the diff
    return this.commitService.analyzeCommitCohesion({
      files: params.files,
      originalMessage: params.message ?? "",
    });
  }

  async getAIEnhancedCohesionAnalysis(params: {
    files: FileChange[];
    message: string;
    basicAnalysis: CommitCohesionAnalysis;
  }): Promise<CommitCohesionAnalysis> {
    if (!this.ai || !params.basicAnalysis.shouldSplit) {
      return params.basicAnalysis;
    }

    try {
      const diff = await this.git.getStagedDiff();
      const prioritizedDiffs = this.commitService.getPrioritizedDiffs({
        files: params.files,
        diff,
        maxLength: this.config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS,
      });

      const prompt = generateSplitSuggestionPrompt({
        files: params.files,
        message: params.message,
        diff: prioritizedDiffs,
        basicSuggestion: params.basicAnalysis.splitSuggestion,
        logger: this.logger,
      });

      const aiSuggestions =
        await this.ai.generateCompletion<CommitSplitSuggestion>({
          prompt,
          options: { requireJson: true },
        });

      if (aiSuggestions) {
        return {
          ...params.basicAnalysis,
          splitSuggestion: {
            ...aiSuggestions,
            suggestions: aiSuggestions.suggestions,
          },
        };
      }
    } catch (error) {
      this.logger.error("Failed to get AI enhanced analysis:", error);
    }

    return params.basicAnalysis;
  }
}
