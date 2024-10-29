import { Command } from "commander";
import { InitService } from "../core/init";
import { Logger } from "../utils/logger";
import { WorkspaceService } from "../core/workspace";

interface InitOptions {
  force?: boolean;
  interactive?: boolean;
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
  .action(async (packages: string[], commandOptions: InitOptions) => {
    const logger = new Logger();
    try {
      const initService = new InitService(logger);
      const workspaceService = new WorkspaceService();

      // If no packages specified, try to get current package
      if (packages.length === 0) {
        const currentPackage = await workspaceService.getCurrentPackage();
        if (currentPackage) {
          packages = [currentPackage.name];
        }
      }

      // Extract options
      const options = {
        force: commandOptions.force,
        interactive: commandOptions.interactive,
      };

      await initService.initialize(packages, options);
    } catch (error) {
      logger.error(
        "Initialization failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
