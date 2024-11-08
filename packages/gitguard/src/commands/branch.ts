import chalk from "chalk";
import { Command } from "commander";
import { analyzeBranch } from "../controllers/branch/branch.controller.js";

export interface BranchCommandOptions {
  name?: string;
  pr?: string | number;
  color?: boolean;
  detailed?: boolean;
  ai?: boolean;
  debug?: boolean;
  configPath?: string;
  createPR?: boolean;
  draft?: boolean;
  labels?: string[];
  title?: string;
  description?: string;
  base?: string;
  security?: boolean;
  edit?: boolean;
}

// Subcommands
const analyze = new Command("analyze")
  .description("Analyze current branch changes")
  .option("--detailed", "Generate a detailed report")
  .option("--ai", "Enable AI-powered suggestions")
  .option("--format <format>", "Output format (console, json, markdown)")
  .option("--security", "Include security analysis")
  .option("--debug", "Enable debug mode")
  .action(async (cmdOptions: BranchCommandOptions) => {
    await analyzeBranch({ options: cmdOptions });
  });

const create = new Command("pr")
  .description("Create a pull request")
  .option("--draft", "Create PR as draft")
  .option("--title <title>", "PR title")
  .option("--description <description>", "PR description")
  .option("--base <branch>", "Base branch for PR", "main")
  .option("--labels <labels...>", "PR labels")
  .option("--ai", "Use AI to generate content")
  .option("--debug", "Enable debug mode")
  .action(async (cmdOptions: BranchCommandOptions) => {
    await analyzeBranch({ options: { ...cmdOptions, createPR: true } });
  });

const edit = new Command("edit")
  .description("Edit existing PR")
  .option("--ai", "Use AI to generate content")
  .option("--title <title>", "New PR title")
  .option("--description <description>", "New PR description")
  .option("--debug", "Enable debug mode")
  .action(async (cmdOptions: BranchCommandOptions) => {
    await analyzeBranch({ options: { ...cmdOptions, edit: true } });
  });

// Main branch command
export const branchCommand = new Command("branch")
  .description("Branch management and pull request operations")
  .option("--name <branch>", "Branch name (defaults to current)")
  .option("--debug", "Enable debug mode")
  .addHelpText(
    "after",
    `
${chalk.blue("Examples:")}
  ${chalk.yellow("$")} gitguard branch analyze          # Analyze current branch
  ${chalk.yellow("$")} gitguard branch analyze --ai     # Get AI suggestions
  ${chalk.yellow("$")} gitguard branch pr --draft       # Create draft PR
  ${chalk.yellow("$")} gitguard branch edit --ai        # Edit PR with AI help
  ${chalk.yellow("$")} gitguard branch pr --base dev    # Create PR against dev branch`,
  );

// Add subcommands
branchCommand
  .addCommand(analyze)
  .addCommand(create)
  .addCommand(edit)
  .action(async (cmdOptions: BranchCommandOptions) => {
    await analyzeBranch({ options: cmdOptions });
  });
