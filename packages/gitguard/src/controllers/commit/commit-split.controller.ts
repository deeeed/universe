import chalk from "chalk";
import { GitService } from "../../services/git.service.js";
import { CommitSplitSuggestion } from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import { FileChange } from "../../types/git.types.js";
import { Logger } from "../../types/logger.types.js";
import {
  promptInquirerChoice,
  promptMultipleChoice,
  promptYesNo,
} from "../../utils/user-prompt.util.js";

interface CommitSplitControllerParams {
  logger: Logger;
  git: GitService;
  config: Config;
}

interface HandleSplitSuggestionParams {
  suggestion: CommitSplitSuggestion;
  files: FileChange[];
  originalMessage?: string;
}

interface SplitExecutionResult {
  success: boolean;
  error?: string;
  executedSuggestions: number[];
}

type SplitAction = "all" | "select" | "preview" | "cancel";

interface FormatFileListParams {
  files: string[];
  maxVisible?: number;
}

interface PrintCommandGroupParams {
  commands: string[];
  logger: Logger;
}

interface DisplayCommandsParams {
  commands: string[];
  logger: Logger;
}

interface SplitActionChoice {
  label: string;
  value: SplitAction;
  isDefault?: boolean;
}

const SPLIT_ACTION_CHOICES: SplitActionChoice[] = [
  {
    label: "Select specific suggestions to execute",
    value: "select",
    isDefault: true,
  },
  {
    label: "Execute all suggestions in order",
    value: "all",
  },
  {
    label: "Preview commands without executing",
    value: "preview",
  },
  {
    label: "Cancel split operation",
    value: "cancel",
  },
] as const;

interface ValidateSplitCommandsResult {
  isValid: boolean;
  missingFiles: string[];
  duplicateFiles: string[];
}

export class CommitSplitController {
  private readonly logger: Logger;
  private readonly git: GitService;

  constructor(params: CommitSplitControllerParams) {
    this.logger = params.logger;
    this.git = params.git;
  }

  private validateSplitCommands(params: {
    selectedIndices: number[];
    suggestion: CommitSplitSuggestion;
    files: FileChange[];
    validateMissingFiles?: boolean;
  }): ValidateSplitCommandsResult {
    const {
      selectedIndices,
      suggestion,
      files,
      validateMissingFiles = false,
    } = params;
    const allStagedFiles = new Set(files.map((f) => f.path));
    const includedFiles = new Set<string>();
    const duplicateFiles = new Set<string>();

    // Check for duplicates and track included files
    selectedIndices.forEach((index) => {
      const split = suggestion.suggestions[index];
      split.files.forEach((file) => {
        if (includedFiles.has(file)) {
          duplicateFiles.add(file);
        }
        includedFiles.add(file);
      });
    });

    // Find files that are staged but not included in any split
    const missingFiles = validateMissingFiles
      ? Array.from(allStagedFiles).filter((file) => !includedFiles.has(file))
      : [];

    return {
      isValid:
        (validateMissingFiles ? missingFiles.length === 0 : true) &&
        duplicateFiles.size === 0,
      missingFiles,
      duplicateFiles: Array.from(duplicateFiles),
    };
  }

