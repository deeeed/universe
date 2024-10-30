import chalk from "chalk";
import { Command } from "commander";
import { loadConfig } from "../core/config";
import { ReleaseService } from "../core/release";
import { WorkspaceService } from "../core/workspace";
import { Logger } from "../utils/logger";
import { Prompts } from "../utils/prompt";

interface ReleaseCommandOptions {
  all?: boolean;
  dryRun?: boolean;
  version?: string;
  gitPush?: boolean;
  npmPublish?: boolean;
  showChanges?: boolean;
  checkIntegrity?: boolean;
  gitCheck?: boolean;
  skipUpstreamTracking?: boolean;
  force?: boolean;
}

export const releaseCommand = new Command()
  .name("release")
  .description(
    "Release packages. When run from within a package directory, defaults to the current package. " +
      "In monorepo root, requires package names or --all flag.",
  )
  .argument(
    "[packages...]",
    "Package names to release (optional when in package directory)",
  )
  .option("-a, --all", "Release all packages with changes")
  .option("-d, --dry-run", "Show what would be done without actually doing it")
  .option("-v, --version <version>", "Specify version explicitly")
  .option("--no-git-push", "Skip git push")
  .option("--no-npm-publish", "Skip npm publish")
  .option("-s, --show-changes", "Show detailed changes before proceeding")
  .option("--check-integrity", "Run workspace integrity check before release")
  .option("--no-git-check", "Skip git status validation")
  .option("--skip-upstream-tracking", "Skip git upstream tracking check")
  .option(
    "-f, --force",
    "Force release, overwriting existing tags if necessary",
  )
  .action(async (packages: string[], commandOptions: ReleaseCommandOptions) => {
    const logger = new Logger();
    try {
      const config = await loadConfig();
      const releaseService = new ReleaseService(config, logger);
      const workspaceService = new WorkspaceService();

      // Get packages to analyze
      let packagesToAnalyze: string[] = [];

      if (commandOptions.all) {
        const changedPackages = await workspaceService.getChangedPackages();
        packagesToAnalyze = changedPackages.map((p) => p.name);
      } else if (packages.length === 0) {
        const currentPackage = await workspaceService.getCurrentPackage();
        if (currentPackage) {
          packagesToAnalyze = [currentPackage.name];
        }
      } else {
        packagesToAnalyze = packages;
      }

      if (packagesToAnalyze.length === 0) {
        logger.error(
          "No packages to release. Use --all flag, specify package names, or run from within a package directory.",
        );
        process.exit(1);
      }

      // Show changes if requested or in dry-run mode
      if (commandOptions.showChanges || commandOptions.dryRun) {
        const changes = await releaseService.analyzeChanges(packagesToAnalyze);

        for (const pkg of changes) {
          if (commandOptions.dryRun) {
            // Get the dry run report
            const dryRunReport = await releaseService.createDryRunPreview(pkg, {
              dryRun: true,
              gitPush: commandOptions.gitPush,
              publish: commandOptions.npmPublish,
              skipGitCheck: !commandOptions.gitCheck,
              skipUpstreamTracking: commandOptions.skipUpstreamTracking,
              force: commandOptions.force,
              newVersion: pkg.suggestedVersion,
            });

            // Display the full dry run report
            logger.info("\n📦 Dry Run Report");
            logger.info("━".repeat(50));
            logger.info(`Package: ${dryRunReport.packageName}`);
            logger.info(
              `Version: ${dryRunReport.currentVersion} → ${dryRunReport.newVersion}`,
            );
            logger.info(`Git Tag: ${dryRunReport.git.tag}`);
            logger.info(
              `Git Push: ${dryRunReport.git.willPush ? "Yes" : "No"}`,
            );

            if (dryRunReport.npm) {
              logger.info(
                `NPM Publish: ${dryRunReport.npm.willPublish ? "Yes" : "No"}`,
              );
            }

            if (
              dryRunReport.dependencies &&
              dryRunReport.dependencies.length > 0
            ) {
              logger.info("\nDependency Updates:");
              for (const dep of dryRunReport.dependencies) {
                logger.info(
                  `  ${dep.name}: ${dep.currentVersion} → ${dep.newVersion} (${dep.type})`,
                );
              }
            }

            logger.info("\n📝 Changelog Preview:");
            logger.info("━".repeat(50));
            logger.info(dryRunReport.changelog);
          } else {
            logger.info(`\n📦 ${pkg.name}`);
            logger.info(`  Current version: ${pkg.currentVersion}`);
            logger.info(`  Suggested version: ${pkg.suggestedVersion}`);

            // Preview changelog changes
            logger.info("\n  📝 Changelog Preview:");
            logger.info(
              chalk.gray("  ----------------------------------------"),
            );
            const changelogContent = await releaseService.previewChangelog(
              pkg.name,
            );
            logger.info(
              changelogContent
                .split("\n")
                .map((line) => `  ${line}`)
                .join("\n"),
            );
            logger.info(
              chalk.gray("  ----------------------------------------"),
            );

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
        skipIntegrityCheck: commandOptions.checkIntegrity,
        skipGitCheck: !commandOptions.gitCheck,
        skipUpstreamTracking: commandOptions.skipUpstreamTracking,
        force: commandOptions.force,
      };

      if (commandOptions.all) {
        await releaseService.releaseAll(releaseOptions);
      } else {
        const results = await releaseService.releasePackages(
          packagesToAnalyze,
          releaseOptions,
        );
        logger.info("Release results:");
        for (const result of results) {
          if ("newVersion" in result) {
            // This is a DryRunReport
            logger.info(
              `  ${result.packageName}: ${result.newVersion} (dry run)`,
            );
          } else {
            // This is a ReleaseResult
            logger.info(`  ${result.packageName}: ${result.version}`);
          }
        }
      }
    } catch (error) {
      logger.error(
        "Release failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
