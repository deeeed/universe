import chalk from "chalk";
import { CommitService } from "../services/commit.service.js";
import { AIFactory } from "../services/factories/ai.factory.js";
import { GitService } from "../services/git.service.js";
import { LoggerService } from "../services/logger.service.js";
import { ReporterService } from "../services/reporter.service.js";
import { SecurityService } from "../services/security.service.js";
import {
  CommitAnalysisResult,
  CommitSuggestion,
} from "../types/analysis.types.js";
import { FileChange } from "../types/git.types.js";
import { Logger } from "../types/logger.types.js";
import { checkAILimits } from "../utils/ai-limits.util.js";
import { generateCommitSuggestionPrompt } from "../utils/ai-prompt.util.js";
import { copyToClipboard } from "../utils/clipboard.util.js";
import { loadConfig } from "../utils/config.util.js";
import { promptAIAction } from "../utils/user-prompt.util.js";

interface CommitAnalyzeParams {
  options: {
    message?: string;
    format?: "console" | "json" | "markdown";
    staged?: boolean;
    unstaged?: boolean;
    all?: boolean;
    ai?: boolean;
    execute?: boolean;
    debug?: boolean;
    configPath?: string;
    cwd?: string;
  };
}

// Extract AI suggestion display logic
function displayAISuggestions(params: {
  suggestions: CommitSuggestion[];
  detectedScope?: string;
  logger: Logger;
}): void {
  const { suggestions, detectedScope, logger } = params;
  const scopeDisplay = detectedScope ? `(${detectedScope})` : "";

  logger.info("\n🤖 AI Suggestions:");
  suggestions.forEach((suggestion, index) => {
    const formattedTitle = `${suggestion.type}${scopeDisplay}: ${suggestion.title}`;

    logger.info(
      `\n${chalk.bold.green(`${index + 1}.`)} ${chalk.bold(formattedTitle)}`,
    );
    if (suggestion.message) {
      suggestion.message.split("\n").forEach((paragraph) => {
        logger.info(`   ${chalk.gray(paragraph)}`);
      });
    }
  });
}

// Extract commit execution logic
async function executeCommit(params: {
  suggestion: CommitSuggestion;
  detectedScope?: string;
  git: GitService;
  logger: Logger;
}): Promise<void> {
  const { suggestion, detectedScope, git, logger } = params;
  const scopeDisplay = detectedScope ? `(${detectedScope})` : "";
  const commitMessage = `${suggestion.type}${scopeDisplay}: ${suggestion.title}${
    suggestion.message ? `\n\n${suggestion.message}` : ""
  }`;

  logger.info("\n📝 Creating commit with selected message...");
  try {
    await git.createCommit({ message: commitMessage });
    logger.info(chalk.green("✅ Commit created successfully!"));
  } catch (error) {
    logger.error(chalk.red("❌ Failed to create commit:"), error);
    throw error;
  }
}

// Extract suggestion selection logic
async function selectAISuggestion(params: {
  suggestions: CommitSuggestion[];
  logger: Logger;
}): Promise<CommitSuggestion | undefined> {
  const { suggestions, logger } = params;
  const readline = await import("readline/promises");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  logger.info(
    `\n📝 ${chalk.yellow("Select a suggestion to commit")} (${chalk.cyan(`1-${suggestions.length}`)}):`,
  );

  const answer = await rl.question("Enter number (or press enter to skip): ");
  rl.close();

  const selection = parseInt(answer, 10);
  return selection > 0 && selection <= suggestions.length
    ? suggestions[selection - 1]
    : undefined;
}

