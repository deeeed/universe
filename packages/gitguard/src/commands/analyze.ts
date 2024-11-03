import { loadConfig } from "../utils/config.util.js";
import {
  displaySuggestions,
  handleSecurityFindings,
} from "../hooks/prepare-commit.js";
import { CommitService } from "../services/commit.service.js";
import { AIFactory } from "../services/factories/ai.factory.js";
import { GitService } from "../services/git.service.js";
import { LoggerService } from "../services/logger.service.js";
import { PRService } from "../services/pr.service.js";
import { PromptService } from "../services/prompt.service.js";
import { ReporterService } from "../services/reporter.service.js";
import { SecurityService } from "../services/security.service.js";
import {
  CommitAnalysisResult,
  PRAnalysisResult,
} from "../types/analysis.types.js";

interface AnalyzeOptions {
  pr?: string | number;
  branch?: string;
  message?: string;
  format?: "console" | "json" | "markdown";
  color?: boolean;
  detailed?: boolean;
  debug?: boolean;
  configPath?: string;
}

type AnalyzeResult = CommitAnalysisResult | PRAnalysisResult;

export async function analyze(options: AnalyzeOptions): Promise<AnalyzeResult> {
  const logger = new LoggerService({ debug: options.debug });
  const reporter = new ReporterService({ logger });

  try {
    const config = await loadConfig({ configPath: options.configPath });
    const git = new GitService({
      config: {
        ...config.git,
        cwd: process.cwd(),
      },
      logger,
    });

    const security = config.security?.enabled
      ? new SecurityService({ logger, config })
      : undefined;

    const prompt = new PromptService({ logger });
    const ai = config.ai?.enabled
      ? AIFactory.create({ config, logger })
      : undefined;

    // If no specific analysis type is specified, analyze staged changes
    if (!options.pr && !options.branch) {
      const stagedFiles = await git.getStagedChanges();

      if (stagedFiles.length === 0) {
        logger.info(
          "No staged changes found. Stage some changes first or specify a PR/branch to analyze.",
        );
        process.exit(0);
      }

      const commitService = new CommitService({
        config,
        git,
        security,
        prompt,
        ai,
        logger,
      });

      // Run security checks first
      const diff = await git.getStagedDiff();
      const securityResult = security?.analyzeSecurity({
        files: stagedFiles,
        diff,
      });

      if (
        securityResult?.secretFindings.length ||
        securityResult?.fileFindings.length
      ) {
        await handleSecurityFindings({
          secretFindings: securityResult.secretFindings || [],
          fileFindings: securityResult.fileFindings || [],
          logger,
          git,
        });
      }

      // If no message provided, use AI to suggest one if available
      if (!options.message && ai) {
        logger.info(
          "\n🤖 No commit message provided. Generating AI suggestions...",
        );
        const result = await commitService.analyze({
          message: "", // Empty message to bypass the error
          enableAI: true,
          enablePrompts: true,
          securityResult,
        });

        if (result.suggestions?.length) {
          const chosenMessage = await displaySuggestions({
            suggestions: result.suggestions,
            logger,
            prompt: "",
          });

          if (chosenMessage) {
            options.message = chosenMessage;
          }
        }
      }

      // If still no message, use automatic type detection
      if (!options.message) {
        const type = commitService.detectCommitType(stagedFiles);
        const scope = commitService.detectScope(stagedFiles);
        options.message = scope ? `${type}(${scope}): ` : `${type}: `;

        logger.info("\n📝 Generated commit type based on changes.");
        logger.info(`Suggested format: ${options.message}<description>`);
      }

      const result = await commitService.analyze({
        message: options.message,
        enableAI: Boolean(config.ai?.enabled),
        enablePrompts: true,
        securityResult,
      });

      reporter.generateReport({
        result,
        options: {
          format: options.format || "console",
          color: options.color,
          detailed: options.detailed,
        },
      });

      return result;
    }

    // PR analysis logic
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

    reporter.generateReport({
      result,
      options: {
        format: options.format || "console",
        color: options.color,
        detailed: options.detailed,
      },
    });

    return result;
  } catch (error) {
    logger.error("Analysis failed:", error);
    throw error;
  }
}
