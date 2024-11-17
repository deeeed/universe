import chalk from "chalk";
import { CommitService } from "../../services/commit.service.js";
import { GitService } from "../../services/git.service.js";
import { TemplateRegistry } from "../../services/template/template-registry.js";
import { AIProvider } from "../../types/ai.types.js";
import {
  CommitAnalysisResult,
  CommitSuggestion,
} from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { FileChange } from "../../types/git.types.js";
import { Logger } from "../../types/logger.types.js";
import { SecurityCheckResult } from "../../types/security.types.js";
import {
  handleAIAction,
  selectBestDiff,
} from "../../utils/shared-ai-controller.util.js";
import { promptAISuggestions } from "../../utils/user-prompt.util.js";

interface CommitAIControllerParams {
  logger: Logger;
  ai?: AIProvider;
  git: GitService;
  config: Config;
  templateRegistry: TemplateRegistry;
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
  private readonly templateRegistry: TemplateRegistry;

  constructor({
    logger,
    ai,
    git,
    config,
    templateRegistry,
  }: CommitAIControllerParams) {
    this.logger = logger;
    this.ai = ai;
    this.git = git;
    this.config = config;
    this.templateRegistry = templateRegistry;
    this.commitService = new CommitService({
      config,
      git,
      logger,
      ai,
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

    if (params.enableAI && shouldSplit) {
      try {
        const diff = await this.git.getStagedDiff();

        const bestDiff = selectBestDiff({
          fullDiff: diff,
          files: params.files,
          config: this.config,
          ai: this.ai,
          logger: this.logger,
          templateRegistry: this.templateRegistry,
        });

        const variables = {
          files: params.files,
          message: params.message ?? "",
          diff: bestDiff.content,
          basicSuggestion: basicAnalysis.splitSuggestion,
          logger: this.logger,
        };

        return handleAIAction<CommitAnalysisResult>({
          type: "split-commit",
          variables,
          skipAsDefault: true,
          generateLabel: "Generate split suggestions",
          actionHandler: async (action, templateResult) => {
            if (action.startsWith("copy-")) {
              this.logger.info(
                "\n✨ Use the copied suggestions to split your commits.",
              );
              return {
                ...params.result,
                skipFurtherSuggestions: true,
              };
            }

            if (action.startsWith("generate-") && this.ai && templateResult) {
              const aiSuggestions =
                await this.commitService.generateAISplitSuggestion({
                  templateResult,
                });

              if (aiSuggestions?.suggestions?.length) {
                return {
                  ...params.result,
                  skipFurtherSuggestions: true,
                  splitSuggestion: {
                    ...aiSuggestions,
                    suggestions: aiSuggestions.suggestions,
                  },
                };
              }
            }

            return params.result;
          },
          config: this.config,
          logger: this.logger,
          ai: this.ai,
          templateRegistry: this.templateRegistry,
        });
      } catch (error) {
        this.logger.error("Failed to get AI enhanced analysis:", error);
      }
    }

    return params.result;
  }

  async handleAISuggestions({
    result,
    files,
    message,
    shouldExecute = true,
  }: HandleAISuggestionsParams): Promise<CommitAnalysisResult> {
    if (result.skipFurtherSuggestions) {
      return result;
    }

    this.logger.info("\n🤖 Preparing AI suggestions...");
    const fullDiff = await this.git.getStagedDiff();

    const bestDiff = selectBestDiff({
      fullDiff,
      files,
      config: this.config,
      ai: this.ai,
      logger: this.logger,
      templateRegistry: this.templateRegistry,
    });

    const variables = {
      files,
      message: message ?? "",
      diff: bestDiff.content,
      needsDetailedMessage: result.complexity.needsStructure,
      options: {
        includeTesting: false,
        includeChecklist: true,
      },
    };

    this.logger.debug("AI suggestion parameters:", {
      hasMessage: !!message,
      shouldExecute,
      filesCount: files.length,
      hasAI: !!this.ai,
    });

    return handleAIAction<CommitAnalysisResult>({
      type: "commit",
      variables,
      ai: this.ai,
      generateLabel: "Generate commit message suggestions",
      actionHandler: async (action, templateResult) => {
        if (action.startsWith("generate-") && templateResult) {
          const suggestions = await this.commitService.generateAISuggestions({
            needsDetailedMessage: result.complexity.needsStructure,
            templateResult,
          });

          if (!suggestions?.length) {
            this.logger.warn("\n⚠️  No AI suggestions could be generated.");
            return result;
          }

          const detectedScope = this.commitService.detectScope(files);

          if (shouldExecute) {
            const selectedSuggestion = await promptAISuggestions({
              suggestions,
              detectedScope,
              logger: this.logger,
            });

            if (selectedSuggestion) {
              await this.executeCommit({
                suggestion: selectedSuggestion,
                detectedScope,
              });
            }
          }

          return { ...result, suggestions };
        }
        return result;
      },
      config: this.config,
      logger: this.logger,
      templateRegistry: this.templateRegistry,
    });
  }
}
