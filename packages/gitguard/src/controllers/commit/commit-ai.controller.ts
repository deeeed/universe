import chalk from "chalk";
import { DEFAULT_MAX_PROMPT_TOKENS } from "../../constants.js";
import { CommitService } from "../../services/commit.service.js";
import { GitService } from "../../services/git.service.js";
import { AIProvider } from "../../types/ai.types.js";
import {
  CommitAnalysisResult,
  CommitSuggestion,
} from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { FileChange } from "../../types/git.types.js";
import { Logger } from "../../types/logger.types.js";
import { SecurityCheckResult } from "../../types/security.types.js";
import { checkAILimits, displayTokenInfo } from "../../utils/ai-limits.util.js";
import { generateCommitSuggestionPrompt } from "../../utils/ai-prompt.util.js";
import { copyToClipboard } from "../../utils/clipboard.util.js";
import {
  displayAISuggestions,
  displaySplitSuggestions,
  promptAIAction,
  promptCommitSuggestion,
  promptSplitChoice,
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
  bestDiff: { content: string };
  result: CommitAnalysisResult;
  isClipboard?: boolean;
}

interface SelectBestDiffParams {
  fullDiff: string;
  prioritizedDiffs: string;
  isClipboardAction: boolean;
}

interface ExecuteCommitParams {
  suggestion: CommitSuggestion;
  detectedScope?: string;
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

  private async handleUnstageFiles(files: string[]): Promise<void> {
    this.logger.debug("Attempting to unstage files:", { files });

    this.logger.info(`\n🗑️  ${chalk.yellow("Unstaging other files:")}`);
    files.forEach((file) => {
      this.logger.info(`   ${chalk.dim("•")} ${chalk.gray(file)}`);
    });

    try {
      await this.git.unstageFiles({ files });
      this.logger.info(chalk.green("\n✅ Successfully unstaged other files"));
      this.logger.debug("Files unstaged successfully");
    } catch (error) {
      this.logger.error(chalk.red("\n❌ Failed to unstage files:"), error);
      this.logger.debug("Failed to unstage files:", { error });
      throw error;
    }
  }

  private getKeptFiles(
    selectedFiles: string[],
    originalFiles: FileChange[],
  ): FileChange[] {
    const keptFiles = selectedFiles
      .map((filePath) => originalFiles.find((f) => f.path === filePath))
      .filter((file): file is FileChange => file !== undefined);

    if (keptFiles.length !== selectedFiles.length) {
      this.logger.debug("Some files were not found in original analysis:", {
        expected: selectedFiles,
        found: keptFiles.map((f) => f.path),
      });
    }

    return keptFiles;
  }

  private cleanMessage(message: string): string {
    return message.replace(
      /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\([^)]+\):\s*/,
      "",
    );
  }

  private selectBestDiff({
    fullDiff,
    prioritizedDiffs,
    isClipboardAction,
  }: SelectBestDiffParams): { name: string; content: string; score: number } {
    const diffs = [
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

  private generatePrompt({
    files,
    message,
    bestDiff,
    result,
    isClipboard = false,
  }: GeneratePromptParams): string {
    return generateCommitSuggestionPrompt({
      files,
      message: message ?? "",
      diff: bestDiff.content,
      logger: this.logger,
      needsDetailedMessage: result.complexity.needsStructure,
      isClipboard,
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

  async handleSplitSuggestions({
    result,
    files,
    message: _message,
    securityResult,
    enableAI,
  }: HandleSplitSuggestionsParams): Promise<CommitAnalysisResult> {
    if (!result.splitSuggestion) {
      this.logger.debug("No split suggestion available");
      return result;
    }

    // Add AI suggestion as the last option if AI is enabled
    if (enableAI && this.ai) {
      result.splitSuggestion.suggestions.push({
        scope: "ai suggestions",
        message: "Get AI suggestions for all changes",
        files: [],
        order: result.splitSuggestion.suggestions.length + 1,
        type: "suggestion",
      });
    }

    displaySplitSuggestions({
      suggestions: result.splitSuggestion.suggestions,
      logger: this.logger,
    });

    const { selection } = await promptSplitChoice({
      suggestions: result.splitSuggestion.suggestions,
      logger: this.logger,
    });

    this.logger.debug("Split selection made:", { selection });

    // Handle keep all changes
    if (selection === 0) {
      this.logger.info(chalk.yellow("\n⏭️  Continuing with all changes..."));
      return result;
    }

    // Handle AI suggestion option
    if (enableAI && selection === result.splitSuggestion.suggestions.length) {
      this.logger.info(
        "\n🤖 Proceeding with AI suggestions for all changes...",
      );
      return result;
    }

    // Handle split selection - note the condition change here
    const selectedSplit = result.splitSuggestion.suggestions[selection - 1];
    if (selectedSplit) {
      // Changed condition to check if we have a valid selection
      this.logger.debug("Selected split:", {
        scope: selectedSplit.scope,
        files: selectedSplit.files,
        message: selectedSplit.message,
      });

      this.logger.info(
        `\n📦 ${chalk.cyan(`Keeping only ${selectedSplit.scope ?? "root"} changes:`)}`,
      );
      selectedSplit.files.forEach((file) => {
        this.logger.info(`   ${chalk.dim("•")} ${chalk.gray(file)}`);
      });

      // Handle unstaging files not in selected scope
      const filesToUnstage = result.splitSuggestion.suggestions
        .filter((_, index) => index + 1 !== selection)
        .flatMap((suggestion) => suggestion.files);

      this.logger.debug("Files to unstage:", { filesToUnstage });

      if (filesToUnstage.length > 0) {
        await this.handleUnstageFiles(filesToUnstage);

        // Update analysis with kept files only
        const keptFiles = this.getKeptFiles(selectedSplit.files, files);
        this.logger.debug("Kept files for new analysis:", {
          keptFiles: keptFiles.map((f) => f.path),
        });

        // Re-analyze with only the selected files
        const newResult = await this.commitService.analyze({
          files: keptFiles,
          message: this.cleanMessage(selectedSplit.message),
          enableAI: false,
          enablePrompts: true,
          securityResult,
        });

        this.logger.debug("New analysis result:", {
          formattedMessage: newResult.formattedMessage,
          stats: newResult.stats,
          warnings: newResult.warnings,
        });

        return newResult;
      }
    } else {
      this.logger.debug("Invalid selection:", { selection });
    }

    return result;
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

    // Add AI action prompt
    const aiPromptResult = await promptAIAction({
      logger: this.logger,
      tokenUsage,
    });

    switch (aiPromptResult.action) {
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
          isClipboard: false,
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
          isClipboard: true,
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
      await copyToClipboard({
        text: prompt,
        logger: this.logger,
      });
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
