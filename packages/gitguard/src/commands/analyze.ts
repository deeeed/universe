import { loadConfig } from "../config";
import { CommitService } from "../services/commit.service";
import { AIFactory } from "../services/factories/ai.factory";
import { GitService } from "../services/git.service";
import { LoggerService } from "../services/logger.service";
import { PRService } from "../services/pr.service";
import { PromptService } from "../services/prompt.service";
import { SecurityService } from "../services/security.service";
import {
  AnalysisWarning,
  CommitAnalysisResult,
  PRAnalysisResult,
} from "../types/analysis.types";

interface AnalyzeOptions {
  pr?: string;
  branch?: string;
  debug?: boolean;
  configPath?: string;
}

type AnalyzeResult = CommitAnalysisResult | PRAnalysisResult;

export async function analyze(options: AnalyzeOptions): Promise<AnalyzeResult> {
  const logger = new LoggerService({ debug: options.debug });

  try {
    const config = await loadConfig();

    // Initialize core services
    const git = new GitService({ config: config.git, logger });
    const security = new SecurityService({ config, logger });
    const prompt = new PromptService({ logger });
    const ai = config.ai?.enabled
      ? AIFactory.create({ config, logger })
      : undefined;

    // Determine analysis type and create appropriate service
    if (options.pr) {
      const prService = new PRService({
        config,
        git,
        security,
        prompt,
        ai,
        logger,
      });

      const result = await prService.analyze({
        branch: options.branch,
        enableAI: Boolean(config.ai?.enabled),
        enablePrompts: true,
      });

      logger.info("\n📊 PR Analysis Results:");
      if (result.warnings.length > 0) {
        logger.info("\n⚠️ Warnings:");
        result.warnings.forEach((warning: AnalysisWarning) => {
          logger.warn(`- ${warning.message} (${warning.severity})`);
        });
      }

      if (result.description) {
        logger.info("\n📝 Suggested Description:");
        logger.info(result.description.description);
      }

      return result;
    } else {
      const commitService = new CommitService({
        config,
        git,
        security,
        prompt,
        ai,
        logger,
      });

      const result = await commitService.analyze({
        messageFile: ".git/COMMIT_EDITMSG",
        enableAI: Boolean(config.ai?.enabled),
        enablePrompts: true,
      });

      logger.info("\n📊 Commit Analysis Results:");
      if (result.warnings.length > 0) {
        logger.info("\n⚠️ Warnings:");
        result.warnings.forEach((warning: AnalysisWarning) => {
          logger.warn(`- ${warning.message} (${warning.severity})`);
        });
      }

      if (result.suggestions?.length) {
        logger.info("\n💡 Suggestions:");
        result.suggestions.forEach((suggestion, index) => {
          logger.info(`\n${index + 1}. ${suggestion.message}`);
          logger.info(`   Explanation: ${suggestion.explanation}`);
        });
      }

      return result;
    }
  } catch (error) {
    logger.error("Analysis failed:", error);
    throw error;
  }
}
