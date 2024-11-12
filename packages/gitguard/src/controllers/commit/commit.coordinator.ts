import chalk from "chalk";
import { CommitCommandOptions } from "../../commands/commit.js";
import { GitService } from "../../services/git.service.js";
import { LoggerService } from "../../services/logger.service.js";
import { ReporterService } from "../../services/reporter.service.js";
import { SecurityService } from "../../services/security.service.js";
import { AIProvider } from "../../types/ai.types.js";
import { CommitAnalysisResult } from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { FileChange } from "../../types/git.types.js";
import { SecurityCheckResult } from "../../types/security.types.js";
import { initializeAI } from "../../utils/ai-init.util.js";
import { loadConfig } from "../../utils/config.util.js";
import { shouldIgnoreFile } from "../../utils/ignore-pattern.util.js";
import { promptYesNo } from "../../utils/user-prompt.util.js";
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
    logger.debug("Using custom working directory:", options.cwd);
  }

  const git = new GitService({
    gitConfig: {
      ...config.git,
      baseBranch: config.git?.baseBranch ?? "main",
      cwd: options.cwd,
    },
    logger,
  });

  const security = new SecurityService({ config, logger });

  const isAIRequested = options.ai ?? config.ai?.enabled;
  const ai = initializeAI({ config, logger, isAIRequested });

  logger.info("✅ Services initialized successfully");
  return { logger, reporter, git, security, ai, config };
}

