import { Command } from "commander";
import { ChangelogService } from "../core/changelog";
import { loadConfig } from "../core/config";
import { GitService } from "../core/git";
import { WorkspaceIntegrityService } from "../core/integrity";
import {
  PackageManagerFactory,
  PackageManagerService,
} from "../core/package-manager";
import { VersionService } from "../core/version";
import { WorkspaceService } from "../core/workspace";
import type {
  PackageContext,
  PackageManager,
  ReleaseConfig,
} from "../types/config";
import { detectPackageManager } from "../utils/detect-package-manager";
import { Logger } from "../utils/logger";

interface ValidateCommandOptions {
  all?: boolean;
  // Individual validation flags
  authOnly?: boolean;
  gitOnly?: boolean;
  depsOnly?: boolean;
  versionOnly?: boolean;
  changelogOnly?: boolean;
  publishOnly?: boolean;
  // Skip flags
  skipAuth?: boolean;
  skipGit?: boolean;
  skipDeps?: boolean;
  skipVersion?: boolean;
  skipChangelog?: boolean;
  skipPublish?: boolean;
  // Additional skip options
  skipUpstreamTracking?: boolean;
  skipPublishCheck?: boolean;
  skipDependencyCheck?: boolean;
}

export class ValidateCommand {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly gitService: GitService,
    private readonly logger: Logger,
    private readonly packageManager: PackageManager = detectPackageManager(
      process.cwd(),
    ),
  ) {}

  async validate(
    packages: string[],
    options: ValidateCommandOptions,
  ): Promise<void> {
    try {
      // Get packages to validate
      const packagesToValidate = options.all
        ? await this.workspaceService.getPackages()
        : await this.workspaceService.getPackages(packages);

      if (packagesToValidate.length === 0) {
        this.logger.error("No packages found to validate");
        process.exit(1);
      }

      this.logger.info("Validating packages...");

      for (const pkg of packagesToValidate) {
        await this.validatePackage(pkg, options);
      }

      this.logger.success("\nAll validations passed successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("\nValidation failed:", errorMessage);
      process.exit(1);
    }
  }

  private async validatePackage(
    pkg: PackageContext,
    options: ValidateCommandOptions,
  ): Promise<void> {
    this.logger.info(`\nValidating ${pkg.name}...`);
    const packageConfig = await this.workspaceService.getPackageConfig(
      pkg.name,
    );
    const rootDir = await this.workspaceService.getRootDir();

    // Initialize services
    const packageManagerService = PackageManagerFactory.create(
      this.packageManager,
      packageConfig.npm,
    );
    const integrityService = new WorkspaceIntegrityService(
      packageManagerService,
      this.logger,
    );
    const versionService = new VersionService(packageConfig.git);
    const changelogService = new ChangelogService(
      this.logger,
      this.workspaceService,
    );

    // Check if any "only" flags are set
    const onlyMode =
      options.authOnly ||
      options.gitOnly ||
      options.depsOnly ||
      options.versionOnly ||
      options.changelogOnly ||
      options.publishOnly;

    // Determine what to validate
    const shouldValidate = (check: string): boolean => {
      if (onlyMode) {
        // In "only" mode, only run the specifically requested check
        switch (check) {
          case "auth":
            return !!options.authOnly;
          case "git":
            return !!options.gitOnly;
          case "deps":
            return !!options.depsOnly;
          case "version":
            return !!options.versionOnly;
          case "changelog":
            return !!options.changelogOnly;
          case "publish":
            return !!options.publishOnly;
          default:
            return false;
        }
      } else {
        // In normal mode, run all checks except skipped ones
        switch (check) {
          case "auth":
            return !options.skipAuth;
          case "git":
            return !options.skipGit;
          case "deps":
            return !options.skipDeps;
          case "version":
            return !options.skipVersion;
          case "changelog":
            return !options.skipChangelog;
          case "publish":
            return !options.skipPublish;
          default:
            return true;
        }
      }
    };

    // Run validations based on options
    if (shouldValidate("git")) {
      await this.validateGitStatus(options);
    }
    if (shouldValidate("auth") || shouldValidate("publish")) {
      await this.validatePackageManager(
        packageManagerService,
        packageConfig,
        pkg,
        options,
      );
    }
    if (shouldValidate("deps")) {
      await this.validateDependencies(integrityService, options);
    }
    if (shouldValidate("version")) {
      this.validateVersioning(versionService, pkg);
    }
    if (shouldValidate("changelog")) {
      await this.validateChangelog(
        changelogService,
        pkg,
        packageConfig,
        rootDir,
      );
    }
  }

  private async validateGitStatus(
    options: ValidateCommandOptions,
  ): Promise<void> {
    try {
      await this.gitService.validateStatus({
        skipUpstreamTracking: !!options.skipUpstreamTracking,
      });
      this.logger.success("Git status: OK");
    } catch (error) {
      this.logger.error(
        `Git status: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async validatePackageManager(
    packageManager: PackageManagerService,
    config: ReleaseConfig,
    pkg: PackageContext,
    options: ValidateCommandOptions,
  ): Promise<void> {
    if (!config.npm.publish) {
      return;
    }

    try {
      // First validate authentication
      try {
        await packageManager.validateAuth(config);
        this.logger.success("Package manager authentication: OK");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          error instanceof Error &&
          error.message.includes("No authentication configured")
        ) {
          throw new Error(
            `Authentication not configured for ${config.packageManager}.\n` +
              "Please configure authentication:\n" +
              "- For Yarn Berry: Add npmAuthToken to .yarnrc.yml\n" +
              "- For Yarn Classic: Run 'yarn login'\n" +
              "- For NPM: Run 'npm login'",
          );
        }
        throw new Error(`Authentication failed: ${errorMessage}`);
      }

      // Then validate publish readiness if needed
      if (!options.skipPublishCheck) {
        // Check if package exists and version is unique
        const latestVersion = await packageManager.getLatestVersion(
          pkg.name,
          config,
        );
        if (latestVersion === pkg.currentVersion) {
          throw new Error(
            `Version ${pkg.currentVersion} already exists in registry. ` +
              "Please increment the version number before publishing.",
          );
        }

        // Validate package can be packed
        try {
          await packageManager.pack(pkg);
          this.logger.success("Package pack validation: OK");
        } catch (error) {
          throw new Error(
            `Failed to pack package: ${error instanceof Error ? error.message : String(error)}\n` +
              "Please ensure all required files are present and build artifacts are generated.",
          );
        }

        this.logger.success("Package publish readiness: OK");
      }
    } catch (error) {
      this.logger.error(
        `Package manager validation: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async validateDependencies(
    integrityService: WorkspaceIntegrityService,
    options: ValidateCommandOptions,
  ): Promise<void> {
    if (options.skipDependencyCheck) {
      return;
    }

    try {
      const result = await integrityService.checkWithDetails(true);
      if (!result.isValid) {
        const messages = result.issues
          .map(
            (issue) =>
              `${issue.severity.toUpperCase()}: ${issue.message}${issue.solution ? `\nSolution: ${issue.solution}` : ""}`,
          )
          .join("\n");
        throw new Error(`Dependency validation failed:\n${messages}`);
      }
      this.logger.success("Dependencies validation: OK");
    } catch (error) {
      this.logger.error(
        `Dependencies validation: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private validateVersioning(
    versionService: VersionService,
    pkg: PackageContext,
  ): void {
    try {
      versionService.validateVersion(pkg.currentVersion);
      this.logger.success("Version format validation: OK");
    } catch (error) {
      this.logger.error(
        `Version validation: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async validateChangelog(
    changelogService: ChangelogService,
    pkg: PackageContext,
    config: ReleaseConfig,
    rootDir: string,
  ): Promise<void> {
    try {
      await changelogService.validate(pkg, config, rootDir);
      this.logger.success("Changelog validation: OK");
    } catch (error) {
      this.logger.error(
        `Changelog validation: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}

export const validateCommand = new Command()
  .name("validate")
  .description(
    "Validate package(s) release readiness. If no package is specified, validates the current package.",
  )
  .argument(
    "[packages...]",
    "Package names to validate (defaults to current package)",
  )
  .option("-a, --all", "Validate all packages in the workspace")
  // Individual validation options
  .option("--auth-only", "Only validate package manager authentication")
  .option("--git-only", "Only validate Git status and upstream tracking")
  .option("--deps-only", "Only validate workspace dependencies")
  .option("--version-only", "Only validate version format")
  .option("--changelog-only", "Only validate changelog")
  .option(
    "--publish-only",
    "Only validate publish readiness (version uniqueness, pack)",
  )
  // Skip options
  .option("--skip-auth", "Skip package manager authentication check")
  .option("--skip-git", "Skip Git status and upstream tracking check")
  .option("--skip-deps", "Skip workspace dependency validation")
  .option("--skip-version", "Skip version format validation")
  .option("--skip-changelog", "Skip changelog validation")
  .option("--skip-publish", "Skip publish readiness validation")
  .addHelpText(
    "after",
    `
Available validations:
  - auth:      Package manager authentication
  - git:       Git status and upstream tracking
  - deps:      Workspace dependencies integrity
  - version:   Version format
  - changelog: Changelog existence and format
  - publish:   Publish readiness (version uniqueness, pack validation)

Examples:
  $ publisher validate                  # Validate current package (all checks)
  $ publisher validate pkg1 pkg2        # Validate specific packages
  $ publisher validate --all            # Validate all workspace packages
  $ publisher validate --auth-only      # Only check authentication
  $ publisher validate --git-only       # Only check Git status
  $ publisher validate --skip-git       # Run all checks except Git
  $ publisher validate --skip-git --skip-publish  # Skip multiple checks`,
  )
  .action(
    async (packages: string[], commandOptions: ValidateCommandOptions) => {
      const logger = new Logger();
      const config = await loadConfig();
      const rootDir = process.cwd();
      const packageManager = detectPackageManager(rootDir);

      const workspaceService = new WorkspaceService(config, logger);
      const gitService = new GitService(config.git, rootDir);

      const validateCommand = new ValidateCommand(
        workspaceService,
        gitService,
        logger,
        packageManager,
      );

      try {
        // If no packages specified and not --all flag, try to get current package
        if (packages.length === 0 && !commandOptions.all) {
          const currentPackage = await workspaceService.getCurrentPackage();
          if (currentPackage) {
            packages = [currentPackage.name];
          }
        }

        await validateCommand.validate(packages, commandOptions);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error("Validation failed:", errorMessage);
        process.exit(1);
      }
    },
  );

export async function validateChangelogs(
  packages: PackageContext[],
  config: ReleaseConfig,
  monorepoRoot: string,
): Promise<void> {
  const changelogService = new ChangelogService();

  if (!packages || packages.length === 0) {
    throw new Error("No packages found to validate");
  }

  for (const pkg of packages) {
    if (!pkg.path) {
      throw new Error(`Invalid package path for ${pkg.name}`);
    }

    await changelogService.validate(pkg, config, monorepoRoot);
  }
}
