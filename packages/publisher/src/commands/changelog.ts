import chalk from "chalk";
import { Command } from "commander";
import { ChangelogService } from "../core/changelog";
import { loadConfig } from "../core/config";
import { GitService, type GitCommit } from "../core/git";
import { PackageManagerFactory } from "../core/package-manager";
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
      const git = new GitService(config.git, process.cwd(), logger);
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
        logger.debug(`Using last tag: ${lastTag}`);

        // Get commits since last tag with proper typing
        let gitChanges: GitCommit[] = lastTag
          ? await git.getCommitsSinceTag(lastTag)
          : await git.getAllCommits();

        // Filter commits by package if requested
        if (options.filterByPackage) {
          gitChanges = gitChanges.filter((commit) =>
            commit.files.some((file) => file.startsWith(pkg.path)),
          );
        }

        // Preview the changes
        logger.info(`\n📦 ${chalk.bold(pkg.name)}`);
        logger.info(`Package version: ${packageJsonVersion || "Not found"}`);
        logger.info(
          `Latest changelog version: ${latestChangelogVersion || "None"}`,
        );
        logger.info(
          `Latest published version: ${latestPublishedVersion || "None"}`,
        );
        logger.info(`Latest git tag: ${lastTag || "None"}`);

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

        logger.info(`Target version: ${pkg.newVersion || "Not specified"}`);
        logger.info("\nChangelog Preview:");
        logger.info(chalk.gray("----------------------------------------"));

        if (gitChanges.length > 0) {
          // Get package config for changelog format
          const packageConfig = await workspaceService.getPackageConfig(
            pkg.name,
          );
          const format = packageConfig.changelogFormat || "conventional";

          // Format commits based on changelog type
          const formattedChanges = formatCommitsForChangelog(
            gitChanges,
            format,
          );

          logger.info("\nSuggested entries for [Unreleased] section:");
          logger.info(formattedChanges);

          logger.info("\nOriginal Git Commits:");
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

      const monorepRoot = await workspaceService.getRootDir();

      for (const pkg of packagesToValidate) {
        const packageConfig = await workspaceService.getPackageConfig(pkg.name);
        await changelogService.validate(pkg, packageConfig, monorepRoot);
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
  .description("Check for unreleased changes and git commits discrepancies")
  .argument("[packages...]", "Package names to check")
  .option("-a, --all", "Check all packages")
  .action(async (packages: string[], options: ChangelogCommandOptions) => {
    const logger = new Logger();
    try {
      const config = await loadConfig();
      const workspaceService = new WorkspaceService(config, logger);
      const git = new GitService(config.git, process.cwd(), logger);
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

interface FormattedChanges {
  Added: string[];
  Changed: string[];
  Deprecated: string[];
  Removed: string[];
  Fixed: string[];
  Security: string[];
}

type SectionKey = keyof FormattedChanges;
type SectionEntry = [SectionKey, string[]];

function formatCommitsForChangelog(
  commits: Array<{ message: string; files: string[] }>,
  format: "conventional" | "keep-a-changelog",
): string {
  if (format === "keep-a-changelog") {
    const sections: FormattedChanges = {
      Added: [],
      Changed: [],
      Deprecated: [],
      Removed: [],
      Fixed: [],
      Security: [],
    };

    for (const commit of commits) {
      const message = commit.message.trim();
      if (message.startsWith("feat")) {
        sections.Added.push(message.replace(/^feat(\([^)]+\))?:/, "").trim());
      } else if (message.startsWith("fix")) {
        sections.Fixed.push(message.replace(/^fix(\([^)]+\))?:/, "").trim());
      } else if (
        message.startsWith("chore") ||
        message.startsWith("refactor") ||
        message.startsWith("docs")
      ) {
        sections.Changed.push(
          message.replace(/^(chore|refactor|docs)(\([^)]+\))?:/, "").trim(),
        );
      } else if (message.startsWith("deprecated")) {
        sections.Deprecated.push(
          message.replace(/^deprecated(\([^)]+\))?:/, "").trim(),
        );
      } else if (message.startsWith("removed")) {
        sections.Removed.push(
          message.replace(/^removed(\([^)]+\))?:/, "").trim(),
        );
      } else if (message.startsWith("security")) {
        sections.Security.push(
          message.replace(/^security(\([^)]+\))?:/, "").trim(),
        );
      } else {
        sections.Changed.push(message);
      }
    }

    const formattedSections = (Object.entries(sections) as SectionEntry[])
      .filter(([_, items]) => items.length > 0)
      .map(([section, items]) => {
        const formattedItems = items.map((item) => `- ${item}`);
        return `### ${section}\n${formattedItems.join("\n")}`;
      });

    return formattedSections.join("\n\n");
  } else {
    // Conventional format
    return commits
      .map((commit) => {
        const message = commit.message.trim();
        return `- ${message}`;
      })
      .join("\n");
  }
}
