import chalk from "chalk";
import { CommitCommandOptions } from "../../commands/commit.js";
import { GitService } from "../../services/git.service.js";
import { LoggerService } from "../../services/logger.service.js";
import { ReporterService } from "../../services/reporter.service.js";
import { SecurityService } from "../../services/security.service.js";
import { TemplateRegistry } from "../../services/template/template-registry.js";
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
import { CommitSplitController } from "./commit-split.controller.js";

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
  aiController: CommitAIController;
  splitController: CommitSplitController;
  securityController: CommitSecurityController;
}

interface AnalysisContext {
  filesToAnalyze: FileChange[];
  shouldAnalyzeStaged: boolean;
  shouldAnalyzeUnstaged: boolean;
  currentBranch: string;
  baseBranch: string;
}

interface HandleSecurityParams {
  options: CommitCommandOptions;
  filesToAnalyze: FileChange[];
  services: ServicesContext;
  controllers: ControllersContext;
  context: AnalysisContext;
}

interface HandleAIAnalysisParams {
  result: CommitAnalysisResult & { securityResult?: SecurityCheckResult };
  options: CommitCommandOptions;
  filesToAnalyze: FileChange[];
  services: ServicesContext;
  controllers: ControllersContext;
}

interface HandleCommitExecutionParams {
  result: CommitAnalysisResult;
  options: CommitCommandOptions;
  controllers: ControllersContext;
  services: ServicesContext;
}

async function initializeServices(
  options: CommitCommandOptions,
): Promise<ServicesContext> {
  const logger = new LoggerService({
    debug: options.debug ?? process.env.GITGUARD_DEBUG === "true",
  });
  logger.info("\n🚀 Initializing GitGuard services...");

  logger.debug("🔍 Loading config from:", options.configPath);
  const reporter = new ReporterService({ logger });
  const config = await loadConfig({ configPath: options.configPath });

  logger.debug("🔍 Loaded config:", config);

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

  const isAIEnabled =
    options.ai === undefined
      ? (config.ai?.enabled ?? false)
      : (options.ai ?? true);
  const ai = initializeAI({ config, logger, isAIRequested: isAIEnabled });

  logger.info("✅ Services initialized successfully");
  return { logger, reporter, git, security, ai, config };
}

