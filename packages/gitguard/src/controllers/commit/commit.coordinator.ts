import { CommitCommandOptions } from "../../commands/commit.js";
import { AIFactory } from "../../services/factories/ai.factory.js";
import { GitService } from "../../services/git.service.js";
import { LoggerService } from "../../services/logger.service.js";
import { ReporterService } from "../../services/reporter.service.js";
import { SecurityService } from "../../services/security.service.js";
import { AIProvider } from "../../types/ai.types.js";
import { CommitAnalysisResult } from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { FileChange } from "../../types/git.types.js";
import { loadConfig } from "../../utils/config.util.js";
import { CommitAIController } from "./commit-ai.controller.js";
import { CommitAnalysisController } from "./commit-analysis.controller.js";
import { CommitSecurityController } from "./commit-security.controller.js";

interface CommitAnalyzeParams {
  options: CommitCommandOptions;
}

interface ServicesContext {
  logger: LoggerService;
  reporter: ReporterService;
  git: GitService;
  security: SecurityService;
  ai?: AIProvider;
  config: Config;
}

interface ControllersContext {
  analysisController: CommitAnalysisController;
  securityController: CommitSecurityController;
  aiController: CommitAIController;
}

interface AnalysisContext {
  filesToAnalyze: FileChange[];
  shouldAnalyzeStaged: boolean;
  shouldAnalyzeUnstaged: boolean;
  currentBranch: string;
  baseBranch: string;
}

async function initializeServices(
  options: CommitCommandOptions,
): Promise<ServicesContext> {
  const logger = new LoggerService({
    debug: options.debug || process.env.GITGUARD_DEBUG === "true",
  });
  logger.info("\n🚀 Initializing GitGuard services...");

  const reporter = new ReporterService({ logger });
  const config = await loadConfig({ configPath: options.configPath });

  if (options.cwd) {
    config.git.cwd = options.cwd;
    logger.debug("Using custom working directory:", options.cwd);
  }

  const git = new GitService({
    gitConfig: {
      ...config.git,
      baseBranch: config.git?.baseBranch ?? "main",
    },
    logger,
  });

  const security = new SecurityService({ config, logger });

  logger.info("🔍 Checking AI configuration...");
  const ai =
    (options.ai ?? config.ai?.enabled)
      ? AIFactory.create({ config: { ...config }, logger })
      : undefined;

  logger.info("✅ Services initialized successfully");
  return { logger, reporter, git, security, ai, config };
}

function initializeControllers(services: ServicesContext): ControllersContext {
  const { logger, git, security, ai, config } = services;
  return {
    analysisController: new CommitAnalysisController({ logger, git, config }),
    securityController: new CommitSecurityController({ logger, security, git }),
    aiController: new CommitAIController({ logger, ai, git, config }),
  };
}

async function getAnalysisContext(
  options: CommitCommandOptions,
  services: ServicesContext,
): Promise<AnalysisContext> {
  const { git, logger } = services;

  logger.info("\n📦 Gathering files for analysis...");
  const stagedFiles = await git.getStagedChanges();
  const unstagedFiles = await git.getUnstagedChanges();
  const currentBranch = await git.getCurrentBranch();
  const baseBranch = services.config.git.baseBranch;

  const shouldAnalyzeStaged = options.all || options.staged !== false;
  const shouldAnalyzeUnstaged = options.all || options.unstaged === true;

  logger.info(`📊 Analysis scope:`);
  if (stagedFiles.length > 0) {
    logger.info(
      `   • ${stagedFiles.length} staged files${shouldAnalyzeStaged ? " (will analyze)" : " (skipped)"}`,
    );
  }
  if (unstagedFiles.length > 0) {
    logger.info(
      `   • ${unstagedFiles.length} unstaged files${shouldAnalyzeUnstaged ? " (will analyze)" : " (skipped)"}`,
    );
  }

  const filesToAnalyze = [
    ...(shouldAnalyzeStaged ? stagedFiles : []),
    ...(shouldAnalyzeUnstaged ? unstagedFiles : []),
  ];

  return {
    filesToAnalyze,
    shouldAnalyzeStaged,
    shouldAnalyzeUnstaged,
    currentBranch,
    baseBranch,
  };
}

async function handleAnalysis(
  options: CommitCommandOptions,
  context: AnalysisContext,
  controllers: ControllersContext,
  services: ServicesContext,
): Promise<CommitAnalysisResult> {
  const { logger } = services;
  const { analysisController, securityController } = controllers;
  const { filesToAnalyze, shouldAnalyzeStaged } = context;

  logger.info("\n🔒 Running security checks...");
  const securityResult = await securityController.analyzeSecurity({
    files: filesToAnalyze,
    shouldAnalyzeStaged,
  });

  if (
    securityResult.secretFindings.length > 0 ||
    securityResult.fileFindings.length > 0
  ) {
    logger.info("\n⚠️  Security issues found - handling concerns...");
    await securityController.handleSecurityIssues({ securityResult });
  }

  logger.info("\n🔍 Analyzing changes...");
  const result = await analysisController.analyzeChanges({
    files: filesToAnalyze,
    message: options.message ?? "",
    enableAI: options.ai ?? false,
    enablePrompts: true,
    securityResult,
  });

  return result;
}

export async function analyzeCommit({
  options,
}: CommitAnalyzeParams): Promise<CommitAnalysisResult> {
  const services = await initializeServices(options);
  const { logger, reporter } = services;

  try {
    logger.info("\n🎯 Starting commit analysis...");
    const controllers = initializeControllers(services);
    const context = await getAnalysisContext(options, services);
    const { filesToAnalyze } = context;

    if (filesToAnalyze.length === 0) {
      logger.info("\n⚠️  No files to analyze");
      return controllers.analysisController.getEmptyAnalysisResult(context);
    }

    let result = await handleAnalysis(options, context, controllers, services);

    if (result.splitSuggestion) {
      logger.info("\n🔄 Processing split suggestions...");
      result = await controllers.aiController.handleSplitSuggestions({
        result,
        files: filesToAnalyze,
        message: options.message,
        securityResult: await controllers.securityController.analyzeSecurity({
          files: filesToAnalyze,
          shouldAnalyzeStaged: context.shouldAnalyzeStaged,
        }),
        enableAI: options.ai ?? false,
      });
    }

    if (options.ai && services.ai) {
      logger.info("\n🤖 Generating AI suggestions...");
      result = await controllers.aiController.handleAISuggestions({
        result,
        files: filesToAnalyze,
        message: options.message,
        shouldExecute: options.execute,
      });
    }

    logger.info("\n📋 Generating analysis report...");
    controllers.analysisController.displayAnalysisResults(result);
    reporter.generateReport({ result, options: {} });

    if (options.execute && result.formattedMessage && !options.ai) {
      logger.info("\n💾 Creating commit...");
      await controllers.analysisController.executeCommit({
        message: result.formattedMessage,
      });
    }

    logger.info("\n✨ Analysis complete!");
    return result;
  } catch (error) {
    logger.error("\n❌ Commit analysis failed:", error);
    logger.debug("Full analysis error details:", error);
    throw error;
  }
}
