import chalk from "chalk";
import { AIFactory } from "../services/factories/ai.factory.js";
import { GitService } from "../services/git.service.js";
import { LoggerService } from "../services/logger.service.js";
import { PRService } from "../services/pr.service.js";
import { ReporterService } from "../services/reporter.service.js";
import { SecurityService } from "../services/security.service.js";
import { PRAnalysisResult } from "../types/analysis.types.js";
import { generatePRDescriptionPrompt } from "../utils/ai-prompt.util.js";
import { loadConfig } from "../utils/config.util.js";
import { promptNumeric, promptYesNo } from "../utils/user-prompt.util.js";
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
    logger.debug("Starting branch analysis with options:", options);
    const config = await loadConfig({ configPath: options.configPath });
    logger.debug("Loaded config:", config);

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

    logger.debug("Initialized services:", {
      git: !!git,
      security: !!security,
      ai: !!ai,
    });

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

    logger.debug("Branch analysis context:", {
      currentBranch,
      branchToAnalyze,
      baseBranch,
    });

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
      logger.debug("Starting AI suggestion flow");
      logger.info("\n🤖 AI Assistant Options:");
      logger.info("1. Generate PR title and description");
      logger.info("2. Suggest branch name improvements");
      logger.info("3. Review changes and suggest improvements");
      logger.info("4. Skip AI assistance");

      const answer = await promptNumeric({
        message: "\nChoose an option (1-4):",
        allowEmpty: false,
        logger,
      });

      const choice = parseInt(answer ?? "0", 10);
      logger.debug("User selected AI option:", choice);

      // Early return if user chooses to skip
      if (choice === 4 || choice < 1 || choice > 4) {
        logger.debug("User chose to skip AI suggestions");
        logger.info("\n⏭️  Skipping AI suggestions");
        return result;
      }

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

      const shouldProceed = await promptYesNo({
        message: "Would you like to proceed with AI generation?",
        logger,
        defaultValue: true,
      });

      if (!shouldProceed) {
        logger.debug("User chose not to proceed with AI generation");
        logger.info("\n⏭️  Skipping AI suggestions");
        return result;
      }

      logger.info("\nGenerating AI suggestions...");
      result = await prService.analyze({
        branch: branchToAnalyze,
        enableAI: true,
        enablePrompts: true,
        aiMode: choice === 1 ? "pr" : choice === 2 ? "branch" : "review",
      });

      // Display AI suggestions based on mode
      if (choice === 1 && result.description) {
        // PR title and description mode
        logger.info("\n🤖 Generated PR Description:");
        logger.info(`\n${chalk.bold("Title:")} ${result.description.title}`);
        logger.info(
          `\n${chalk.dim("Description:")}\n${result.description.description}`,
        );

        // Offer to copy to clipboard
        const shouldCopy = await promptYesNo({
          message: "\nWould you like to copy this to clipboard?",
          logger,
          defaultValue: true,
        });

        if (shouldCopy) {
          await copyToClipboard({
            text: `${result.description.title}\n\n${result.description.description}`,
            logger,
          });
          logger.info("\n✅ Copied to clipboard!");
        }
      } else if (choice === 2 && result.suggestedTitle) {
        // Branch name improvement mode
        logger.info("\n🤖 Branch Name Suggestion:");
        logger.info(`${chalk.bold("Current:")} ${branchToAnalyze}`);
        logger.info(`${chalk.bold("Suggested:")} ${result.suggestedTitle}`);

        if (result.description?.explanation) {
          logger.info(
            `\n${chalk.dim("Explanation:")} ${result.description.explanation}`,
          );
        }

        const shouldRename = await promptYesNo({
          message: `\nWould you like to rename the branch to "${result.suggestedTitle}"?`,
          logger,
          defaultValue: false,
        });

        if (shouldRename) {
          await git.renameBranch({
            from: branchToAnalyze,
            to: result.suggestedTitle,
          });
          logger.info(
            `\n✅ Branch renamed to: ${chalk.cyan(result.suggestedTitle)}`,
          );
        }
      } else if (choice === 3 && result.aiSuggestions?.length) {
        // Review mode
        logger.info("\n🤖 AI Review Suggestions:");
        result.aiSuggestions.forEach((suggestion, index) => {
          logger.info(
            `\n${chalk.bold.green(`${index + 1}.`)} ${chalk.bold(suggestion.title)}`,
          );
          if (suggestion.description) {
            logger.info(
              `   ${chalk.dim("Description:")} ${suggestion.description}`,
            );
          }
          if (suggestion.explanation) {
            logger.info(
              `   ${chalk.dim("Explanation:")} ${suggestion.explanation}`,
            );
          }
        });
      } else {
        logger.info("\n❌ No AI suggestions were generated.");
      }
    }

    logger.debug("Branch analysis completed successfully");
    return result;
  } catch (error) {
    logger.error(`\n${chalk.red("❌")} Branch analysis failed:`, error);
    logger.debug("Full error details:", error);
    throw error;
  }
}
