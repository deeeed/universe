import chalk from "chalk";
import { GitService } from "../../services/git.service.js";
import { LoggerService } from "../../services/logger.service.js";
import { PRService } from "../../services/pr.service.js";
import {
  PRAnalysisResult,
  PRSplitSuggestion,
} from "../../types/analysis.types.js";
import { Config } from "../../types/config.types.js";
import {
  promptInquirerChoice,
  promptMultipleChoice,
  promptYesNo,
} from "../../utils/user-prompt.util.js";

interface BranchSplitControllerParams {
  logger: LoggerService;
  git: GitService;
  prService: PRService;
  config: Config;
}

interface HandleSplitParams {
  analysisResult: PRAnalysisResult;
}

type SplitAction = "all" | "select" | "preview" | "cancel";

const SPLIT_ACTION_CHOICES = [
  {
    label: "Split into all suggested branches",
    value: "all" as const,
    isDefault: true,
  },
  {
    label: "Select specific branches to create",
    value: "select" as const,
  },
  {
    label: "Preview changes without creating branches",
    value: "preview" as const,
  },
  {
    label: "Cancel split operation",
    value: "cancel" as const,
  },
];

interface ValidateSplitCommandsResult {
  isValid: boolean;
  missingFiles: string[];
  duplicateFiles: string[];
}

interface DisplayCommandsParams {
  commands: string[];
  logger: LoggerService;
}

interface FormatFileListParams {
  files: string[];
  maxVisible?: number;
}

export class BranchSplitController {
  private readonly logger: LoggerService;
  private readonly git: GitService;

  constructor({ logger, git }: BranchSplitControllerParams) {
    this.logger = logger;
    this.git = git;
  }

  private validateSplitCommands(params: {
    selectedIndices: number[];
    suggestion: PRSplitSuggestion;
    files: string[];
    validateMissingFiles?: boolean;
  }): ValidateSplitCommandsResult {
    const {
      selectedIndices,
      suggestion,
      files,
      validateMissingFiles = false,
    } = params;
    const allFiles = new Set(files);
    const includedFiles = new Set<string>();
    const duplicateFiles = new Set<string>();

    selectedIndices.forEach((index) => {
      const pr = suggestion.suggestedPRs[index];
      pr.files.forEach((filePath) => {
        if (includedFiles.has(filePath)) {
          duplicateFiles.add(filePath);
        }
        includedFiles.add(filePath);
      });
    });

    const missingFiles = validateMissingFiles
      ? Array.from(allFiles).filter((file) => !includedFiles.has(file))
      : [];

    return {
      isValid:
        (validateMissingFiles ? missingFiles.length === 0 : true) &&
        duplicateFiles.size === 0,
      missingFiles,
      duplicateFiles: Array.from(duplicateFiles),
    };
  }

  private formatFileList(params: FormatFileListParams): string {
    const { files, maxVisible = 3 } = params;
    if (files.length <= maxVisible) return files.join(" ");
    return `${files.slice(0, maxVisible - 1).join(" ")} ${chalk.dim("...")} ${files[files.length - 1]}`;
  }

  private generateCommands(params: {
    suggestion: PRSplitSuggestion;
    currentBranch: string;
  }): string[] {
    const { suggestion, currentBranch } = params;
    const commands: string[] = [];

    suggestion.suggestedPRs.forEach((pr, index) => {
      const newBranchName = `${currentBranch}-split-${index + 1}`;
      commands.push(
        `# Create branch ${newBranchName}`,
        `git checkout -b ${newBranchName} ${pr.baseBranch}`,
        `# Copy files from current branch`,
        ...pr.files.map((file) => `git checkout ${currentBranch} -- ${file}`),
        `git add ${pr.files.join(" ")}`,
        `git commit -m "${pr.title}"`,
        `git checkout ${currentBranch}`,
        "",
      );
    });

    return commands;
  }

  private displayCommands(params: DisplayCommandsParams): void {
    const { commands, logger } = params;
    logger.info("\n📝 Commands to be executed:");

    commands.forEach((command) => {
      if (command.startsWith("#")) {
        logger.info(chalk.yellow(`\n${command}`));
      } else if (command === "") {
        logger.info("");
      } else {
        logger.info(chalk.dim(command));
      }
    });

    logger.info(
      chalk.dim("\nYou can copy and execute these commands manually."),
    );
  }

