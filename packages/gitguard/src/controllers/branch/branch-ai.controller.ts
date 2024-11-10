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
import {
  generatePRDescriptionPrompt,
  generatePRSplitPrompt,
} from "../../utils/ai-prompt.util.js";
import { formatDiffForAI } from "../../utils/diff.util.js";
import {
  DiffStrategy,
  handleAIAction,
  selectBestDiff,
} from "../../utils/shared-ai-controller.util.js";
import { promptYesNo } from "../../utils/user-prompt.util.js";

interface BranchAIControllerParams {
  logger: Logger;
  ai?: AIProvider;
  prService: PRService;
  github: GitHubService;
  git: GitService;
  config: Config;
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

  async handleAISuggestions({
    analysisResult,
  }: {
    analysisResult: PRAnalysisResult;
  }): Promise<PRAnalysisResult> {
    if (!this.ai) return analysisResult;

    this.logger.info("\n🤖 Preparing AI suggestions...");

    const fullDiff = await this.git.getDiff({
      type: "range",
      from: this.git.config.baseBranch,
      to: analysisResult.branch,
    });

    const bestDiff = selectBestDiff({
      fullDiff,
      files: analysisResult.files,
      config: this.config,
      ai: this.ai,
      logger: this.logger,
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
    const tokenUsage = this.ai.calculateTokenUsage({ prompt });

    return handleAIAction({
      prompt,
      humanFriendlyPrompt,
      tokenUsage,
      generateLabel: "Generate PR description",
      actionHandler: async (action) => {
        if (action === "generate") {
          return this.handlePRGeneration(analysisResult, prompt);
        }
        return analysisResult;
      },
      config: this.config,
      logger: this.logger,
      ai: this.ai,
    });
  }

  private async handlePRGeneration(
    analysisResult: PRAnalysisResult,
    prompt: string,
  ): Promise<PRAnalysisResult> {
    const description = await this.prService.generateAIDescription({
      commits: analysisResult.commits,
      files: analysisResult.files,
      baseBranch: analysisResult.baseBranch,
      prompt,
    });

    if (!description) {
      this.logger.warn("\n⚠️  No AI description could be generated.");
      return analysisResult;
    }

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
        this.logger.info("\n✅ PR description and title updated successfully!");
      } else {
        this.logger.warn("\n⚠️ Could not find existing PR to update");
      }
    } else {
      this.logger.info("\n⏭️  Skipping AI-generated content");
    }

    return { ...analysisResult, description };
  }

  public async handleSplitSuggestions({
    analysisResult,
  }: {
    analysisResult: PRAnalysisResult;
  }): Promise<PRAnalysisResult> {
    this.logger.info("\n🤖 Analyzing PR structure...");

    const fullDiff = await this.git.getDiff({
      type: "range",
      from: this.git.config.baseBranch,
      to: analysisResult.branch,
    });

    const bestDiff = selectBestDiff({
      fullDiff,
      files: analysisResult.files,
      isClipboardAction: false,
      config: this.config,
      ai: this.ai,
      logger: this.logger,
    });

    this.logger.debug("Retrieved diff for split analysis:", {
      diffSize: fullDiff.length,
      fromBranch: this.git.config.baseBranch,
      toBranch: analysisResult.branch,
    });

    const prompt = generatePRSplitPrompt({
      commits: analysisResult.commits,
      files: analysisResult.files,
      baseBranch: analysisResult.baseBranch,
      diff: bestDiff.content,
      logger: this.logger,
    });

    const tokenUsage = this.ai?.calculateTokenUsage({ prompt }) ?? {
      count: 0,
      estimatedCost: "N/A (AI not configured)",
      isWithinApiLimits: true,
      isWithinClipboardLimits: true,
    };

    return handleAIAction({
      prompt,
      humanFriendlyPrompt: prompt,
      tokenUsage,
      generateLabel: "Generate split suggestions",
      actionHandler: async (action) => {
        if (action === "generate" && this.ai) {
          const splitSuggestion =
            await this.ai.generateCompletion<PRSplitSuggestion>({
              prompt,
              options: { requireJson: true },
            });

          if (splitSuggestion) {
            return { ...analysisResult, splitSuggestion };
          }
        }
        return analysisResult;
      },
      config: this.config,
      logger: this.logger,
      ai: this.ai,
    });
  }
}
