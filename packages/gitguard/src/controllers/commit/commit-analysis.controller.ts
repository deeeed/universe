import { CommitCommandOptions } from "../../commands/commit.js";
import { GitService } from "../../services/git.service.js";
import { Logger } from "../../types/logger.types.js";
import { FileChange } from "../../types/git.types.js";
import { Config } from "../../types/config.types.js";
import { CommitService } from "../../services/commit.service.js";
import { SecurityCheckResult } from "../../types/security.types.js";
import { CommitAnalysisResult } from "../../types/analysis.types.js";
import chalk from "chalk";
import { AIProvider } from "../../types/ai.types.js";

interface CommitAnalysisControllerParams {
  logger: Logger;
  git: GitService;
  config: Config;
  ai?: AIProvider;
}

interface GetFilesToAnalyzeParams {
  options: CommitCommandOptions;
  stagedFiles: FileChange[];
  unstagedFiles: FileChange[];
}

interface GetFilesToAnalyzeResult {
  filesToAnalyze: FileChange[];
  shouldAnalyzeStaged: boolean;
  shouldAnalyzeUnstaged: boolean;
}

interface AnalyzeChangesParams {
  files: FileChange[];
  message: string;
  enableAI: boolean;
  enablePrompts: boolean;
  securityResult: SecurityCheckResult;
}

export class CommitAnalysisController {
  private readonly logger: Logger;
  private readonly git: GitService;
  private readonly commitService: CommitService;

  constructor({ logger, git, config, ai }: CommitAnalysisControllerParams) {
    this.logger = logger;
    this.git = git;
    this.commitService = new CommitService({
      config,
      git,
      logger,
      ai,
    });
  }

  getFilesToAnalyze({
    options,
    stagedFiles,
    unstagedFiles,
  }: GetFilesToAnalyzeParams): GetFilesToAnalyzeResult {
    const shouldAnalyzeStaged = options.all || options.staged !== false;
    const shouldAnalyzeUnstaged = options.all || options.unstaged === true;

    const filesToAnalyze = [
      ...(shouldAnalyzeStaged ? stagedFiles : []),
      ...(shouldAnalyzeUnstaged ? unstagedFiles : []),
    ];

    if (filesToAnalyze.length > 0) {
      this.logger.info("\n📂 Analyzing changes:");
      if (shouldAnalyzeStaged && stagedFiles.length > 0) {
        this.logger.info(
          `  ${chalk.dim("•")} ${chalk.cyan(`${stagedFiles.length} staged files`)}`,
        );
      }
      if (shouldAnalyzeUnstaged && unstagedFiles.length > 0) {
        this.logger.info(
          `  ${chalk.dim("•")} ${chalk.yellow(`${unstagedFiles.length} unstaged files`)}`,
        );
      }
    } else {
      this.logger.info("\n⚠️  No files to analyze");
    }

    return {
      filesToAnalyze,
      shouldAnalyzeStaged,
      shouldAnalyzeUnstaged,
    };
  }

  getEmptyAnalysisResult({
    currentBranch,
    baseBranch,
  }: {
    currentBranch: string;
    baseBranch: string;
  }): CommitAnalysisResult {
    return {
      branch: currentBranch,
      originalMessage: "",
      baseBranch,
      formattedMessage: "",
      stats: {
        filesChanged: 0,
        additions: 0,
        deletions: 0,
      },
      warnings: [],
      complexity: {
        score: 0,
        reasons: [],
        needsStructure: false,
      },
    };
  }

  async analyzeChanges({
    files,
    message,
    enableAI,
    enablePrompts,
    securityResult,
  }: AnalyzeChangesParams): Promise<CommitAnalysisResult> {
    return this.commitService.analyze({
      files,
      message,
      enableAI,
      enablePrompts,
      securityResult,
    });
  }

  async executeCommit({ message }: { message: string }): Promise<void> {
    this.logger.info("\n📝 Creating commit...");
    try {
      await this.git.createCommit({ message });
      this.logger.info(chalk.green("✅ Commit created successfully!"));
    } catch (error) {
      this.logger.error(chalk.red("❌ Failed to create commit:"), error);
      throw error;
    }
  }

  displayAnalysisResults(result: CommitAnalysisResult): void {
    if (result.warnings.length > 0) {
      this.logger.info(`\n${chalk.yellow("⚠️")} Analysis found some concerns:`);
      result.warnings.forEach((warning) => {
        this.logger.info(
          `  ${chalk.dim("•")} ${chalk.yellow(warning.message)}`,
        );
      });
    } else {
      this.logger.info("\n✅ Analysis completed successfully!");
      this.logger.info(chalk.green("No issues detected."));
    }
  }
}
