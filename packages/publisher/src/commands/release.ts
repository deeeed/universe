import { Command } from "commander";
import { loadConfig } from "../core/config";
import { ReleaseService } from "../core/release";
import { Logger } from "../utils/logger";
import { Prompts } from "../utils/prompt";
import chalk from "chalk";

interface ReleaseCommandOptions {
  all?: boolean;
  dryRun?: boolean;
  version?: string;
  gitPush?: boolean;
  npmPublish?: boolean;
  showChanges?: boolean;
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
  .option("-s, --show-changes", "Show detailed changes before proceeding")
  .action(async (packages: string[], commandOptions: ReleaseCommandOptions) => {
    const logger = new Logger();
    try {
      const config = await loadConfig();
      const releaseService = new ReleaseService(config, logger);

      // Get packages to analyze
      const packagesToAnalyze = commandOptions.all
        ? (await releaseService["workspace"].getChangedPackages()).map(
            (p) => p.name,
          )
        : packages;

      if (packagesToAnalyze.length === 0) {
        logger.error(
          "No packages to release. Use --all flag or specify package names.",
        );
        process.exit(1);
      }

      // Show changes if requested or in dry-run mode
      if (commandOptions.showChanges || commandOptions.dryRun) {
        const changes = await releaseService.analyzeChanges(packagesToAnalyze);

        logger.info("\nPackages to be released:");
        for (const pkg of changes) {
          logger.info(`\n📦 ${pkg.name}`);
          logger.info(`  Current version: ${pkg.currentVersion}`);
          logger.info(`  Suggested version: ${pkg.suggestedVersion}`);

          // Preview changelog changes
          logger.info("\n  📝 Changelog Preview:");
          logger.info(chalk.gray("  ----------------------------------------"));
          const changelogContent = await releaseService.previewChangelog(
            pkg.name,
          );
          logger.info(
            changelogContent
              .split("\n")
              .map((line) => `  ${line}`)
              .join("\n"),
          );
          logger.info(chalk.gray("  ----------------------------------------"));

          if (pkg.hasGitChanges) {
            logger.info("\n  📝 Git Changes:");
            const gitChanges = await releaseService.getGitChanges(pkg.name);
            for (const commit of gitChanges) {
              logger.info(`    - ${commit.message}`);
            }
          }

          if (pkg.dependencies.length > 0) {
            logger.info("\n  🔄 Dependency Updates:");
            for (const dep of pkg.dependencies) {
              logger.info(
                `    - ${dep.name}: ${dep.currentVersion} -> ${dep.newVersion}`,
              );
            }
          }
        }

        if (commandOptions.dryRun) {
          logger.info("\n✨ Dry run completed");
          process.exit(0);
        }

        // Ask for confirmation
        const prompts = new Prompts(logger);
        if (!(await prompts.confirmRelease())) {
          logger.info("Release cancelled.");
          process.exit(0);
        }
      }

      // Proceed with release
      const releaseOptions = {
        dryRun: commandOptions.dryRun,
        gitPush: commandOptions.gitPush,
        npmPublish: commandOptions.npmPublish,
      };

      if (commandOptions.all) {
        await releaseService.releaseAll(releaseOptions);
      } else {
        await releaseService.releasePackages(packages, releaseOptions);
      }
    } catch (error) {
      logger.error(
        "Release failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
