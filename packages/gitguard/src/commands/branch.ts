import { PRService } from "../services/pr.service.js";
import { AIFactory } from "../services/factories/ai.factory.js";
import { GitService } from "../services/git.service.js";
import { LoggerService } from "../services/logger.service.js";
import { ReporterService } from "../services/reporter.service.js";
import { SecurityService } from "../services/security.service.js";
import { PRAnalysisResult } from "../types/analysis.types.js";
import { loadConfig } from "../utils/config.util.js";
import chalk from "chalk";
import { generatePRDescriptionPrompt } from "../utils/ai-prompt.util.js";
import { promptAIAction } from "../utils/user-prompt.util.js";
import { copyToClipboard } from "../utils/clipboard.util.js";

interface BranchAnalyzeParams {
  options: {
    name?: string;
    pr?: string | number;
    format?: "console" | "json" | "markdown";
    color?: boolean;
    detailed?: boolean;
    ai?: boolean;
    debug?: boolean;
    configPath?: string;
  };
}

export async function analyzeBranch({
  options,
}: BranchAnalyzeParams): Promise<PRAnalysisResult> {
  const logger = new LoggerService({ debug: options.debug });
  const reporter = new ReporterService({ logger });

  try {
    const config = await loadConfig({ configPath: options.configPath });
    const git = new GitService({
      config: {
        ...config.git,
        baseBranch: config.git?.baseBranch || "main",
      },
      logger,
    });
    const security = new SecurityService({ config, logger });
    const ai =
      (options.ai ?? config.ai?.enabled)
        ? AIFactory.create({
            config: {
              ...config,
            },
            logger,
          })
        : undefined;

    const prService = new PRService({
      config,
      git,
      security,
      ai,
      logger,
    });

    // Get branch to analyze
    const currentBranch = await git.getCurrentBranch();
    const branchToAnalyze = options.name || currentBranch;
    const baseBranch = git.config.baseBranch;

    logger.info("\n📊 Analyzing branch:", chalk.cyan(branchToAnalyze));
    logger.info("Base branch:", chalk.cyan(baseBranch));

    // Get branch analysis
    let result = await prService.analyze({
      branch: branchToAnalyze,
      enableAI: Boolean(options.ai),
      enablePrompts: true,
    });

    // Show analysis results
    if (result.warnings.length > 0) {
      logger.info(`\n${chalk.yellow("⚠️")} Analysis found some concerns:`);
      result.warnings.forEach((warning) => {
        logger.info(`  ${chalk.dim("•")} ${chalk.yellow(warning.message)}`);
      });
    } else {
      logger.info("\n✅ Analysis completed successfully!");
      logger.info(chalk.green("No issues detected."));
    }

    // Show branch stats
    logger.info("\n📈 Branch Statistics:");
    logger.info(
      `  ${chalk.dim("•")} Commits: ${chalk.cyan(result.stats.totalCommits)}`,
    );
    logger.info(
      `  ${chalk.dim("•")} Files Changed: ${chalk.cyan(result.stats.filesChanged)}`,
    );
    logger.info(
      `  ${chalk.dim("•")} Additions: ${chalk.green(`+${result.stats.additions}`)}`,
    );
    logger.info(
      `  ${chalk.dim("•")} Deletions: ${chalk.red(`-${result.stats.deletions}`)}`,
    );
    logger.info(
      `  ${chalk.dim("•")} Authors: ${chalk.cyan(result.stats.authors.join(", "))}`,
    );

    // Show files by directory if detailed
    if (options.detailed && Object.keys(result.filesByDirectory).length > 0) {
      logger.info("\n📁 Files by Directory:");
      Object.entries(result.filesByDirectory).forEach(([directory, files]) => {
        logger.info(`  ${chalk.cyan(directory)}:`);
        files.forEach((file) => {
          logger.info(`    ${chalk.dim("•")} ${file}`);
        });
      });
    }

    // Generate and display the report
    reporter.generateReport({
      result,
      options: {
        format: options.format || "console",
        color: options.color,
        detailed: options.detailed,
      },
    });

    // Show split suggestions if any
    if (result.splitSuggestion) {
      logger.info(`\n${chalk.yellow("📦")} Branch Split Suggestion:`);
      logger.info(chalk.yellow(result.splitSuggestion.reason));

      result.splitSuggestion.suggestedPRs.forEach((pr, index) => {
        logger.info(
          `\n${chalk.bold.green(`${index + 1}.`)} ${chalk.bold(pr.title)}`,
        );
        logger.info(`   ${chalk.dim("Description:")} ${pr.description}`);
        logger.info(`   ${chalk.dim("Files:")}`);
        pr.files.forEach((file) => {
          logger.info(`     ${chalk.dim("•")} ${chalk.gray(file.path)}`);
        });
      });

      logger.info("\n📋 Commands to split branch:");
      result.splitSuggestion.commands.forEach((command) => {
        logger.info(`  ${chalk.dim("•")} ${chalk.cyan(command)}`);
      });
    }

    // Handle AI suggestions if enabled
    if (options.ai && ai) {
      logger.info("\n🤖 Preparing AI suggestions...");
      const prompt = generatePRDescriptionPrompt({
        commits: result.commits,
        stats: result.stats,
        files: result.commits.flatMap((c) => c.files),
        baseBranch,
        template: "",
      });

      const tokenUsage = ai.calculateTokenUsage({ prompt });
      logger.info(
        `\n💰 ${chalk.cyan("Estimated cost for AI generation:")} ${chalk.bold(tokenUsage.estimatedCost)}`,
      );
      logger.info(
        `📊 ${chalk.cyan("Estimated tokens:")} ${chalk.bold(tokenUsage.count)}`,
      );

      const aiPromptResult = await promptAIAction({
        logger,
        tokenUsage,
      });

      switch (aiPromptResult.action) {
        case "generate": {
          logger.info("\nGenerating AI suggestions...");
          result = await prService.analyze({
            branch: branchToAnalyze,
            enableAI: true,
            enablePrompts: true,
          });
          break;
        }

        case "copy": {
          await copyToClipboard({
            text: prompt,
            logger,
          });
          logger.info("\n✅ AI prompt copied to clipboard!");
          break;
        }

        case "skip":
          logger.info("\n⏭️  Skipping AI suggestions");
          break;
      }
    }

    return result;
  } catch (error) {
    logger.error(`\n${chalk.red("❌")} Branch analysis failed:`, error);
    throw error;
  }
}
