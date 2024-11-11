import { Command } from "commander";

export interface GlobalOptions {
  debug?: boolean;
  config?: string;
  configPath?: string;
  ai?: boolean;
  split?: boolean;
  noColors?: boolean;
}

// Helper to get all options including globals
export function getCommandOptions<T extends GlobalOptions>(
  command: Command,
): T {
  return command.optsWithGlobals<T>();
}

export function addGlobalOptions(command: Command): Command {
  return command
    .option("-d, --debug", "Enable debug mode")
    .option("-c, --config <path>", "Path to config file", (value) => {
      command.setOptionValue("configPath", value);
      return value;
    })
    .option("--ai", "Enable AI-powered suggestions")
    .option("--no-colors", "Disable colors")
    .option("--split", "Suggest split changes using AI");
}
