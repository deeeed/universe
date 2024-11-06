import { CommitService } from "../services/commit.service.js";
import { AIFactory } from "../services/factories/ai.factory.js";
import { GitService } from "../services/git.service.js";
import { LoggerService } from "../services/logger.service.js";
import { PRService } from "../services/pr.service.js";
import { ReporterService } from "../services/reporter.service.js";
import { SecurityService } from "../services/security.service.js";
import {
  CommitAnalysisResult,
  PRAnalysisResult,
} from "../types/analysis.types.js";
import { FileChange } from "../types/git.types.js";
import { generateCommitSuggestionPrompt } from "../utils/ai-prompt.util.js";
import { copyToClipboard } from "../utils/clipboard.util.js";
import { loadConfig } from "../utils/config.util.js";
import { promptAIAction } from "../utils/user-prompt.util.js";
import chalk from "chalk";

interface AnalyzeOptions {
  pr?: string | number;
  branch?: string;
  message?: string;
  format?: "console" | "json" | "markdown";
  color?: boolean;
  detailed?: boolean;
  debug?: boolean;
  configPath?: string;
  staged?: boolean;
  unstaged?: boolean;
  all?: boolean;
  ai?: boolean;
  commit?: boolean;
}

type AnalyzeResult = CommitAnalysisResult | PRAnalysisResult;

