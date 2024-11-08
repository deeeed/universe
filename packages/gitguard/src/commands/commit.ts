import chalk from "chalk";
import { Command } from "commander";
import { analyzeCommit } from "../controllers/commit/commit.coordinator.js";

export interface CommitCommandOptions {
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