  async handleSplitSuggestion(
    params: HandleSplitSuggestionParams,
  ): Promise<SplitExecutionResult> {
    const { suggestion } = params;

    // Display split suggestions
    this.logger.info("\n📦 Commit Split Suggestions");
    this.logger.info(chalk.yellow(`\nReason: ${suggestion.reason}`));

    suggestion.suggestions.forEach((split, index) => {
      this.logger.info(
        `\n${chalk.bold.green(`${index + 1}.`)} ${chalk.bold.cyan(split.scope ?? "root")}`,
      );
      this.logger.info(
        `   ${chalk.dim("Message:")} ${chalk.bold(split.message)}`,
      );
      this.logger.info(`   ${chalk.dim("Files:")} ${split.files.length}`);
    });

    // Let user choose action
    const { action } = await promptInquirerChoice<SplitAction>({
      message: "How would you like to proceed with the split?",
      choices: SPLIT_ACTION_CHOICES.map((choice, index) => ({
        ...choice,
        label: `${index + 1}. ${choice.label}`,
      })),
      logger: this.logger,
    });

    if (action === "cancel") {
      return { success: false, executedSuggestions: [] };
    }

    let selectedIndices: number[] = [];
    const commands = this.generateCommands({
      suggestion,
      files: params.files,
    });

    if (action === "preview") {
      this.displayCommands({
        commands,
        logger: this.logger,
      });
      this.logger.info("\nReturning to main menu...\n");
      return this.handleSplitSuggestion(params);
    }

    if (action === "select") {
      let isSelectionValid = false;
      let selectedIndices: number[] = [];

      while (!isSelectionValid) {
        const choices = [
          ...suggestion.suggestions.map((split, index) => ({
            label: `${split.message} (${split.files.length} files)`,
            value: index,
            isDefault: false,
          })),
          {
            label: chalk.yellow("↩ Cancel and go back"),
            value: -1,
            isDefault: false,
          },
        ];

        selectedIndices = await promptMultipleChoice({
          message:
            "Select commits to create (use space to select, enter to confirm):",
          choices,
          logger: this.logger,
        });

        // If cancel is selected, return to previous menu regardless of other selections
        if (selectedIndices.includes(-1)) {
          return this.handleSplitSuggestion(params);
        }

        if (!selectedIndices.length) {
          this.logger.info("\n⚠️ No suggestions selected");
          continue;
        }

        // Validate the selection - only check missing files if all suggestions are selected
        const isFullSelection =
          selectedIndices.length === suggestion.suggestions.length;
        const validation = this.validateSplitCommands({
          selectedIndices,
          suggestion,
          files: params.files,
          validateMissingFiles: isFullSelection,
        });

        if (!validation.isValid) {
          this.logger.warn("\n⚠️ Invalid split configuration:");
          if (validation.missingFiles.length) {
            this.logger.warn("Files not included in any commit:");
            validation.missingFiles.forEach((file) =>
              this.logger.warn(`  - ${chalk.yellow(file)}`),
            );
          }
          if (validation.duplicateFiles.length) {
            this.logger.warn("Files included in multiple commits:");
            validation.duplicateFiles.forEach((file) =>
              this.logger.warn(`  - ${chalk.yellow(file)}`),
            );
          }

          const retry = await promptYesNo({
            message: "Would you like to select commits again?",
            defaultValue: true,
            logger: this.logger,
          });

          if (!retry) {
            return { success: false, executedSuggestions: [] };
          }
          // Continue loop if retry is true
        } else {
          isSelectionValid = true;
        }
      }

      return this.executeSplitSuggestions({
        suggestion,
        selectedIndices,
        files: params.files,
      });
    } else {
      selectedIndices = suggestion.suggestions.map((_, i) => i);
    }

    // Show execution plan
    this.logger.info("\n📋 Execution Plan:");
    selectedIndices.forEach((index, execOrder) => {
      const split = suggestion.suggestions[index];
      this.logger.info(`${chalk.dim(`${execOrder + 1}.`)} ${split.message}`);
      this.logger.info(`   Files: ${split.files.length}`);
    });

    // Generate and preview commands for selected suggestions
    const selectedCommands = this.generateCommands({
      suggestion,
      files: params.files,
    });

    this.displayCommands({
      commands: selectedCommands,
      logger: this.logger,
    });

    const shouldProceed = await promptYesNo({
      message: "\nProceed with creating these commits?",
      logger: this.logger,
      defaultValue: true,
    });

    if (!shouldProceed) {
      return { success: false, executedSuggestions: [] };
    }

    return this.executeSplitSuggestions({
      suggestion,
      selectedIndices,
      files: params.files,
    });
  }

