import { Command } from "commander";
import {
  addGlobalOptions,
  getCommandOptions,
  GlobalOptions,
} from "../cli/shared-options.js";
import { analyzeBranch } from "../controllers/branch/branch.coordinator.js";

export interface BranchCommandOptions extends GlobalOptions {
  name?: string;
  pr?: string | number;
  detailed?: boolean;
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
  .option("--format <format>", "Output format (console, json, markdown)")
  .option("--security", "Include security analysis")
  .action(async (_cmdOptions: BranchCommandOptions, command: Command) => {
    const options = getCommandOptions<BranchCommandOptions>(command);
    await analyzeBranch({ options });
  });

// Apply global options to analyze command
addGlobalOptions(analyze);

const create = new Command("pr")
  .description("Create a pull request")
  .option("--draft", "Create PR as draft")
  .option("--title <title>", "PR title")
  .option("--description <description>", "PR description")
  .option("--base <branch>", "Base branch for PR", "main")
  .option("--labels <labels...>", "PR labels")
  .action(async (_cmdOptions: BranchCommandOptions, command: Command) => {
    const options = getCommandOptions<BranchCommandOptions>(command);
    await analyzeBranch({ options });
  });

// Apply global options to create command
addGlobalOptions(create);

const edit = new Command("edit")
  .description("Edit existing PR")
  .option("--title <title>", "New PR title")
  .option("--description <description>", "New PR description")
  .action(async (_cmdOptions: BranchCommandOptions, command: Command) => {
    const options = getCommandOptions<BranchCommandOptions>(command);
    await analyzeBranch({ options });
  });

// Apply global options to edit command
addGlobalOptions(edit);

// Main branch command
export const branchCommand = new Command("branch")
  .description("Branch management and pull request operations")
  .option("--name <branch>", "Branch name (defaults to current)");

// Apply global options to main branch command
addGlobalOptions(branchCommand);

// Add subcommands
branchCommand
  .addCommand(analyze)
  .addCommand(create)
  .addCommand(edit)
  .action(async (_cmdOptions: BranchCommandOptions, command: Command) => {
    const options = getCommandOptions<BranchCommandOptions>(command);
    await analyzeBranch({ options });
  });
