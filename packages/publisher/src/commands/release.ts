import { Command } from "commander";
import { ReleaseService } from "../core/release";
import { loadConfig } from "../core/config";
import { Logger } from "../utils/logger";

interface ReleaseCommandOptions {
  all?: boolean;
  dryRun?: boolean;
  version?: string;
  gitPush?: boolean;
  npmPublish?: boolean;
}

interface ReleaseOptions {
  dryRun?: boolean;
  gitPush?: boolean;
  npmPublish?: boolean;
}

export const releaseCommand = new Command()
  .name("release")
  .description("Release one or more packages")
  .argument("[packages...]", "Package names to release")
  .option("-a, --all", "Release all packages with changes")
  .option("-d, --dry-run", "Show what would be done without actually doing it")
  .option("-v, --version <version>", "Specify version explicitly")
  .option("--no-git-push", "Skip git push")
  .option("--no-npm-publish", "Skip npm publish")
  .action(async (packages: string[], commandOptions: ReleaseCommandOptions) => {
    const logger = new Logger();
    try {
      const config = await loadConfig();
      const releaseService = new ReleaseService(config, logger);

      // Transform commander options to ReleaseOptions
      const releaseOptions: ReleaseOptions = {
        dryRun: commandOptions.dryRun,
        gitPush: commandOptions.gitPush,
        npmPublish: commandOptions.npmPublish,
      };

      if (commandOptions.all) {
        await releaseService.releaseAll(releaseOptions);
      } else if (packages.length > 0) {
        await releaseService.releasePackages(packages, releaseOptions);
      } else {
        logger.error("Please specify packages to release or use --all flag");
        process.exit(1);
      }
    } catch (error) {
      logger.error(
        "Release failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
