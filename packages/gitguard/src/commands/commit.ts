import chalk from "chalk";
import { Command } from "commander";
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
import {
  displayAISuggestions,
  displaySplitSuggestions,
  promptAIAction,
  promptChoice,
  promptCommitSuggestion,
  promptSplitChoice,
  promptYesNo,
} from "../utils/user-prompt.util.js";
import { DEFAULT_MAX_PROMPT_TOKENS } from "../constants.js";

interface CommitCommandOptions {
  message?: string;
  staged?: boolean;
  unstaged?: boolean;
  all?: boolean;
  ai?: boolean;
  execute?: boolean;
  debug?: boolean;
  configPath?: string;
  cwd?: string;
}

interface CommitAnalyzeParams {
  options: CommitCommandOptions;
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

// Core analysis function
export async function analyzeCommit({
  options,
}: CommitAnalyzeParams): Promise<CommitAnalysisResult> {
  const isDebug = options.debug || process.env.GITGUARD_DEBUG === "true";
  const logger = new LoggerService({ debug: isDebug });
  const reporter = new ReporterService({ logger });

  try {
    let result: CommitAnalysisResult;

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

    const securityResult = security.analyzeSecurity({
      files: filesToAnalyze,
      diff: securityDiff,
    });

    // Handle security findings with user interaction
    if (
      securityResult.secretFindings.length > 0 ||
      securityResult.fileFindings.length > 0
    ) {
      logger.info("\n🚨 Security issues detected:");

      // Display findings
      [
        ...securityResult.secretFindings,
        ...securityResult.fileFindings,
      ].forEach((finding, index) => {
        logger.info(
          `\n${chalk.bold.red(`${index + 1}.`)} ${finding.type === "secret" ? "🔑" : "📄"} ${chalk.cyan(finding.path)}${
            finding.line ? ` (line ${finding.line})` : ""
          }`,
        );
        logger.info(`   ${chalk.dim("Issue:")} ${finding.suggestion}`);
        if (finding.content) {
          logger.info(`   ${chalk.dim("Content:")} ${finding.content}`);
        }
      });

      // Prompt user for action
      const action = await promptChoice<"unstage" | "ignore" | "abort">({
        message: "\nHow would you like to proceed?",
        choices: [
          {
            label: "Unstage affected files and abort commit",
            value: "unstage",
          },
          {
            label:
              "Ignore and proceed (not recommended for high severity issues)",
            value: "ignore",
          },
          {
            label: "Abort without changes",
            value: "abort",
          },
        ],
        logger,
      });

      switch (action) {
        case "unstage":
          if (securityResult.commands.length > 0) {
            logger.info("\n📝 Unstaging affected files...");
            try {
              await git.unstageFiles({
                files: securityResult.filesToUnstage,
              });
              logger.info(chalk.green("✅ Files unstaged successfully"));
            } catch (error) {
              logger.error(chalk.red("❌ Failed to unstage files:"), error);
              throw error;
            }
          }
          logger.info("\n❌ Commit aborted due to security issues");
          process.exit(1);
          break;

        case "ignore":
          if (securityResult.shouldBlock) {
            const confirmed = await promptYesNo({
              message:
                "\n⚠️ High severity security issues found. Are you sure you want to proceed?",
              defaultValue: false,
              logger,
            });

            if (!confirmed) {
              logger.info("\n❌ Commit aborted");
              process.exit(1);
            }
          }
          logger.info(
            chalk.yellow("\n⚠️ Proceeding despite security issues..."),
          );
          break;

        case "abort":
          logger.info("\n❌ Commit aborted");
          process.exit(1);
          break;
      }

      // Initial analysis with security results
      result = await commitService.analyze({
        files: filesToAnalyze,
        message: options.message ?? "",
        enableAI: options.ai ?? false,
        enablePrompts: true,
        securityResult,
      });
    } else {
      // Initial analysis without security issues
      result = await commitService.analyze({
        files: filesToAnalyze,
        message: options.message ?? "",
        enableAI: options.ai ?? false,
        enablePrompts: true,
        securityResult,
      });
    }

    // Handle split suggestions first
    if (result.splitSuggestion) {
      // Add AI suggestion as the last option
      if (options.ai && ai) {
        result.splitSuggestion.suggestions.push({
          scope: "ai suggestions",
          message: "Get AI suggestions for all changes",
          files: [],
          order: result.splitSuggestion.suggestions.length + 1,
          type: "suggestion",
        });
      }

      displaySplitSuggestions({
        suggestions: result.splitSuggestion.suggestions,
        logger,
      });

      const { selection } = await promptSplitChoice({
        suggestions: result.splitSuggestion.suggestions,
        logger,
      });

      // Handle split selection
      if (selection === 0) {
        logger.info(chalk.yellow("\n⏭️  Continuing with all changes..."));
      } else if (
        selection === result.splitSuggestion.suggestions.length &&
        options.ai
      ) {
        // Selected AI option - continue to AI suggestions with all files
        logger.info("\n🤖 Proceeding with AI suggestions for all changes...");
      } else if (
        selection > 0 &&
        selection < result.splitSuggestion.suggestions.length
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

      // Move AI suggestions logic here, only execute if AI option was selected in split
      if (
        options.ai &&
        ai &&
        selection === (result.splitSuggestion?.suggestions.length ?? 0)
      ) {
        // ... existing AI suggestions code ...
        logger.warning(
          `\n⚠️  AI suggestion selected in split, but not in commit. This should not happen.`,
        );
      }
    }

    // Now handle AI suggestions if enabled and either:
    // 1. There were no split suggestions
    // 2. User chose to continue with all changes
    // 3. User selected the AI option in split suggestions
    if (options.ai && ai) {
      logger.info("\n🤖 Preparing AI suggestions...");

      // Compare different diff strategies
      const fullDiff = await git.getStagedDiff(); // Get the complete diff
      const prioritizedDiffs = commitService.getPrioritizedDiffs({
        files: filesToAnalyze,
        diff: fullDiff,
        maxLength: config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS,
      });

      // Compare and select the best diff strategy
      const diffs = [
        {
          name: "full",
          content: fullDiff,
          score:
            fullDiff.length >
            (config.ai.maxPromptTokens ?? DEFAULT_MAX_PROMPT_TOKENS) / 4
              ? 0
              : 1,
        },
        {
          name: "prioritized",
          content: prioritizedDiffs,
          score: prioritizedDiffs.length > 0 ? 2 : 0,
        },
      ];

      // Log details about each diff strategy
      logger.debug("Diff strategies comparison:", {
        full: {
          length: fullDiff.length,
          preview: fullDiff.slice(0, 100) + "...",
          score: diffs[0].score,
        },
        prioritized: {
          length: prioritizedDiffs.length,
          preview: prioritizedDiffs.slice(0, 100) + "...",
          score: diffs[1].score,
        },
      });

      // Select the best strategy based on score and length
      const bestDiff = diffs.reduce((best, current) => {
        logger.debug(`Comparing diffs:`, {
          current: {
            name: current.name,
            score: current.score,
            length: current.content.length,
          },
          best: {
            name: best.name,
            score: best.score,
            length: best.content.length,
          },
        });

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
            const selectedSuggestion = await promptCommitSuggestion({
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
    logger.debug("Full analysis error details:", error);
    throw error;
  }
}

// Subcommands
const analyze = new Command("analyze")
  .description("Analyze changes for commit")
  .option("-m, --message <text>", "Commit message")
  .option("--staged", "Include analysis of staged changes (default: true)")
  .option("--unstaged", "Include analysis of unstaged changes")
  .option("--all", "Analyze both staged and unstaged changes")
  .option("--ai", "Enable AI-powered suggestions")
  .action(async (cmdOptions: CommitCommandOptions) => {
    await analyzeCommit({ options: cmdOptions });
  });

const create = new Command("create")
  .description("Create a commit with analysis")
  .option("-m, --message <text>", "Commit message")
  .option("--staged", "Include staged changes (default: true)")
  .option("--unstaged", "Include unstaged changes")
  .option("--all", "Include all changes")
  .option("--ai", "Enable AI-powered suggestions")
  .action(async (cmdOptions: CommitCommandOptions) => {
    await analyzeCommit({ options: { ...cmdOptions, execute: true } });
  });

const suggest = new Command("suggest")
  .description("Get AI suggestions for commit message")
  .option("--staged", "Include staged changes (default: true)")
  .option("--unstaged", "Include unstaged changes")
  .option("--all", "Include all changes")
  .action(async (cmdOptions: CommitCommandOptions) => {
    await analyzeCommit({ options: { ...cmdOptions, ai: true } });
  });

// Main commit command
export const commitCommand = new Command("commit")
  .description("Commit changes with analysis and validation")
  .option("--cwd <path>", "Working directory")
  .addHelpText(
    "after",
    `
${chalk.blue("Examples:")}
  ${chalk.yellow("$")} gitguard commit analyze           # Analyze staged changes
  ${chalk.yellow("$")} gitguard commit create -m "feat"  # Create commit with message
  ${chalk.yellow("$")} gitguard commit suggest          # Get AI suggestions
  ${chalk.yellow("$")} gitguard commit create --ai      # Create with AI help`,
  );

// Add subcommands
commitCommand
  .addCommand(analyze)
  .addCommand(create)
  .addCommand(suggest)
  .action(async (cmdOptions: CommitCommandOptions) => {
    // Default action when no subcommand is specified - run analysis
    await analyzeCommit({ options: cmdOptions });
  });

// Keep original export for backward compatibility
export async function analyzeCommitLegacy(
  params: CommitAnalyzeParams,
): Promise<CommitAnalysisResult> {
  return analyzeCommit(params);
}