async function initializeControllers(
  services: ServicesContext,
): Promise<ControllersContext> {
  const { logger, git, security, config, ai } = services;

  const templateRegistry = new TemplateRegistry({
    logger,
    gitRoot: git.getCWD(),
  });

  await templateRegistry.loadTemplates({ includeDefaults: true });

  return {
    analysisController: new CommitAnalysisController({
      logger,
      git,
      config,
    }),
    securityController: new CommitSecurityController({ logger, security, git }),
    aiController: new CommitAIController({
      logger,
      ai,
      git,
      config,
      templateRegistry,
    }),
    splitController: new CommitSplitController({
      logger,
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
    options.all ?? options.staged ?? (!options.unstaged && !options.all);
  const shouldAnalyzeUnstaged = options.all ?? options.unstaged;

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

async function handleSecurityChecks({
  options,
  filesToAnalyze,
  services,
  controllers,
  context,
}: HandleSecurityParams): Promise<SecurityCheckResult> {
  const { logger } = services;

  if (options.skipSecurity) {
    logger.debug("Security checks skipped via --skip-security flag");
    return {
      secretFindings: [],
      fileFindings: [],
      filesToUnstage: [],
      shouldBlock: false,
      commands: [],
    };
  }

  logger.info("\n🔒 Running security checks...");
  const nonIgnoredFiles = filesToAnalyze.filter(
    (file) =>
      !shouldIgnoreFile({
        path: file.path,
        patterns: services.config.git?.ignorePatterns ?? [],
        logger: services.logger,
      }),
  );

  if (nonIgnoredFiles.length === 0) {
    logger.info("✓ No files to check after applying ignore patterns");
    return {
      secretFindings: [],
      fileFindings: [],
      filesToUnstage: [],
      shouldBlock: false,
      commands: [],
    };
  }

  logger.info(
    `Analyzing ${nonIgnoredFiles.length} files (${filesToAnalyze.length - nonIgnoredFiles.length} ignored)`,
  );
  const securityResult = await controllers.securityController.analyzeSecurity({
    files: nonIgnoredFiles,
    shouldAnalyzeStaged: context.shouldAnalyzeStaged,
  });

  if (
    securityResult.secretFindings.length > 0 ||
    securityResult.fileFindings.length > 0
  ) {
    logger.info("\n⚠️  Security issues found - handling concerns...");
    await controllers.securityController.handleSecurityIssues({
      securityResult,
    });
  }

  return securityResult;
}

async function handleAIAnalysis({
  result,
  options,
  filesToAnalyze,
  services,
  controllers,
}: HandleAIAnalysisParams): Promise<CommitAnalysisResult> {
  const { logger } = services;
  let updatedResult = result;

  if (updatedResult.skipFurtherSuggestions) {
    logger.debug("Skipping AI analysis due to skipFurtherSuggestions flag");
    return updatedResult;
  }

  if (result.complexity.needsStructure || options.split) {
    logger.info("\n🔄 Analyzing commit structure with AI...");
    const securityResult: SecurityCheckResult = result.securityResult ?? {
      secretFindings: [],
      fileFindings: [],
      filesToUnstage: [],
      shouldBlock: false,
      commands: [],
    };

    updatedResult = await controllers.aiController.handleSplitSuggestions({
      result: updatedResult,
      files: filesToAnalyze,
      message: options.message,
      securityResult,
      enableAI: true,
    });

    if (updatedResult.skipFurtherSuggestions) {
      logger.info(
        "\n✨ Analysis complete - please use the copied suggestions to split your commits.",
      );
      return {
        ...updatedResult,
        formattedMessage: updatedResult.originalMessage,
      };
    }
  }

  if (!updatedResult.skipFurtherSuggestions) {
    logger.debug("Proceeding with AI suggestions handling", {
      hasFormattedMessage: !!updatedResult.formattedMessage,
      willExecute: options.execute,
    });

    return controllers.aiController.handleAISuggestions({
      result: updatedResult,
      files: filesToAnalyze,
      message: options.message,
      shouldExecute: options.execute,
    });
  }

  return updatedResult;
}

async function handleCommitExecution({
  result,
  options,
  controllers,
  services,
}: HandleCommitExecutionParams): Promise<void> {
  const { logger } = services;

  if (
    result.skipFurtherSuggestions ??
    result.formattedMessage === result.originalMessage
  ) {
    logger.debug("Skipping commit execution:", {
      skipFurtherSuggestions: result.skipFurtherSuggestions,
      messageUnchanged: result.formattedMessage === result.originalMessage,
    });
    return;
  }

  logger.debug("Checking commit execution conditions:", {
    shouldExecute: options.execute,
    hasFormattedMessage: !!result.formattedMessage,
  });

  if (!options.execute || !result.formattedMessage) {
    logger.debug("Skipping commit execution:", {
      reason: !options.execute
        ? "execute flag not set"
        : "no formatted message",
    });
    return;
  }

  logger.info("\n💾 Creating commit...");
  if (result.formattedMessage === result.originalMessage) {
    logger.debug("Executing commit with unchanged message");
    await controllers.analysisController.executeCommit({
      message: result.formattedMessage,
    });
    return;
  }

  const shouldProceed = await promptYesNo({
    message: `\nCommit message will be changed from:
${chalk.red(`"${result.originalMessage}"`)}
to:
${chalk.green(`"${result.formattedMessage}"`)}

Proceed with formatted message?`,
    logger,
    defaultValue: true,
  });

  logger.debug("User decision for commit execution:", {
    shouldProceed,
    originalMessage: result.originalMessage,
    formattedMessage: result.formattedMessage,
  });

  if (!shouldProceed) {
    logger.info("\n⚠️ Commit cancelled by user");
    return;
  }

  await controllers.analysisController.executeCommit({
    message: result.formattedMessage,
  });
}

async function handleAnalysis(
  options: CommitCommandOptions,
  context: AnalysisContext,
  controllers: ControllersContext,
  services: ServicesContext,
): Promise<CommitAnalysisResult> {
  const { logger, reporter } = services;
  const { analysisController, splitController } = controllers;
  const { filesToAnalyze } = context;

  const securityResult = await handleSecurityChecks({
    options,
    filesToAnalyze,
    services,
    controllers,
    context,
  });

  logger.info("\n🔍 Analyzing changes...");
  let result = await analysisController.analyzeChanges({
    files: filesToAnalyze,
    message: options.message ?? "",
    enablePrompts: true,
    securityResult,
  });

  logger.info("\n📊 Initial Analysis Report");
  analysisController.displayAnalysisResults(result);
  reporter.generateReport({ result, options: {} });

  result = await handleAIAnalysis({
    result,
    options,
    filesToAnalyze,
    services,
    controllers,
  });

  logger.debug("AI analysis result:", result);

  // If split was successful, let the split controller handle the execution
  if (result.splitSuggestion) {
    const splitResult = await splitController.handleSplitSuggestion({
      suggestion: result.splitSuggestion,
      originalMessage: options.message ?? "",
      files: filesToAnalyze,
    });

    logger.debug("Split result:", splitResult);
    if (splitResult.success) {
      return {
        ...result,
        skipFurtherSuggestions: true,
      };
    }
  }

  if (result.skipFurtherSuggestions) {
    logger.info(
      "\n✨ Split analysis complete - please use the suggestions to split your commits.",
    );
    return result;
  }

  logger.info("\n📊 Final Analysis Report");
  if (result.formattedMessage) {
    logger.info(`\nCommit Message:
Original: ${result.originalMessage}
Formatted: ${result.formattedMessage}

✅ No issues detected`);
  }

  await handleCommitExecution({ result, options, controllers, services });

  return result;
}

export async function analyzeCommit({
  options,
}: CommitAnalyzeParams): Promise<CommitAnalysisResult> {
  const services = await initializeServices(options);
  const { logger } = services;

  try {
    logger.info("\n🎯 Starting commit analysis...");
    const controllers = await initializeControllers(services);
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
