import chalk from "chalk";
import { Command } from "commander";
import { addGlobalOptions, GlobalOptions } from "../cli/shared-options.js";
import { analyzeCommit } from "../controllers/commit/commit.coordinator.js";

export interface CommitCommandOptions extends GlobalOptions {
  message?: string;
  staged?: boolean;
  unstaged?: boolean;
  all?: boolean;
  execute?: boolean;
  cwd?: string;
}

// Subcommands
const analyze = new Command("analyze")
  .description("Analyze changes for commit")
  .option("-m, --message <text>", "Commit message")
  .option("--staged", "Include analysis of staged changes (default: true)")
  .option("--unstaged", "Include analysis of unstaged changes")
  .option("--all", "Analyze both staged and unstaged changes")
  .action(async (cmdOptions: CommitCommandOptions, command: Command) => {
    const parentOptions = command.parent?.opts() || {};
    const options: CommitCommandOptions = {
      ...parentOptions,
      ...cmdOptions,
    };
    await analyzeCommit({ options });
  });

// Apply global options to analyze command
addGlobalOptions(analyze);

const create = new Command("create")
  .description("Create a commit with analysis")
  .option("-m, --message <text>", "Commit message")
  .option("--staged", "Include staged changes (default: true)")
  .option("--unstaged", "Include unstaged changes")
  .option("--all", "Include all changes")
  .action(async (cmdOptions: CommitCommandOptions, command: Command) => {
    const parentOptions = command.parent?.opts() || {};
    const options: CommitCommandOptions = {
      ...parentOptions,
      ...cmdOptions,
      execute: true,
    };
    await analyzeCommit({ options });
  });

// Apply global options to create command
addGlobalOptions(create);

const suggest = new Command("suggest")
  .description("Get AI suggestions for commit message")
  .option("--staged", "Include staged changes (default: true)")
  .option("--unstaged", "Include unstaged changes")
  .option("--all", "Include all changes")
  .action(async (cmdOptions: CommitCommandOptions, command: Command) => {
    const parentOptions = command.parent?.opts() || {};
    const options: CommitCommandOptions = {
      ...parentOptions,
      ...cmdOptions,
      ai: true,
    };
    await analyzeCommit({ options });
  });

// Apply global options to suggest command
addGlobalOptions(suggest);

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

// Apply global options to main commit command
addGlobalOptions(commitCommand);

// Add subcommands
commitCommand
  .addCommand(analyze)
  .addCommand(create)
  .addCommand(suggest)
  .action(async (cmdOptions: CommitCommandOptions) => {
    await analyzeCommit({ options: cmdOptions });
  });
