import { Command } from "commander";
import { Logger } from "../utils/logger";
import { WorkspaceIntegrityService } from "../core/integrity";
import { PackageManagerFactory } from "../core/package-manager";
import { loadConfig } from "../core/config";
import chalk from "chalk";

interface IntegrityCommandOptions {
  fix?: boolean;
  verbose?: boolean;
}

export const integrityCommand = new Command()
  .name("integrity")
  .description("Check workspace dependency integrity")
  .option("-f, --fix", "Attempt to fix integrity issues")
  .option("-v, --verbose", "Show detailed check information")
  .action(async (options: IntegrityCommandOptions) => {
    const logger = new Logger();
    try {
      const config = await loadConfig();
      const packageManager = PackageManagerFactory.create(
        config.packageManager as "npm" | "yarn",
        config.npm,
      );
      const integrityService = new WorkspaceIntegrityService(
        packageManager,
        logger,
      );

      logger.info(chalk.blue("Checking workspace integrity..."));

      const result = await integrityService.checkWithDetails(options.verbose);

      if (!result.isValid) {
        logger.error("\nIntegrity check failed!");
        result.issues.forEach((issue) => {
          logger.error(`• ${issue.message}`);
          if (issue.solution) {
            logger.info(chalk.gray(`  Solution: ${issue.solution}`));
          }
        });

        if (options.fix) {
          logger.info("\nAttempting to fix issues...");
          const fixed = await integrityService.fix();
          if (fixed) {
            logger.success("Issues fixed successfully!");
          } else {
            logger.error("Could not automatically fix all issues");
            process.exit(1);
          }
        } else {
          logger.info("\nTip: Run with --fix to attempt automatic fixes");
          process.exit(1);
        }
      } else {
        logger.success("Workspace integrity check passed!");
      }
    } catch (error) {
      logger.error(
        "Failed to check workspace integrity:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