export async function analyze(params: AnalyzeOptions): Promise<AnalyzeResult> {
  const logger = new LoggerService({ debug: params.debug });
  const reporter = new ReporterService({ logger });

  try {
    const config = await loadConfig({ configPath: params.configPath });
    const git = new GitService({
      config: {
        ...config.git,
        baseBranch: config.git?.baseBranch || "main",
      },
      logger,
    });
    const security = new SecurityService({ config, logger });
    const ai =
      (params.ai ?? config.ai?.enabled)
        ? AIFactory.create({
            config: {
              ...config,
            },
            logger,
          })
        : undefined;

    // If no specific analysis type is specified, analyze working directory
    if (!params.pr && !params.branch) {
      const stagedFiles = await git.getStagedChanges();
      const unstagedFiles = await git.getUnstagedChanges();
      const currentBranch = await git.getCurrentBranch();
      const baseBranch = git.config.baseBranch;

      // Determine what to analyze based on options
      const shouldAnalyzeStaged = params.all || params.staged !== false;
      const shouldAnalyzeUnstaged = params.all || params.unstaged === true;

      // For debugging
      logger.debug("Analysis options:", {
        shouldAnalyzeStaged,
        shouldAnalyzeUnstaged,
        stagedFiles: stagedFiles.length,
        unstagedFiles: unstagedFiles.length,
        params,
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
            `  ${chalk.dim("•")} ${chalk.cyan(`${unstagedFiles.length} unstaged files`)}`,
          );
        }
        logger.info(""); // Empty line for spacing
      } else {
        logger.info("\n📂 No changes found in the working directory.");
        logger.info("\n📋 To get started:");
        logger.info(`${chalk.dim("1.")} Make some changes to your files`);
        logger.info(
          `${chalk.dim("2.")} Use ${chalk.cyan("'git add <file>'")} to stage changes`,
        );
        logger.info(
          `${chalk.dim("3.")} Run ${chalk.cyan("'gitguard analyze'")} again`,
        );
      }

      // If no changes to analyze, show helpful message
      if (filesToAnalyze.length === 0) {
        logger.info("\n📂 No changes found in the working directory.");
        logger.info("\n📋 To get started:");
        logger.info(`${chalk.dim("1.")} Make some changes to your files`);
        logger.info(
          `${chalk.dim("2.")} Use ${chalk.cyan("'git add <file>'")} to stage changes`,
        );
        logger.info(
          `${chalk.dim("3.")} Run ${chalk.cyan("'gitguard analyze'")} again`,
        );

        const now = new Date();
        return {
          branch: currentBranch,
          baseBranch,
          stats: {
            filesChanged: 0,
            additions: 0,
            deletions: 0,
            totalCommits: 0,
            authors: [],
            timeSpan: {
              firstCommit: now,
              lastCommit: now,
            },
          },
          warnings: [],
          commits: [],
          filesByDirectory: {},
        };
      }

      const commitService = new CommitService({
        config,
        git,
        security,
        ai,
        logger,
      });

      // First diff declaration (for security checks)
      const securityDiff = shouldAnalyzeStaged
        ? await git.getStagedDiff()
        : await git.getUnstagedDiff();

      const securityResult = security?.analyzeSecurity({
        files: filesToAnalyze,
        diff: securityDiff,
      });

      // Analyze all relevant files
      let result = await commitService.analyze({
        files: filesToAnalyze,
        message: params.message || "",
        enableAI: false,
        enablePrompts: true,
        securityResult,
      });

      // Update split suggestion handling
      if (result.splitSuggestion) {
        logger.info(
          `\n${chalk.yellow("📦")} Multiple package changes detected:`,
        );
        logger.info(chalk.yellow(result.splitSuggestion.reason));

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
          const selectedSplit =
            result.splitSuggestion.suggestions[selection - 1];

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
              logger.info(
                chalk.green("\n✅ Successfully unstaged other files"),
              );

              // Update the analysis result to reflect only the kept files
              const keptFiles = selectedSplit.files
                .map((filePath) =>
                  filesToAnalyze.find((f) => f.path === filePath),
                )
                .filter((file): file is FileChange => file !== undefined);

              if (keptFiles.length !== selectedSplit.files.length) {
                logger.debug(
                  "Some files were not found in original analysis:",
                  {
                    expected: selectedSplit.files,
                    found: keptFiles.map((f) => f.path),
                  },
                );
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
        options: {
          format: params.format || "console",
          color: params.color,
          detailed: params.detailed,
        },
      });

      // Handle commit if option is set
      if (params.commit && result.formattedMessage) {
        logger.info("\n📝 Creating commit...");
        try {
          await git.createCommit({ message: result.formattedMessage });
          logger.info(chalk.green("✅ Commit created successfully!"));
        } catch (error) {
          logger.error(chalk.red("❌ Failed to create commit:"), error);
          throw error;
        }
      }

      // Only show next steps if there are actions to take
      if (
        !params.message ||
        (config.ai?.enabled && !params.ai) ||
        result.warnings.length > 0
      ) {
        logger.info("\n📋 Next steps:");
        if (!params.message) {
          logger.info(
            `  ${chalk.dim("•")} Run ${chalk.cyan("'gitguard analyze --message \"your message\"'")} to analyze with a commit message`,
          );
        }

        if (config.ai?.enabled && !params.ai) {
          logger.info(
            `  ${chalk.dim("•")} Run ${chalk.cyan("'gitguard analyze --ai'")} to generate commit message suggestions`,
          );
        }

        if (result.warnings.length > 0) {
          logger.info(
            `  ${chalk.dim("•")} ${chalk.yellow("Address the warnings above before committing")}`,
          );
        }
      }

      // Return early if AI is not explicitly requested
      if (!params.ai || !ai) {
        return result;
      }

      // Inside the analyze function, before AI analysis
      if (params.ai && !params.message) {
        params.message = "ai commit";
        logger.debug("Using default message for AI analysis:", params.message);
      }

      // Only proceed with AI analysis if --ai flag is provided
      logger.info("\n🤖 Preparing AI suggestions...");
      const aiDiff = await git.getStagedDiffForAI();
      const prompt = generateCommitSuggestionPrompt({
        files: filesToAnalyze,
        message: params.message || "",
        diff: aiDiff,
        logger,
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

      // Process AI result based on user choice
      switch (aiPromptResult.action) {
        case "generate": {
          logger.info("\nGenerating AI suggestions...");
          const aiResult = await commitService.analyze({
            files: filesToAnalyze,
            message: params.message || "",
            enableAI: true,
            enablePrompts: true,
            securityResult,
          });

          if (aiResult.suggestions?.length) {
            logger.info("\n🤖 AI Suggestions:");
            aiResult.suggestions.forEach((suggestion, index) => {
              logger.info(
                `\n${chalk.bold.green(`${index + 1}.`)} ${chalk.bold(suggestion.message)}`,
              );
              logger.info(
                `   ${chalk.dim("Explanation:")} ${suggestion.explanation}`,
              );
            });

            // Add commit handling for AI suggestions
            if (params.commit) {
              logger.info(
                `\n📝 ${chalk.yellow("Select a suggestion to commit")} (${chalk.cyan(`1-${aiResult.suggestions.length}`)}):`,
              );
              const readline = await import("readline/promises");
              const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
              });

              const answer = await rl.question(
                "Enter number (or press enter to skip): ",
              );
              rl.close();

              const selection = parseInt(answer, 10);
              if (selection > 0 && selection <= aiResult.suggestions.length) {
                const selectedSuggestion = aiResult.suggestions[selection - 1];
                logger.info("\n📝 Creating commit with selected message...");
                try {
                  await git.createCommit({
                    message: selectedSuggestion.message,
                  });
                  logger.info("✅ Commit created successfully!");
                  return aiResult; // Return early after successful commit
                } catch (error) {
                  logger.error("Failed to create commit:", error);
                  throw error;
                }
              } else {
                logger.info("Skipping commit creation.");
              }
            }
          } else {
            logger.info(
              `\n${chalk.red("❌")} No AI suggestions could be generated`,
            );
          }

          // Only show next steps if no commit was created
          logger.info("\n📋 Next steps:");
          logger.info(
            `  ${chalk.dim("•")} Run ${chalk.cyan("'gitguard commit'")} to use these suggestions in your commit`,
          );
          logger.info(
            `  ${chalk.dim("•")} Run with ${chalk.cyan("--message")} to provide a different base message`,
          );

          return aiResult;
        }

        case "copy": {
          const prompt = generateCommitSuggestionPrompt({
            files: filesToAnalyze,
            message: params.message || "",
            diff: aiDiff,
            logger,
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

      // Add commit handling
      if (params.commit && result.formattedMessage) {
        logger.info("\n📝 Creating commit...");
        try {
          await git.createCommit({ message: result.formattedMessage });
          logger.info("✅ Commit created successfully!");
        } catch (error) {
          logger.error("Failed to create commit:", error);
          throw error;
        }
      }

      return result;
    }

    // PR analysis logic
    const prService = new PRService({
      config,
      git,
      security,
      ai,
      logger,
    });

    const result = await prService.analyze({
      branch: params.branch,
      enableAI: Boolean(config.ai?.enabled),
      enablePrompts: true,
    });

    reporter.generateReport({
      result,
      options: {
        format: params.format || "console",
        color: params.color,
        detailed: params.detailed,
      },
    });

    return result;
  } catch (error) {
    logger.error(`\n${chalk.red("❌")} Analysis failed:`, error);
    throw error;
  }
}