  private async executeSplitCommands(params: {
    suggestion: PRSplitSuggestion;
    selectedIndices: number[];
    currentBranch: string;
  }): Promise<boolean> {
    const { suggestion, selectedIndices, currentBranch } = params;

    try {
      // Execute selected suggestions in order
      for (const index of selectedIndices) {
        const pr = suggestion.suggestedPRs[index];
        const newBranchName = `${currentBranch}-split-${index + 1}`;

        this.logger.info(
          `\n📦 Creating branch ${index + 1}/${selectedIndices.length}`,
        );

        // Create and checkout new branch
        await this.git.execGit({
          command: "checkout",
          args: ["-b", newBranchName, pr.baseBranch],
        });

        // Copy files from current branch
        for (const file of pr.files) {
          await this.git.execGit({
            command: "checkout",
            args: [currentBranch, "--", file],
          });
        }

        // Stage and commit files
        await this.git.execGit({
          command: "add",
          args: pr.files,
        });

        await this.git.createCommit({
          message: pr.title,
        });

        // Return to original branch
        await this.git.execGit({
          command: "checkout",
          args: [currentBranch],
        });

        this.logger.info(chalk.green(`✓ Created branch: ${newBranchName}`));
      }

      this.logger.info(
        chalk.green("\n✨ Branch split completed successfully!"),
      );
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        chalk.red("\n❌ Failed to execute split:"),
        errorMessage,
      );
      return false;
    }
  }

  async handleSplitSuggestion({
    analysisResult,
  }: HandleSplitParams): Promise<PRAnalysisResult> {
    this.logger.info("\n🔄 Processing branch split suggestion...");

    const { splitSuggestion } = analysisResult;
    if (!splitSuggestion?.suggestedPRs?.length) {
      this.logger.warn("No split suggestions available");
      return analysisResult;
    }

    this.logger.debug("\n🔍 Debug: Analysis Result Structure:", {
      totalFiles: analysisResult.files?.length,
      splitSuggestion: {
        numPRs: splitSuggestion.suggestedPRs.length,
        prs: splitSuggestion.suggestedPRs.map((pr) => ({
          title: pr.title,
          numFiles: pr.files?.length,
          filesSample: pr.files?.slice(0, 2),
        })),
      },
    });

    this.logger.info(chalk.yellow(`\nReason: ${splitSuggestion.reason}`));
    splitSuggestion.suggestedPRs.forEach((pr, index) => {
      this.logger.info(
        `\n${chalk.bold.green(`${index + 1}.`)} ${chalk.bold(pr.title)}`,
      );
      if (pr.description) {
        this.logger.info(chalk.dim(pr.description));
      }

      this.logger.debug(`Debug: PR ${index + 1} Files:`, {
        filesLength: pr.files?.length,
        filesData: pr.files,
      });

      this.logger.info(`${chalk.dim("Files:")} ${pr.files?.length || 0}`);
      pr.files?.forEach((file) => {
        this.logger.info(`  ${chalk.dim("•")} ${chalk.gray(file)}`);
      });
      if (pr.dependencies?.length) {
        this.logger.info(chalk.dim("\nDepends on:"));
        pr.dependencies.forEach((dep) => {
          this.logger.info(`  ${chalk.dim("•")} ${chalk.gray(dep)}`);
        });
      }
    });

    const shouldContinue = true;
    while (shouldContinue) {
      // Let user choose action
      const { action } = await promptInquirerChoice<SplitAction>({
        message: "How would you like to proceed with the split?",
        choices: SPLIT_ACTION_CHOICES,
        logger: this.logger,
      });

      if (action === "cancel") {
        this.logger.info("\n⏭️ Skipping branch split");
        return analysisResult;
      }

      const currentBranch = await this.git.getCurrentBranch();
      const commands = this.generateCommands({
        suggestion: splitSuggestion,
        currentBranch,
      });

      if (action === "preview") {
        this.displayCommands({
          commands,
          logger: this.logger,
        });
        this.logger.info("\nReturning to main menu...\n");
        continue;
      }

      let selectedIndices: number[] = [];
      if (action === "all") {
        selectedIndices = splitSuggestion.suggestedPRs.map((_, index) => index);
      } else {
        // Select specific branches with validation
        let isSelectionValid = false;
        while (!isSelectionValid) {
          const choices = splitSuggestion.suggestedPRs.map((pr, index) => ({
            label: `${pr.title} (${this.formatFileList({ files: pr.files })})`,
            value: index,
            isDefault: false,
          }));

          selectedIndices = await promptMultipleChoice({
            message:
              "Select branches to create (use space to select, enter to confirm):",
            choices,
            logger: this.logger,
          });

          if (!selectedIndices.length) {
            this.logger.info("\n⚠️ No branches selected for split");
            continue;
          }

          // Validate selection
          const validation = this.validateSplitCommands({
            selectedIndices,
            suggestion: splitSuggestion,
            files: analysisResult.files.map((f) => f.path),
            validateMissingFiles:
              selectedIndices.length === splitSuggestion.suggestedPRs.length,
          });

          if (!validation.isValid) {
            this.logger.warn("\n⚠️ Invalid split configuration:");
            if (validation.missingFiles.length) {
              this.logger.warn("Files not included in any branch:");
              validation.missingFiles.forEach((file) =>
                this.logger.warn(`  - ${chalk.yellow(file)}`),
              );
            }
            if (validation.duplicateFiles.length) {
              this.logger.warn("Files included in multiple branches:");
              validation.duplicateFiles.forEach((file) =>
                this.logger.warn(`  - ${chalk.yellow(file)}`),
              );
            }

            const retry = await promptYesNo({
              message: "Would you like to select branches again?",
              defaultValue: true,
              logger: this.logger,
            });

            if (!retry) {
              return analysisResult;
            }
            continue;
          }
          isSelectionValid = true;
        }
      }

      // Confirm final selection
      this.logger.info("\n📋 Selected branches to create:");
      selectedIndices.forEach((index) => {
        const pr = splitSuggestion.suggestedPRs[index];
        this.logger.info(`${chalk.dim("•")} ${pr.title}`);
        this.logger.info(
          `  Files: ${this.formatFileList({
            files: pr.files,
            maxVisible: 3,
          })}`,
        );
      });

      const shouldProceed = await promptYesNo({
        message: "\nProceed with branch creation?",
        logger: this.logger,
        defaultValue: true,
      });

      if (!shouldProceed) {
        continue; // Return to main menu if user cancels
      }

      const success = await this.executeSplitCommands({
        suggestion: splitSuggestion,
        selectedIndices,
        currentBranch,
      });

      if (success) {
        this.logger.info("\n📝 Next steps:");
        selectedIndices.forEach((index) => {
          const branchName = `${currentBranch}-split-${index + 1}`;
          this.logger.info(
            `${index + 1}. Review and push branch ${chalk.cyan(branchName)}`,
          );
        });

        return {
          ...analysisResult,
          skipFurtherSuggestions: true,
        };
      }
    }

    return analysisResult;
  }
}
