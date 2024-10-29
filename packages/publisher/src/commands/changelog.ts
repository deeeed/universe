import { Command } from "commander";
import { loadConfig } from "../core/config";
import { ChangelogService } from "../core/changelog";
import { WorkspaceService } from "../core/workspace";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { GitService, type GitCommit } from "../core/git";

interface ChangelogCommandOptions {
  format?: "conventional" | "keep-a-changelog";
  dryRun?: boolean;
  version?: string;
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
  .action(async (packages: string[], options: ChangelogCommandOptions) => {
    const logger = new Logger();
    try {
      const config = await loadConfig();
      const workspaceService = new WorkspaceService(config);
      const changelogService = new ChangelogService(logger);
      const git = new GitService(config.git, process.cwd());

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
        const packageConfig = await workspaceService.getPackageConfig(pkg.name);

        // Set new version if provided
        if (options.version) {
          pkg.newVersion = options.version;
        }

        // Generate changelog content
        const changelogContent = await changelogService.generate(
          pkg,
          packageConfig,
        );

        // Preview the changes
        logger.info(`\n📦 ${chalk.bold(pkg.name)}`);
        logger.info(`Current version: ${pkg.currentVersion}`);
        logger.info(`Target version: ${pkg.newVersion || "Not specified"}`);
        logger.info("\nChangelog Preview:");
        logger.info(chalk.gray("----------------------------------------"));
        logger.info(changelogContent);
        logger.info(chalk.gray("----------------------------------------"));

        // Show git changes if available
        const lastTag = await git.getLastTag(pkg.name);
        const gitChanges: GitCommit[] = await git.getCommitsSinceTag(lastTag);

        if (gitChanges.length > 0) {
          logger.info("\nGit Commits:");
          for (const commit of gitChanges) {
            logger.info(`  - ${commit.message}`);
          }
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
