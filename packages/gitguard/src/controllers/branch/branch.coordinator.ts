import { BranchCommandOptions } from "../../commands/branch.js";
import { AIFactory } from "../../services/factories/ai.factory.js";
import { GitService } from "../../services/git.service.js";
import { GitHubService } from "../../services/github.service.js";
import { LoggerService } from "../../services/logger.service.js";
import { PRService } from "../../services/pr.service.js";
import { ReporterService } from "../../services/reporter.service.js";
import { SecurityService } from "../../services/security.service.js";
import { AIProvider } from "../../types/ai.types.js";
import { PRAnalysisResult } from "../../types/analysis.types.js";
import { Config, GitConfig } from "../../types/config.types.js";
import { loadConfig } from "../../utils/config.util.js";
import { BranchAIController } from "./branch-ai.controller.js";
import { BranchAnalysisController } from "./branch-analysis.controller.js";
import { BranchPRController } from "./branch-pr.controller.js";
import { BranchSecurityController } from "./branch-security.controller.js";

interface BranchAnalyzeParams {
  options: BranchCommandOptions;
}

interface ServicesContext {
  logger: LoggerService;
  reporter: ReporterService;
  git: GitService;
  github: GitHubService;
  security: SecurityService;
  ai?: AIProvider;
  prService: PRService;
  config: Config;
}

interface ControllersContext {
  analysisController: BranchAnalysisController;
  aiController: BranchAIController;
  prController: BranchPRController;
  securityController: BranchSecurityController;
}

async function initializeServices(
  options: BranchCommandOptions,
): Promise<ServicesContext> {
  const isDebug = options.debug || process.env.GITGUARD_DEBUG === "true";
  const logger = new LoggerService({ debug: isDebug });
  const reporter = new ReporterService({ logger });

  logger.info("\n🚀 Initializing GitGuard services...");

  const config = await loadConfig({ configPath: options.configPath });
  const gitConfig: GitConfig = {
    ...config.git,
    github: config.git.github,
    baseBranch: config.git.baseBranch || "main",
    monorepoPatterns: config.git.monorepoPatterns || [],
  };

  const git = new GitService({ gitConfig, logger });
  const github = new GitHubService({ config, logger, git });

  const security = new SecurityService({ config, logger });

  const ai = options.ai ? AIFactory.create({ config, logger }) : undefined;

  const prService = new PRService({
    config,
    logger,
    git,
    github,
    security,
    ai,
  });

  logger.debug("Services initialized successfully");
  return { logger, reporter, git, github, security, ai, prService, config };
}

function initializeControllers(services: ServicesContext): ControllersContext {
  const { logger, git, github, prService, config, ai, security } = services;

  return {
    analysisController: new BranchAnalysisController({
      logger,
      git,
      github,
      config,
      prService,
    }),
    aiController: new BranchAIController({
      logger,
      ai,
      git,
      prService,
      github,
      config,
    }),
    prController: new BranchPRController({
      logger,
      git,
      github,
      prService,
      config,
    }),
    securityController: new BranchSecurityController({
      logger,
      security,
      git,
    }),
  };
}

export async function analyzeBranch({
  options,
}: BranchAnalyzeParams): Promise<PRAnalysisResult> {
  const services = await initializeServices(options);
  const { logger, reporter } = services;

  try {
    logger.info("\n🎯 Starting branch analysis...");
    const controllers = initializeControllers(services);

    // Get branch context
    const currentBranch = await services.git.getCurrentBranch();
    const branchToAnalyze = options.name ?? currentBranch;
    const baseBranch = services.config.git.baseBranch;

    logger.debug("Branch analysis context:", {
      currentBranch,
      branchToAnalyze,
      baseBranch,
    });

    // Analyze branch
    let analysisResult = await controllers.analysisController.analyzeBranch({
      branchToAnalyze,
      enableAI: Boolean(options.ai),
    });

    // Add security checks
    logger.info("\n🔒 Running security checks...");
    const securityResult = controllers.securityController.analyzeSecurity({
      result: analysisResult,
    });

    if (
      securityResult.secretFindings.length > 0 ||
      securityResult.fileFindings.length > 0
    ) {
      await controllers.securityController.handleSecurityIssues({
        securityResult,
      });
    }

    // Generate report
    reporter.generateReport({
      result: analysisResult,
      options: {
        detailed: options.detailed ?? false,
      },
    });

    // Handle AI suggestions if enabled
    if (options.ai && services.ai) {
      // Skip GitHub validation for analysis-only operations
      const needsGitHubAccess = options.createPR || options.draft;

      if (needsGitHubAccess) {
        // For PR creation, validate GitHub access first
        const hasGitHubAccess =
          await controllers.prController.validateGitHubAccess();
        if (hasGitHubAccess) {
          analysisResult = await controllers.aiController.handleAISuggestions({
            analysisResult,
          });

          // Create/update PR after AI suggestions
          analysisResult = await controllers.prController.createPullRequest({
            options,
            analysisResult,
            branchToAnalyze,
          });
        }
      } else {
        // For analyze command, generate AI suggestions without GitHub validation
        analysisResult = await controllers.aiController.handleAISuggestions({
          analysisResult,
        });
      }
    } else if (options.createPR || options.draft) {
      // Handle PR creation without AI
      const hasGitHubAccess =
        await controllers.prController.validateGitHubAccess();
      if (hasGitHubAccess) {
        analysisResult = await controllers.prController.createPullRequest({
          options,
          analysisResult,
          branchToAnalyze,
        });
      }
    }

    controllers.securityController.displaySecuritySummary(securityResult);

    logger.debug("Branch analysis completed successfully");
    return analysisResult;
  } catch (error) {
    logger.error(`\n❌ Branch analysis failed:`, error);
    logger.debug("Full analysis error details:", error);
    throw error;
  }
}