  private generateCommands(params: {
    suggestion: CommitSplitSuggestion;
    files: FileChange[];
  }): string[] {
    const { suggestion, files } = params;
    const commands: string[] = [
      `git reset ${files.map((f) => f.path).join(" ")}`,
    ];

    suggestion.suggestions.forEach((split) => {
      commands.push(
        `git add ${split.files.join(" ")}`,
        `git commit -m "${split.type}${split.scope ? `(${split.scope})` : ""}: ${split.message}"`,
      );
    });

    return commands;
  }

  private formatFileList(params: FormatFileListParams): string {
    const { files, maxVisible = 3 } = params;
    if (files.length <= maxVisible) return files.join(" ");
    return `${files.slice(0, maxVisible - 1).join(" ")} ${chalk.dim("...")} ${files[files.length - 1]}`;
  }

  private printCommandGroup(params: PrintCommandGroupParams): void {
    const { commands, logger } = params;
    const [addCommand, commitCommand] = commands;

    logger.info(chalk.yellow("\n# Create new commit"));
    // Format add command
    const files = addCommand.slice(8).split(" ");
    logger.info(chalk.dim(`git add ${this.formatFileList({ files })}`));

    // Format commit command with conventional commit highlighting
    const commitMsg = commitCommand.slice(12, -1); // Remove 'git commit -m "' and final quote
    const [type, ...rest] = commitMsg.split(":");
    const message = rest.join(":").trim();
    logger.info(
      chalk.dim("git commit -m ") +
        chalk.cyan(`"${type}:`) +
        chalk.white(` ${message}"`),
    );
  }

  private displayCommands(params: DisplayCommandsParams): void {
    const { commands, logger } = params;
    logger.info("\n📝 Commands to be executed:");

    // Group commands by commit
    let currentGroup: string[] = [];
    commands.forEach((command) => {
      if (command.startsWith("git reset")) {
        logger.info(chalk.yellow("\n# Reset all changes"));
        const files = command.slice(10).split(" ");
        logger.info(
          chalk.dim(`${command.slice(0, 9)} ${this.formatFileList({ files })}`),
        );
      } else if (command.startsWith("git add")) {
        if (currentGroup.length > 0) {
          // Print previous group
          this.printCommandGroup({ commands: currentGroup, logger });
          currentGroup = [];
        }
        currentGroup.push(command);
      } else if (command.startsWith("git commit")) {
        currentGroup.push(command);
      }
    });

    // Print last group
    if (currentGroup.length > 0) {
      this.printCommandGroup({ commands: currentGroup, logger });
    }

    logger.info(
      chalk.dim("\nYou can copy and execute these commands manually."),
    );
  }

  private async executeSplitSuggestions(params: {
    suggestion: CommitSplitSuggestion;
    selectedIndices: number[];
    files: FileChange[];
  }): Promise<SplitExecutionResult> {
    const { suggestion, selectedIndices } = params;

    try {
      // First unstage all files to start fresh
      await this.git.unstageFiles({
        files: params.files.map((f) => f.path),
      });

      // Execute selected suggestions in order
      for (const index of selectedIndices) {
        const split = suggestion.suggestions[index];
        this.logger.info(
          `\n📦 Creating commit ${index + 1}/${selectedIndices.length}`,
        );

        // Stage files for this suggestion
        for (const file of split.files) {
          await this.git.execGit({
            command: "add",
            args: [file],
          });
        }

        // Create commit with conventional commit format
        const scopeDisplay = split.scope ? `(${split.scope})` : "";
        const commitMessage = `${split.type}${scopeDisplay}: ${split.message}`;

        await this.git.createCommit({
          message: commitMessage,
        });

        this.logger.info(chalk.green(`✓ Created commit: ${commitMessage}`));
      }

      this.logger.info(
        chalk.green("\n✨ Split operation completed successfully!"),
      );
      return {
        success: true,
        executedSuggestions: selectedIndices,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        chalk.red("\n❌ Failed to execute split:"),
        errorMessage,
      );
      return {
        success: false,
        error: errorMessage,
        executedSuggestions: [],
      };
    }
  }
}