export async function analyzeCommit({
  options,
}: CommitAnalyzeParams): Promise<CommitAnalysisResult> {
  const logger = new LoggerService({ debug: options.debug });
  const reporter = new ReporterService({ logger });

  try {
    const config = await loadConfig({ configPath: options.configPath });

    // Override config cwd if provided in options
    if (options.cwd) {
      config.git.cwd = options.cwd;
    }

    const git = new GitService({
      gitConfig: {
        ...config.git,
        baseBranch: config.git?.baseBranch ?? "main",
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

    // Get changes based on options
    const stagedFiles = await git.getStagedChanges();
    const unstagedFiles = await git.getUnstagedChanges();
    const currentBranch = await git.getCurrentBranch();
    const baseBranch = git.config.baseBranch;

    // Determine what to analyze based on options
    const shouldAnalyzeStaged = options.all || options.staged !== false;
    const shouldAnalyzeUnstaged = options.all || options.unstaged === true;

    // For debugging
    logger.debug("Analysis options:", {
      shouldAnalyzeStaged,
      shouldAnalyzeUnstaged,
      stagedFiles: stagedFiles.length,
      unstagedFiles: unstagedFiles.length,
      options,
    });

    // Combine files based on what should be analyzed
    const filesToAnalyze = [
      ...(shouldAnalyzeStaged ? stagedFiles : []),
      ...(shouldAnalyzeUnstaged ? unstagedFiles : []),
    ];

    // Log what we're analyzing
    if (filesToAnalyze.length > 0) {
      logger.info("\n📂 Analyzing changes:");
      if (shouldAnalyzeStaged && stagedFiles.length > 0) {
        logger.info(
          `  ${chalk.dim("•")} ${chalk.cyan(`${stagedFiles.length} staged files`)}`,
        );
      }
      if (shouldAnalyzeUnstaged && unstagedFiles.length > 0) {
        logger.info(
          `  ${chalk.dim("•")} ${chalk.yellow(`${unstagedFiles.length} unstaged files`)}`,
        );
      }
    } else {
      logger.info("\n⚠️  No files to analyze");
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

    const commitService = new CommitService({
      config,
      git,
      security,
      ai,
      logger,
    });

    // Security checks
    const securityDiff = shouldAnalyzeStaged
      ? await git.getStagedDiff()
      : await git.getUnstagedDiff();

    const securityResult = security?.analyzeSecurity({
      files: filesToAnalyze,
      diff: securityDiff,
    });

    // Initial analysis
    let result = await commitService.analyze({
      files: filesToAnalyze,
      message: options.message ?? "",
      enableAI: options.ai ?? false,
      enablePrompts: true,
      securityResult,
    });

    // Handle AI suggestions if enabled
    if (options.ai && ai) {
      logger.info("\n🤖 Preparing AI suggestions...");

      // Compare different diff strategies
      const stagedAiDiff = await git.getStagedDiffForAI();
      const prioritizedDiffs = commitService.getPrioritizedDiffs({
        files: filesToAnalyze,
        diff: stagedAiDiff,
        maxLength: 4000,
      });

      // Compare and select the best diff strategy
      const diffs = [
        {
          name: "staged",
          content: stagedAiDiff,
          score: stagedAiDiff.length > 4000 ? 0 : 1, // Penalize if too long
        },
        {
          name: "prioritized",
          content: prioritizedDiffs,
          score: prioritizedDiffs.length > 0 ? 2 : 0, // Prefer prioritized if available
        },
        {
          name: "files",
          content: filesToAnalyze
            .map((f) => `${f.path} (+${f.additions}/-${f.deletions})`)
            .join("\n"),
          score: 0, // Last resort
        },
      ];

      // Select the best strategy based on score and length
      const bestDiff = diffs.reduce((best, current) => {
        if (current.score > best.score) return current;
        if (
          current.score === best.score &&
          current.content.length < best.content.length
        )
          return current;
        return best;
      }, diffs[0]);

      logger.info(
        `Using ${chalk.cyan(bestDiff.name)} diff strategy (${chalk.bold(bestDiff.content.length)} chars)`,
      );

      const prompt = generateCommitSuggestionPrompt({
        files: filesToAnalyze,
        message: options.message ?? "",
        diff: bestDiff.content,
        logger,
        needsDetailedMessage: result.complexity.needsStructure,
      });

      const tokenUsage = ai.calculateTokenUsage({ prompt });

      logger.info(
        `\n💰 ${chalk.cyan("Estimated cost:")} ${chalk.bold(tokenUsage.estimatedCost)}`,
      );
      logger.info(
        `📊 ${chalk.cyan("Estimated tokens:")} ${chalk.bold(tokenUsage.count)}/${chalk.dim(
          config.ai.maxPromptTokens,
        )}`,
      );
      logger.info(
        `📝 ${chalk.cyan("Prompt size:")} ${chalk.bold(
          Math.round(prompt.length / 1024),
        )}KB (${chalk.bold(prompt.length)} chars)`,
      );

      // Replace the existing token limit check with the new utility
      if (!checkAILimits({ tokenUsage, config, logger })) {
        return result;
      }

      const aiPromptResult = await promptAIAction({
        logger,
        tokenUsage,
      });

      // Only proceed with AI operations if within limits
      switch (aiPromptResult.action) {
        case "generate": {
          logger.info("\nGenerating AI suggestions...");

          const suggestions = await commitService.generateAISuggestions({
            files: filesToAnalyze,
            message: options.message ?? "",
            diff: bestDiff.content,
            needsDetailedMessage: result.complexity.needsStructure,
          });

          if (!suggestions?.length) {
            logger.warn("\n⚠️  No AI suggestions could be generated.");
            return result;
          }

          const detectedScope = commitService.detectScope(filesToAnalyze);
          displayAISuggestions({
            suggestions,
            detectedScope,
            logger,
          });

          if (options.execute) {
            const selectedSuggestion = await selectAISuggestion({
              suggestions,
              logger,
            });

            if (selectedSuggestion) {
              await executeCommit({
                suggestion: selectedSuggestion,
                detectedScope,
                git,
                logger,
              });
            }
          }
          return result;
        }

        case "copy": {
          const prompt = generateCommitSuggestionPrompt({
            files: filesToAnalyze,
            message: options.message ?? "",
            diff: bestDiff.content,
            logger,
            needsDetailedMessage: result.complexity.needsStructure,
          });

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

    // Handle split suggestions
    if (result.splitSuggestion) {
      // Display detected scopes
      result.splitSuggestion.suggestions.forEach((suggestedSplit, index) => {
        logger.info(
          `\n${chalk.bold.green(`${index + 1}.`)} ${chalk.bold.cyan(suggestedSplit.scope ?? "root")}:`,
        );
        logger.info(
          `   ${chalk.dim("Message:")} ${chalk.bold(suggestedSplit.message)}`,
        );
        logger.info(`   ${chalk.dim("Files:")}`);
        suggestedSplit.files.forEach((file) => {
          logger.info(`     ${chalk.dim("•")} ${chalk.gray(file)}`);
        });
      });
      // Create dynamic choices with clearer messaging
      const choices = [
        `${chalk.yellow("0.")} Keep all changes together`,
        ...result.splitSuggestion.suggestions.map(
          (suggestion, index) =>
            `${chalk.green(`${index + 1}.`)} Keep only ${chalk.cyan(suggestion.scope ?? "root")} changes and unstage others`,
        ),
      ];

      logger.info("\n📋 Choose how to proceed:");
      choices.forEach((choice) => logger.info(choice));

      const readline = await import("readline/promises");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await rl.question(
        `\nEnter choice (0-${result.splitSuggestion.suggestions.length}): `,
      );
      rl.close();

      const selection = parseInt(answer, 10);

      // Handle user choice
      if (selection === 0) {
        logger.info(chalk.yellow("\n⏭️  Continuing with all changes..."));
      } else if (
        selection > 0 &&
        selection <= result.splitSuggestion.suggestions.length
      ) {
        const selectedSplit = result.splitSuggestion.suggestions[selection - 1];

        logger.info(
          `\n📦 ${chalk.cyan(`Keeping only ${selectedSplit.scope ?? "root"} changes:`)}`,
        );
        selectedSplit.files.forEach((file) => {
          logger.info(`   ${chalk.dim("•")} ${chalk.gray(file)}`);
        });

        // Unstage files not in the selected scope
        const filesToUnstage = result.splitSuggestion.suggestions
          .filter((_, index) => index + 1 !== selection)
          .flatMap((suggestion) => suggestion.files);

        if (filesToUnstage.length > 0) {
          logger.info(`\n🗑️  ${chalk.yellow("Unstaging other files:")}`);
          filesToUnstage.forEach((file) => {
            logger.info(`   ${chalk.dim("•")} ${chalk.gray(file)}`);
          });

          try {
            await git.unstageFiles({ files: filesToUnstage });
            logger.info(chalk.green("\n✅ Successfully unstaged other files"));

            // Update the analysis result to reflect only the kept files
            const keptFiles = selectedSplit.files
              .map((filePath) =>
                filesToAnalyze.find((f) => f.path === filePath),
              )
              .filter((file): file is FileChange => file !== undefined);

            if (keptFiles.length !== selectedSplit.files.length) {
              logger.debug("Some files were not found in original analysis:", {
                expected: selectedSplit.files,
                found: keptFiles.map((f) => f.path),
              });
            }

            // Use the raw message from the split suggestion
            result = await commitService.analyze({
              files: keptFiles,
              message: selectedSplit.message.replace(
                /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\([^)]+\):\s*/,
                "",
              ), // Remove any existing prefix
              enableAI: false,
              enablePrompts: true,
              securityResult,
            });
          } catch (error) {
            logger.error(chalk.red("\n❌ Failed to unstage files:"), error);
            throw error;
          }
        }
      }
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

      // Generate and display the report
      reporter.generateReport({
        result,
        options: {},
      });

      // Handle commit if option is set
    }

    // Show analysis results if not already shown
    if (!result.splitSuggestion) {
      if (result.warnings.length > 0) {
        logger.info(`\n${chalk.yellow("⚠️")} Analysis found some concerns:`);
        result.warnings.forEach((warning) => {
          logger.info(`  ${chalk.dim("•")} ${chalk.yellow(warning.message)}`);
        });
      } else {
        logger.info("\n✅ Analysis completed successfully!");
        logger.info(chalk.green("No issues detected."));
      }

      // Generate and display the report
      reporter.generateReport({
        result,
        options: {},
      });
    }

    // Execute commit if requested
    if (options.execute && result.formattedMessage) {
      logger.info("\n📝 Creating commit...");
      try {
        await git.createCommit({ message: result.formattedMessage });
        logger.info(chalk.green("✅ Commit created successfully!"));
      } catch (error) {
        logger.error(chalk.red("❌ Failed to create commit:"), error);
        throw error;
      }
    }

    return result;
  } catch (error) {
    logger.error(`\n${chalk.red("❌")} Commit analysis failed:`, error);
    throw error;
  }
}