function initializeControllers(services: ServicesContext): ControllersContext {
  const { logger, git, security, config } = services;
  return {
    analysisController: new CommitAnalysisController({
      logger,
      git,
      config,
    }),
    securityController: new CommitSecurityController({ logger, security, git }),
    aiController: new CommitAIController({
      logger,
      ai: services.ai,
      git,
      config,
    }),
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

  const shouldAnalyzeStaged =
    options.all || options.staged || (!options.unstaged && !options.all);
  const shouldAnalyzeUnstaged = options.all || options.unstaged;

  const filesToAnalyze = [
    ...(shouldAnalyzeStaged ? stagedFiles : []),
    ...(shouldAnalyzeUnstaged ? unstagedFiles : []),
  ];

  if (filesToAnalyze.length > 0) {
    logger.info("\n📂 Files to analyze:");
    if (shouldAnalyzeStaged && stagedFiles.length > 0) {
      logger.info(`  ${chalk.green("✓")} ${stagedFiles.length} staged files`);
    }
    if (shouldAnalyzeUnstaged && unstagedFiles.length > 0) {
      logger.info(
        `  ${chalk.yellow("+")} ${unstagedFiles.length} unstaged files`,
      );
    }
  }

  return {
    filesToAnalyze,
    shouldAnalyzeStaged,
    shouldAnalyzeUnstaged: shouldAnalyzeStaged ?? false,
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
  const { logger, reporter } = services;
  const { analysisController, securityController, aiController } = controllers;
  const { filesToAnalyze } = context;

  // Initialize security result
  let securityResult: SecurityCheckResult = {
    secretFindings: [],
    fileFindings: [],
    filesToUnstage: [],
    shouldBlock: false,
    commands: [],
  };

  // Security checks first (if not skipped)
  if (!options.skipSecurity) {
    logger.info("\n🔒 Running security checks...");

    // Filter ignored files first
    const nonIgnoredFiles = filesToAnalyze.filter(
      (file) =>
        !shouldIgnoreFile({
          path: file.path,
          patterns: services.config.git?.ignorePatterns || [],
          logger: services.logger,
        }),
    );

    if (nonIgnoredFiles.length === 0) {
      logger.info("✓ No files to check after applying ignore patterns");
    } else {
      logger.info(
        `Analyzing ${nonIgnoredFiles.length} files (${filesToAnalyze.length - nonIgnoredFiles.length} ignored)`,
      );

      securityResult = await securityController.analyzeSecurity({
        files: nonIgnoredFiles,
        shouldAnalyzeStaged: context.shouldAnalyzeStaged,
      });

      if (
        securityResult.secretFindings.length > 0 ||
        securityResult.fileFindings.length > 0
      ) {
        logger.info("\n⚠️  Security issues found - handling concerns...");
        await securityController.handleSecurityIssues({ securityResult });
      }
    }
  } else {
    logger.debug("Security checks skipped via --skip-security flag");
  }

  // Initial analysis
  logger.info("\n🔍 Analyzing changes...");
  let result = await analysisController.analyzeChanges({
    files: filesToAnalyze,
    message: options.message ?? "",
    enablePrompts: true,
    securityResult,
  });

  // Display initial analysis results
  logger.info("\n📊 Initial Analysis Report");
  analysisController.displayAnalysisResults(result);
  reporter.generateReport({ result, options: {} });

  // If commit is complex and AI is requested but not available
  if (options.ai && !services.ai && result.complexity.needsStructure) {
    logger.warn(
      "\n⚠️  AI assistance requested but no valid AI provider configured",
    );
    logger.info(
      "💡 To enable AI, configure a provider in your .gitguard/config.json or environment variables",
    );
  }

  // If commit is complex and AI is available
  else if (options.ai && services.ai && result.complexity.needsStructure) {
    const shouldUseAI = await promptYesNo({
      message:
        "\n🤖 Would you like AI assistance to split this complex commit?",
      logger,
      defaultValue: false,
    });

    if (shouldUseAI) {
      logger.info("\n🔄 Analyzing commit structure with AI...");
      result = await aiController.handleSplitSuggestions({
        result,
        files: filesToAnalyze,
        message: options.message,
        securityResult,
        enableAI: options.ai,
      });
    }
  }

  // Handle general AI suggestions if enabled
  if (options.ai) {
    result = await aiController.handleAISuggestions({
      result,
      files: filesToAnalyze,
      message: options.message,
      shouldExecute: options.execute,
    });
  }

  // Final report after all modifications
  logger.info("\n📊 Final Analysis Report");
  // Only show essential information, skip the detailed analysis
  if (result.formattedMessage) {
    logger.info(`\nCommit Message:
Original: ${result.originalMessage}
Formatted: ${result.formattedMessage}

✅ No issues detected`);
  }

  // Handle commit execution
  if (options.execute && result.formattedMessage) {
    logger.info("\n💾 Creating commit...");
    if (result.formattedMessage !== result.originalMessage) {
      const shouldProceed = await promptYesNo({
        message: `\nCommit message will be changed from:
${chalk.red(`"${result.originalMessage}"`)}
to:
${chalk.green(`"${result.formattedMessage}"`)}

Proceed with formatted message?`,
        logger,
        defaultValue: true,
      });

      if (!shouldProceed) {
        logger.info("\n⚠️ Commit cancelled by user");
        return result;
      }
    }

    await analysisController.executeCommit({
      message: result.formattedMessage,
    });
  }

  return result;
}

export async function analyzeCommit({
  options,
}: CommitAnalyzeParams): Promise<CommitAnalysisResult> {
  const services = await initializeServices(options);
  const { logger } = services;

  try {
    logger.info("\n🎯 Starting commit analysis...");
    const controllers = initializeControllers(services);
    const context = await getAnalysisContext(options, services);
    const { filesToAnalyze } = context;

    if (filesToAnalyze.length === 0) {
      logger.info("\n⚠️  No files to analyze");
      return controllers.analysisController.getEmptyAnalysisResult(context);
    }

    const result = await handleAnalysis(
      options,
      context,
      controllers,
      services,
    );

    logger.info("\n✨ Analysis complete!");
    return result;
  } catch (error) {
    logger.error("\n❌ Commit analysis failed:", error);
    logger.debug("Full analysis error details:", error);
    throw error;
  }
}
