import { Command } from "commander";
import { InitService } from "../core/init";
import { WorkspaceService } from "../core/workspace";
import { Logger } from "../utils/logger";
import { GenerateFileFormat } from "../templates/package-config.template";

interface InitOptions {
  force?: boolean;
  interactive?: boolean;
  format?: GenerateFileFormat["format"];
}

export const initCommand = new Command()
  .name("init")
  .description(
    "Initialize release configuration. When run from within a package directory, defaults to the current package. " +
      "In monorepo root, requires package names or initializes all packages.",
  )
  .argument(
    "[packages...]",
    "Package names to initialize (optional when in package directory)",
  )
  .option("-f, --force", "Overwrite existing configuration")
  .option("-i, --interactive", "Run in interactive mode")
  .option(
    "--format <format>",
    "Format of generated config files (json or typescript)",
    "json",
  )
  .action(async (packages: string[], commandOptions: InitOptions) => {
    const logger = new Logger();
    try {
      const initService = new InitService(logger);
      const workspaceService = new WorkspaceService();

      // If no packages specified, try to get current package
      if (!packages || packages.length === 0) {
        const currentPackage = await workspaceService.getCurrentPackage();
        if (currentPackage) {
          packages = [currentPackage.name];
        }
      }

      const options = {
        force: commandOptions.force,
        interactive: commandOptions.interactive,
        format: commandOptions.format as GenerateFileFormat["format"],
      };

      await initService.initialize({ packages, options });
    } catch (error) {
      logger.error(
        "Initialization failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
