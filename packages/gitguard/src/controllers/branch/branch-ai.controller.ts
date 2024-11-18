import chalk from "chalk";
import { DEFAULT_MAX_PROMPT_TOKENS } from "../../constants.js";
import { GitService } from "../../services/git.service.js";
import { GitHubService } from "../../services/github.service.js";
import { PRService } from "../../services/pr.service.js";
import { TemplateRegistry } from "../../services/template/template-registry.js";
import { AIProvider } from "../../types/ai.types.js";
import { PRAnalysisResult } from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { Logger } from "../../types/logger.types.js";
import { displayTokenInfo } from "../../utils/ai-limits.util.js";
import {
  handleAIAction,
  TemplateResult,
} from "../../utils/shared-ai-controller.util.js";
import { promptYesNo } from "../../utils/user-prompt.util.js";

interface BranchAIControllerParams {
  logger: Logger;
  ai?: AIProvider;
  prService: PRService;
  github: GitHubService;
  git: GitService;
  config: Config;
  templateRegistry: TemplateRegistry;
}

interface PRTemplate {
  title: string;
  description: string;
}

interface HandleSplitSuggestionsParams {
  analysisResult: PRAnalysisResult;
  enableAI?: boolean;
}

export class BranchAIController {
  private readonly logger: Logger;
  private readonly ai?: AIProvider;
  private readonly prService: PRService;
  private readonly github: GitHubService;
  private readonly git: GitService;
  private readonly config: Config;
  private readonly templateRegistry: TemplateRegistry;

  constructor({
    logger,
    ai,
    prService,
    github,
    git,
    config,
    templateRegistry,
  }: BranchAIControllerParams) {
    this.logger = logger;
    this.ai = ai;
    this.prService = prService;
    this.github = github;
    this.git = git;
    this.config = config;
    this.templateRegistry = templateRegistry;
  }

  async handleAISuggestions({
    analysisResult,
  }: {
    analysisResult: PRAnalysisResult;
  }): Promise<PRAnalysisResult> {
    const fullDiff = await this.git.getDiff({
      type: "range",
      from: this.git.config.baseBranch,
      to: analysisResult.branch,
    });

    const variables = {
      commits: analysisResult.commits,
      files: analysisResult.files,
      baseBranch: analysisResult.baseBranch,
      template: await this.prService.loadPRTemplate(),
      diff: fullDiff,
      options: {
        includeTesting: false,
        includeChecklist: true,
      },
    };

    return handleAIAction<PRAnalysisResult>({
      type: "pr",
      variables,
      generateLabel: "Generate PR description",
      actionHandler: async (action, templateResult) => {
        if (action.startsWith("generate-") && this.ai && templateResult) {
          return this.handlePRGeneration({ analysisResult, templateResult });
        }
        return analysisResult;
      },
      config: this.config,
      logger: this.logger,
      ai: this.ai,
      templateRegistry: this.templateRegistry,
    });
  }

  private async handlePRGeneration({
    analysisResult,
    templateResult,
  }: {
    analysisResult: PRAnalysisResult;
    templateResult: TemplateResult;
  }): Promise<PRAnalysisResult> {
    if (this.ai) {
      const tokenUsage = this.ai.calculateTokenUsage({
        prompt: templateResult.renderedPrompt,
      });
      const maxTokens =
        this.config.ai?.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS;

      displayTokenInfo({
        tokenUsage,
        prompt: templateResult.renderedPrompt,
        maxTokens,
        logger: this.logger,
      });
    }

    const description = (await this.prService.generateAIDescription({
      templateResult,
    })) as PRTemplate | null;

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
  }: HandleSplitSuggestionsParams): Promise<PRAnalysisResult> {
    this.logger.info("\n🤖 Analyzing PR structure...");

    const fullDiff = await this.git.getDiff({
      type: "range",
      from: this.git.config.baseBranch,
      to: analysisResult.branch,
    });

    const variables = {
      commits: analysisResult.commits,
      files: analysisResult.files,
      baseBranch: analysisResult.baseBranch,
      diff: fullDiff,
      options: {
        includeTesting: false,
        includeChecklist: true,
      },
    };

    return handleAIAction<PRAnalysisResult>({
      type: "split-pr",
      variables,
      generateLabel: "Generate split suggestions",
      actionHandler: async (action, templateResult) => {
        if (action.startsWith("copy-") && templateResult) {
          this.logger.info(
            "\n✨ Use the copied suggestions to split your commits.",
          );
          return { ...analysisResult, skipFurtherSuggestions: true };
        }

        if (action.startsWith("generate-") && this.ai && templateResult) {
          const splitSuggestion = await this.prService.generateSplitSuggestion({
            templateResult,
          });

          if (splitSuggestion) {
            this.logger.info("\n📝 AI generated split suggestions:");
            if (splitSuggestion.suggestedPRs?.length) {
              splitSuggestion.suggestedPRs.forEach((pr, index) => {
                this.logger.info(`\n${index + 1}. ${pr.title}`);
                if (pr.description) {
                  this.logger.info(chalk.dim(pr.description));
                }
              });
            }
            return {
              ...analysisResult,
              splitSuggestion,
              skipFurtherSuggestions: true,
            };
          }
        }
        return analysisResult;
      },
      config: this.config,
      logger: this.logger,
      ai: this.ai,
      templateRegistry: this.templateRegistry,
    });
  }

  public hasAIProvider(): boolean {
    return !!this.ai;
  }
}
