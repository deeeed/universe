import chalk from "chalk";
import {
  DEFAULT_CONTEXT_LINES,
  DEFAULT_MAX_PROMPT_TOKENS,
} from "../../constants.js";
import { GitHubService } from "../../services/github.service.js";
import { PRService } from "../../services/pr.service.js";
import { AIProvider } from "../../types/ai.types.js";
import { PRAnalysisResult } from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { Logger } from "../../types/logger.types.js";
import { checkAILimits, displayTokenInfo } from "../../utils/ai-limits.util.js";
import { generatePRDescriptionPrompt } from "../../utils/ai-prompt.util.js";
import { copyToClipboard } from "../../utils/clipboard.util.js";
import { formatDiffForAI } from "../../utils/diff.util.js";
import { promptAIAction, promptYesNo } from "../../utils/user-prompt.util.js";

interface BranchAIControllerParams {
  logger: Logger;
  ai?: AIProvider;
  prService: PRService;
  github: GitHubService;
  config: Config;
}

interface DiffStrategy {
  name: string;
  content: string;
  score: number;
}

export class BranchAIController {
  private readonly logger: Logger;
  private readonly ai?: AIProvider;
  private readonly prService: PRService;
  private readonly github: GitHubService;
  private readonly config: Config;

  constructor({
    logger,
    ai,
    prService,
    github,
    config,
  }: BranchAIControllerParams) {
    this.logger = logger;
    this.ai = ai;
    this.prService = prService;
    this.github = github;
    this.config = config;
  }

  private selectBestDiffStrategy(
    analysisResult: PRAnalysisResult,
  ): DiffStrategy {
    const fullDiff = analysisResult.diff;
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

    const diffs: DiffStrategy[] = [
      {
        name: "full",
        content: fullDiff,
        score:
          fullDiff.length >
          (this.config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS) / 4
            ? 0
            : 1,
      },
      {
        name: "prioritized",
        content: prioritizedDiffs,
        score: prioritizedDiffs.length > 0 ? 2 : 0,
      },
    ];

    this.logDiffStrategies(diffs);

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

  private logDiffStrategies(diffs: DiffStrategy[]): void {
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
  }

  private async generatePrompt(
    analysisResult: PRAnalysisResult,
    bestDiff: DiffStrategy,
  ): Promise<string> {
    const template = await this.prService.loadPRTemplate();
    return generatePRDescriptionPrompt({
      commits: analysisResult.commits,
      files: analysisResult.files,
      baseBranch: analysisResult.baseBranch,
      template,
      diff: bestDiff.content,
      logger: this.logger,
    });
  }

  private async processAIAction({
    analysisResult,
    prompt,
  }: {
    analysisResult: PRAnalysisResult;
    prompt: string;
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
        await copyToClipboard({ text: prompt, logger: this.logger });
        this.logger.info("\n✅ AI prompt copied to clipboard!");
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
    const bestDiff = this.selectBestDiffStrategy(analysisResult);

    this.logger.info(
      `Using ${chalk.cyan(bestDiff.name)} diff strategy (${chalk.bold(bestDiff.content.length)} chars)`,
    );

    const prompt = await this.generatePrompt(analysisResult, bestDiff);
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

    return this.processAIAction({ analysisResult, prompt });
  }
}
