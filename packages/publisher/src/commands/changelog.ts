import chalk from "chalk";
import { Command } from "commander";
import { ChangelogService } from "../core/changelog";
import { loadConfig } from "../core/config";
import { GitService, type GitCommit } from "../core/git";
import { PackageManagerFactory } from "../core/package-manager";
import { ReleaseService } from "../core/release";
import { WorkspaceService } from "../core/workspace";
import { PackageContext } from "../types/config";
import { Logger } from "../utils/logger";

interface ChangelogCommandOptions {
  format?: "conventional" | "keep-a-changelog";
  dryRun?: boolean;
  version?: string;
  all?: boolean;
  filterByPackage?: boolean;
}

export const changelogCommand = new Command()
  .name("changelog")
  .description("Manage and preview changelog updates");

changelogCommand
  .command("preview")
  .description(
    "Preview changelog updates for packages. When run from within a package directory, defaults to the current package. " +
      "In monorepo root, requires package names.",
  )
  .argument(
    "[packages...]",
    "Package names to preview changelog for (optional when in package directory)",
  )
  .option("-f, --format <format>", "Changelog format to use")
  .option("-v, --version <version>", "Specify version explicitly")
  .option(
    "--filter-by-package",
    "Only show commits that modified files in the package directory",
    false,
  )
  .action(async (packages: string[], options: ChangelogCommandOptions) => {
    const logger = new Logger();

    try {
      const config = await loadConfig();
      const workspaceService = new WorkspaceService(config, logger);
      const git = new GitService(
        config.git,
        workspaceService.getRootDir(),
        logger,
      );
      const changelogService = new ChangelogService(logger);

      // Create package manager service
      const packageManager = PackageManagerFactory.create(
        config.packageManager || "yarn",
        config.npm,
      );

      // If no packages specified, try to get current package
      if (packages.length === 0) {
        const currentPackage = await workspaceService.getCurrentPackage();
        if (currentPackage) {
          packages = [currentPackage.name];
        }
      }

      // Get packages to analyze
      const packagesToAnalyze = await workspaceService.getPackages(packages);

      if (packagesToAnalyze.length === 0) {
        logger.error(
          "No packages to analyze. Run from within a package directory or specify package names.",
        );
        process.exit(1);
      }

      for (const pkg of packagesToAnalyze) {
        // Get package.json version
        const packageJson = await workspaceService.readPackageJson(pkg.path);
        const packageJsonVersion = packageJson.version;

        // Get latest changelog version using changelog service
        const latestChangelogVersion =
          await changelogService.getLatestVersion(pkg);

        // Get latest published version
        const latestPublishedVersion = await packageManager.getLatestVersion(
          pkg.name,
          { npm: config.npm },
        );

        // Set new version if provided
        if (options.version) {
          pkg.newVersion = options.version;
        }

        // Get last git tag
        const lastTag = await git.getLastTag(pkg.name);
        if (!lastTag) {
          logger.info(
            `No previous tags found for ${pkg.name}. Will analyze all commits.`,
          );
        } else {
          logger.debug(`Using last tag: ${lastTag}`);
        }

        // Get commits since last tag with proper typing
        const gitChanges: GitCommit[] = lastTag
          ? await git.getCommitsSinceTag(lastTag, {
              packageName: pkg.name,
              packagePath: pkg.path,
              filterByPath: options.filterByPackage,
            })
          : await git.getAllCommits();

        if (gitChanges.length === 0) {
          logger.info("No commits found to analyze.");
          continue;
        }

        // Preview the changes
        logger.info(`\n📦 ${chalk.bold(pkg.name)}`);
        logger.info(`Package version: ${packageJsonVersion ?? "Not found"}`);
        logger.info(
          `Latest changelog version: ${latestChangelogVersion ?? "None"}`,
        );
        logger.info(
          `Latest published version: ${latestPublishedVersion ?? "None"}`,
        );
        logger.info(`Latest git tag: ${lastTag ?? "None"}`);

        // Version mismatch warnings using logger.warn
        if (
          packageJsonVersion &&
          latestChangelogVersion &&
          packageJsonVersion !== latestChangelogVersion
        ) {
          logger.warn(
            `Package.json version (${packageJsonVersion}) doesn't match changelog version (${latestChangelogVersion})`,
          );
        }
        if (
          packageJsonVersion &&
          latestPublishedVersion &&
          packageJsonVersion === latestPublishedVersion
        ) {
          logger.warn(
            `Package.json version (${packageJsonVersion}) matches published version. Should it be bumped?`,
          );
        }

        logger.info(`Target version: ${pkg.newVersion ?? "Not specified"}`);
        logger.info("\nChangelog Preview:");
        logger.info(chalk.gray("----------------------------------------"));

        if (gitChanges.length > 0) {
          // Get package config for changelog format
          const packageConfig = await workspaceService.getPackageConfig(
            pkg.name,
          );
          const preview = await changelogService.previewNewVersion(
            pkg,
            packageConfig,
            {
              newVersion: pkg.newVersion ?? "x.x.x",
              conventionalCommits: packageConfig.conventionalCommits,
              format: packageConfig.changelogFormat,
              date: new Date().toISOString(),
            },
          );

          logger.info("\nSuggested changelog entry:");
          logger.info(preview);

          logger.info("\nMatching Git Commits:");
          for (const commit of gitChanges) {
            logger.info(
              `  - ${commit.message} (${commit.files.length} files changed)`,
            );
          }
        } else {
          logger.info("No new commits since last release");
        }
      }
    } catch (error) {
      logger.error(
        "Preview failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

changelogCommand
  .command("validate")
  .description("Validate changelog files")
  .argument("[packages...]", "Package names to validate (optional)")
  .option("-a, --all", "Validate all packages")
  .action(async (packages: string[], options: ChangelogCommandOptions) => {
    const logger = new Logger();
    try {
      const config = await loadConfig();
      const workspaceService = new WorkspaceService(config);
      const changelogService = new ChangelogService(logger);

      // Get packages to validate
      let packagesToValidate: PackageContext[] = [];
      if (options.all) {
        packagesToValidate = await workspaceService.getPackages();
      } else if (packages.length === 0) {
        const currentPackage = await workspaceService.getCurrentPackage();
        if (currentPackage) {
          packagesToValidate = [currentPackage];
        }
      } else {
        packagesToValidate = await workspaceService.getPackages(packages);
      }

      if (packagesToValidate.length === 0) {
        logger.error("No packages found to validate");
        process.exit(1);
      }

      logger.info("Validating changelogs...");

      for (const pkg of packagesToValidate) {
        const packageConfig = await workspaceService.getPackageConfig(pkg.name);
        await changelogService.validate(pkg, packageConfig);
        logger.success(`✓ ${pkg.name}: Changelog is valid`);
      }

      logger.success("\nAll changelog validations passed successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("\nChangelog validation failed:", errorMessage);
      process.exit(1);
    }
  });

changelogCommand
  .command("check")
  .description("Check changelog status for packages")
  .argument("[packages...]", "Package names to check")
  .option("-a, --all", "Check all packages")
  .action(async (packages: string[], options: ChangelogCommandOptions) => {
    const logger = new Logger();
    try {
      const config = await loadConfig();
      const workspaceService = new WorkspaceService(config, logger);
      const git = new GitService(
        config.git,
        workspaceService.getRootDir(),
        logger,
      );
      const changelogService = new ChangelogService(logger);

      // Get packages to check
      let packagesToCheck = options.all
        ? await workspaceService.getPackages()
        : await workspaceService.getPackages(packages);

      if (packages.length === 0 && !options.all) {
        const currentPackage = await workspaceService.getCurrentPackage();
        if (currentPackage) {
          packagesToCheck = [currentPackage];
        }
      }

      if (packagesToCheck.length === 0) {
        logger.error("No packages found to check");
        process.exit(1);
      }

      for (const pkg of packagesToCheck) {
        logger.info(`\n📦 Checking ${chalk.bold(pkg.name)}...`);

        const packageConfig = await workspaceService.getPackageConfig(pkg.name);

        // Get unreleased changes
        const unreleasedChanges = await changelogService.getUnreleasedChanges(
          pkg,
          packageConfig,
        );

        // Get git changes
        const lastTag = await git.getLastTag(pkg.name);
        const gitChanges = await git.getCommitsSinceTag(lastTag);

        logger.info("\nUnreleased Changes in Changelog:");
        if (unreleasedChanges.length > 0) {
          unreleasedChanges.forEach((change) => logger.info(`  - ${change}`));
        } else {
          logger.info("  No unreleased changes found");
        }

        logger.info("\nGit Commits Since Last Release:");
        if (gitChanges.length > 0) {
          gitChanges.forEach((commit) =>
            logger.info(`  - ${commit.message} (${commit.files.length} files)`),
          );
        } else {
          logger.info("  No new commits found");
        }

        // Check for discrepancies
        if (unreleasedChanges.length === 0 && gitChanges.length > 0) {
          logger.warn(
            "\nWarning: Found git commits but no unreleased changes in changelog",
          );
        }
      }
    } catch (error) {
      logger.error(
        "Check failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

interface ReleasePreviewPackage {
  name: string;
  currentVersion: string;
  suggestedVersion: string;
  hasGitChanges: boolean;
  dependencies: Array<{
    name: string;
    currentVersion: string;
    newVersion: string;
  }>;
}

changelogCommand
  .command("release-preview")
  .description(
    "Preview changelog updates in release format, including dependency updates and git changes",
  )
  .argument(
    "[packages...]",
    "Package names to preview changelog for (optional when in package directory)",
  )
  .option("-v, --version <version>", "Specify version explicitly")
  .action(async (packages: string[]) => {
    const logger = new Logger();
    try {
      const config = await loadConfig();
      const releaseService = new ReleaseService(config, logger);
      const workspaceService = new WorkspaceService(config, logger);

      if (packages.length === 0) {
        const currentPackage = await workspaceService.getCurrentPackage();
        if (currentPackage) {
          packages = [currentPackage.name];
        }
      }

      // Get packages to analyze
      const packagesToAnalyze = await workspaceService.getPackages(packages);
      const previewResults: ReleasePreviewPackage[] = [];

      // Build preview data for each package
      for (const pkg of packagesToAnalyze) {
        const gitChanges = await releaseService.getGitChanges(pkg.name);
        const packageJson = await workspaceService.readPackageJson(pkg.path);

        // Ensure version is defined
        const currentVersion = packageJson.version ?? "0.0.0";
        const suggestedVersion = pkg.newVersion ?? currentVersion;

        previewResults.push({
          name: pkg.name,
          currentVersion,
          suggestedVersion,
          hasGitChanges: gitChanges.length > 0,
          dependencies: [], // We don't have access to dependency updates in the core service
        });
      }

      // Display preview for each package
      for (const pkg of previewResults) {
        logger.info(`\n📦 ${pkg.name}`);
        logger.info(`  Current version: ${pkg.currentVersion}`);
        logger.info(`  Suggested version: ${pkg.suggestedVersion}`);

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

        // if (pkg.hasGitChanges) {
        //   logger.info("\n  📝 Git Changes:");
        //   const gitChanges = await releaseService.getGitChanges(pkg.name);
        //   for (const commit of gitChanges) {
        //     logger.info(`    - ${commit.message}`);
        //   }
        // }
      }
    } catch (error) {
      logger.error(
        "Preview failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

changelogCommand
  .command("update")
  .description("Update changelog with recent commits in the unreleased section")
  .argument(
    "[packages...]",
    "Package names to update changelog for (optional when in package directory)",
  )
  .action(async (packages: string[]) => {
    const logger = new Logger();
    try {
      const config = await loadConfig();
      const workspaceService = new WorkspaceService(config, logger);
      const git = new GitService(
        config.git,
        workspaceService.getRootDir(),
        logger,
      );
      const changelogService = new ChangelogService(logger);

      // Get packages to update
      let packagesToUpdate: PackageContext[] = [];
      if (packages.length === 0) {
        const currentPackage = await workspaceService.getCurrentPackage();
        if (currentPackage) {
          packagesToUpdate = [currentPackage];
        }
      } else {
        packagesToUpdate = await workspaceService.getPackages(packages);
      }

      if (packagesToUpdate.length === 0) {
        logger.error("No packages found to update");
        process.exit(1);
      }

      for (const pkg of packagesToUpdate) {
        logger.info(`\n📦 Updating changelog for ${chalk.bold(pkg.name)}...`);

        const packageConfig = await workspaceService.getPackageConfig(pkg.name);
        const lastTag = await git.getLastTag(pkg.name);
        const commits = await git.getCommitsSinceTag(lastTag, {
          packageName: pkg.name,
          packagePath: pkg.path,
          filterByPath: true,
        });

        if (commits.length === 0) {
          logger.info("No new commits to add to changelog");
          continue;
        }

        // Get repository URL for commit links
        const repoUrl = await changelogService.getRepositoryUrl(
          pkg,
          packageConfig,
        );

        // Format commits with URLs
        const formattedCommits = commits.map((commit) => {
          const commitUrl = `${repoUrl}/commit/${commit.hash}`;
          return `- ${commit.message} ([${commit.hash.substring(0, 7)}](${commitUrl}))`;
        });

        // Update the changelog
        await changelogService.addToUnreleased(pkg, formattedCommits);
        logger.success(`Updated changelog with ${commits.length} new commits`);
      }
    } catch (error) {
      logger.error(
        "Update failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
