import fs from "fs/promises";
import path from "path";
import type {
  DryRunOptions,
  DryRunReport,
  MonorepoConfig,
  PackageChanges,
  PackageContext,
  ReleaseConfig,
  ReleaseResult,
} from "../types/config";
import { findMonorepoRootSync } from "../utils";
import { Logger } from "../utils/logger";
import { Prompts } from "../utils/prompt";
import { ChangelogService } from "./changelog";
import { GitService } from "./git";
import { WorkspaceIntegrityService } from "./integrity";
import {
  PackageManagerFactory,
  PackageManagerService,
} from "./package-manager";
import { VersionService } from "./version";
import { WorkspaceService } from "./workspace";

export class ReleaseService {
  private git: GitService;
  private packageManager: PackageManagerService;
  private version: VersionService;
  private changelog: ChangelogService;
  private workspace: WorkspaceService;
  private prompts: Prompts;
  private integrityService: WorkspaceIntegrityService;
  private rootDir: string;

  constructor(
    private config: MonorepoConfig,
    private logger: Logger,
  ) {
    if (!["npm", "yarn"].includes(config.packageManager)) {
      logger.warning('Invalid package manager specified, defaulting to "yarn"');
      this.config.packageManager = "yarn";
    }

    this.rootDir = findMonorepoRootSync(process.cwd());
    this.git = new GitService(config.git, this.rootDir, this.logger);
    this.packageManager = PackageManagerFactory.create(
      config.packageManager,
      config.npm,
    );
    this.version = new VersionService(config.git);
    this.workspace = new WorkspaceService(config, this.logger);
    this.changelog = new ChangelogService(
      this.logger,
      this.workspace,
      this.git,
    );
    this.prompts = new Prompts(this.logger);
    this.integrityService = new WorkspaceIntegrityService(
      this.packageManager,
      this.logger,
    );
  }
  async releasePackages(
    packageNames: string[],
    options: {
      dryRun?: boolean;
      gitPush?: boolean;
      npmPublish?: boolean;
      checkIntegrity?: boolean;
      skipGitCheck?: boolean;
      skipUpstreamTracking?: boolean;
      allowBranch?: boolean;
    },
  ): Promise<Array<ReleaseResult | DryRunReport>> {
    this.logger.info("Starting release process...");

    if (options.checkIntegrity) {
      const integrityCheck = await this.integrityService.check();
      if (!integrityCheck) {
        throw new Error(
          "Workspace integrity check failed. Please fix the issues above or run without --check-integrity",
        );
      }
    }

    if (packageNames.length === 0) {
      const currentPackage = await this.workspace.getCurrentPackage();
      if (currentPackage) {
        packageNames = [currentPackage.name];
      }
    }

    this.logger.info(
      `Finding packages matching: ${packageNames.join(", ")}...`,
    );
    const packages = await this.workspace.getPackages(packageNames);

    if (packages.length === 0) {
      this.logger.warning("No matching packages found");
      return [];
    }

    const results: Array<ReleaseResult | DryRunReport> = [];
    for (const pkg of packages) {
      this.logger.info(`\nProcessing package ${pkg.name}...`);
      const result = await this.releasePackage(pkg, {
        ...options,
        publish: options.npmPublish,
      });
      results.push(result);
    }

    return results;
  }

  async releaseAll(options: {
    dryRun?: boolean;
    gitPush?: boolean;
    npmPublish?: boolean;
  }): Promise<Array<ReleaseResult | DryRunReport>> {
    const changedPackages = await this.workspace.getChangedPackages();
    return this.releasePackages(
      changedPackages.map((p) => p.name),
      options,
    );
  }

  private async releasePackage(
    context: PackageContext,
    options: {
      dryRun?: boolean;
      gitPush?: boolean;
      publish?: boolean;
      skipGitCheck?: boolean;
      skipUpstreamTracking?: boolean;
      checkIntegrity?: boolean;
      force?: boolean;
      allowBranch?: boolean;
    },
  ): Promise<ReleaseResult | DryRunReport> {
    let tempFiles: { path: string; content: string }[] = [];
    let previousCommitHash: string | null = null;
    let tagCreated = false;

    try {
      this.logger.info(`Loading package configuration...`);
      const packageConfig = await this.getEffectiveConfig(context.name);

      const changelogPath = path.join(
        context.path,
        packageConfig.changelogFile || "CHANGELOG.md",
      );

      this.logger.debug(`Package path: ${context.path}`);
      this.logger.debug(`Changelog path: ${changelogPath}`);

      this.logger.info("Validating environment...");
      await this.validateEnvironment({
        skipGitCheck: options.skipGitCheck,
        skipUpstreamTracking: options.skipUpstreamTracking,
        checkIntegrity: options.checkIntegrity,
        allowBranch: options.allowBranch,
      });

      this.logger.info("Determining new version...");
      context.newVersion = await this.determineVersion(context, packageConfig);

      previousCommitHash = await this.git.getCurrentCommitHash();

      this.logger.info("Preparing changelog entry...");
      const changelogEntry = await this.prepareChangelogEntry(
        context,
        packageConfig,
      );

      if (!options.dryRun && !(await this.prompts.confirmRelease())) {
        throw new Error("Release cancelled");
      }

      if (options.dryRun) {
        this.logger.info("Generating dry run report...");
        const newVersion =
          context.newVersion ||
          (await this.determineVersion(context, packageConfig));
        const dryRunReport = await this.createDryRunReport(
          context,
          packageConfig,
          {
            dryRun: true,
            ...options,
            newVersion,
          },
        );
        return dryRunReport;
      }

      tempFiles = await this.backupFiles(context, packageConfig);

      await this.runHooks("preRelease", packageConfig, context);
      await this.updateVersion(context, packageConfig);
      await this.updateDependencies(context, packageConfig);

      if (changelogEntry) {
        await this.changelog.update(context, changelogEntry, packageConfig);
      }

      await this.git.createTag(context, options.force);
      tagCreated = true;

      await this.git.commitChanges(context, changelogPath);

      if (options.gitPush && this.config.git?.push !== false) {
        await this.git.push(options.force);
      }

      if (options.publish && this.config.npm?.publish !== false) {
        await this.packageManager.publish(context, { npm: this.config.npm });
      }

      return {
        changelog: changelogEntry ?? "",
        git: {
          tag: context.newVersion,
          commit: previousCommitHash,
        },
        packageName: context.name,
        version: context.newVersion,
      };
    } catch (error) {
      this.logger.error(
        `Release process failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.logger.info("Rolling back changes...");

      if (previousCommitHash) {
        // FIXME: this should only revert what was changed during the release process!!!
        await this.git.resetToCommit(previousCommitHash);
      }

      if (tagCreated && context.newVersion) {
        const tagName = `${context.name}@${context.newVersion}`;
        await this.git.deleteTag(tagName, true);
      }

      for (const file of tempFiles) {
        await fs.writeFile(file.path, file.content, "utf-8");
      }

      throw error;
    }
  }

  private async validateEnvironment(options: {
    skipGitCheck?: boolean;
    skipUpstreamTracking?: boolean;
    checkIntegrity?: boolean;
    allowBranch?: boolean;
  }): Promise<void> {
    const context = await this.workspace.getCurrentPackage();
    if (!context) {
      throw new Error("No package found in current directory");
    }

    await this.validateWithProgress(context, options);
  }

  private async determineVersion(
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<string> {
    if (config.bumpStrategy === "conventional") {
      const analyzedBumpType = await this.version.analyzeCommits(context);
      const bumpType = config.bumpType ?? analyzedBumpType;
      return this.version.determineVersion(
        context,
        bumpType,
        config.preReleaseId,
      );
    }

    if (config.bumpStrategy === "prompt") {
      const bumpType = await this.prompts.getVersionBump(context, this.version);
      return this.version.determineVersion(
        context,
        bumpType,
        config.preReleaseId,
      );
    }

    return this.version.determineVersion(context, "patch", config.preReleaseId);
  }

  private async updateDependencies(
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<void> {
    if (!config.updateDependenciesOnRelease) {
      return;
    }

    const workspaceDependencies = this.getWorkspaceDependencies(context);
    if (workspaceDependencies.length === 0) {
      return;
    }

    const updates = await this.analyzeDependencyUpdates(
      context,
      workspaceDependencies,
    );
    if (updates.length === 0) {
      return;
    }

    let shouldUpdate = false;
    switch (config.dependencyUpdateStrategy) {
      case "auto":
        shouldUpdate = true;
        break;
      case "prompt":
        shouldUpdate = await this.prompts.confirmDependencyUpdates(
          context.name,
          updates,
        );
        break;
      case "none":
      default:
        shouldUpdate = false;
        break;
    }

    if (shouldUpdate) {
      await this.packageManager.updateDependencies(
        context,
        workspaceDependencies,
      );
    }
  }

  private getWorkspaceDependencies(context: PackageContext): string[] {
    const allDependencies = {
      ...context.dependencies,
      ...context.devDependencies,
      ...context.peerDependencies,
    };

    return Object.keys(allDependencies).filter(
      (dep) =>
        dep.startsWith("@siteed/") || // Adjust this prefix based on your workspace
        dep.startsWith("@your-scope/"), // Add any other relevant scopes
    );
  }

  private async runHooks(
    hookName: keyof ReleaseConfig["hooks"],
    config: ReleaseConfig,
    context: PackageContext,
  ): Promise<void> {
    const hook = config.hooks[hookName];
    if (hook) {
      this.logger.info(`Running ${hookName} hook...`);
      await hook(context);
    }
  }

  private async getEffectiveConfig(
    packageName: string,
  ): Promise<ReleaseConfig> {
    const packageConfig = await this.workspace.getPackageConfig(packageName);
    const packagePattern = Object.keys(this.config.packages).find((pattern) =>
      this.matchPackagePattern(packageName, pattern),
    );

    const patternConfig = packagePattern
      ? this.config.packages[packagePattern]
      : {};

    return {
      ...this.config,
      ...patternConfig,
      ...packageConfig,
      packageManager: this.config.packageManager as "npm" | "yarn",
    };
  }

  private matchPackagePattern(packageName: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".")
      .replace(/\//g, "\\/");
    return new RegExp(`^${regexPattern}$`).test(packageName);
  }

  private async createDryRunReport(
    context: PackageContext,
    config: ReleaseConfig,
    options: DryRunOptions,
  ): Promise<DryRunReport> {
    const tagName = this.git.getTagName(context.name, options.newVersion);
    const currentCommit = await this.git.getCurrentCommitHash();

    // Generate the changelog content
    const changelogContent =
      options.changelog ??
      (await this.changelog.previewNewVersion(context, config, {
        newVersion: options.newVersion,
        conventionalCommits: config.conventionalCommits || false,
        format: config.changelogFormat || "conventional",
        includeEmptySections: config.changelogFormat === "keep-a-changelog",
      }));

    // Get dependency updates
    const dependencyUpdates = await this.analyzeDependencyUpdates(
      context,
      this.getWorkspaceDependencies(context),
    );

    return {
      packageName: context.name,
      currentVersion: context.currentVersion,
      newVersion: options.newVersion,
      changelog: changelogContent,
      git: {
        tag: tagName,
        commit: currentCommit,
        willPush: config.git.push,
      },
      npm: {
        willPublish: config.npm.publish,
        registry: config.npm.registry,
        tag: config.npm.tag,
      },
      dependencies: dependencyUpdates,
    };
  }

  async analyzeChanges(packageNames: string[]): Promise<PackageChanges[]> {
    const packages = await this.workspace.getPackages(packageNames);
    const changes: PackageChanges[] = [];

    for (const pkg of packages) {
      const packageConfig = await this.getEffectiveConfig(pkg.name);
      const suggestedVersion = await this.determineSuggestedVersion(
        pkg,
        packageConfig,
      );
      const gitChanges = await this.git.hasChanges(pkg.path);
      const changelogEntries = await this.changelog.getUnreleasedChanges(
        pkg,
        packageConfig,
      );

      // Get workspace dependencies that need updates
      const workspaceDeps = this.getWorkspaceDependencies(pkg);
      const dependencyUpdates = await this.analyzeDependencyUpdates(
        pkg,
        workspaceDeps,
      );

      changes.push({
        name: pkg.name,
        path: pkg.path,
        currentVersion: pkg.currentVersion,
        suggestedVersion,
        dependencies: dependencyUpdates,
        devDependencies: pkg.devDependencies ?? {},
        peerDependencies: pkg.peerDependencies ?? {},
        hasGitChanges: gitChanges,
        changelogEntries,
      });
    }

    return changes;
  }

  private async determineSuggestedVersion(
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<string> {
    if (config.bumpStrategy === "conventional") {
      const bumpType =
        config.bumpType ?? (await this.version.analyzeCommits(context));
      return this.version.determineVersion(
        context,
        bumpType,
        config.preReleaseId,
      );
    }
    return this.version.determineVersion(context, "patch", config.preReleaseId);
  }

  private async analyzeDependencyUpdates(
    context: PackageContext,
    dependencies: string[],
  ): Promise<
    Array<{
      name: string;
      currentVersion: string;
      newVersion: string;
      type: "dependencies" | "devDependencies" | "peerDependencies";
    }>
  > {
    const updates = [];
    for (const dep of dependencies) {
      let depType:
        | "dependencies"
        | "devDependencies"
        | "peerDependencies"
        | undefined;
      let currentVersion: string | undefined;

      if (context.dependencies?.[dep]) {
        depType = "dependencies";
        currentVersion = context.dependencies[dep];
      } else if (context.devDependencies?.[dep]) {
        depType = "devDependencies";
        currentVersion = context.devDependencies[dep];
      } else if (context.peerDependencies?.[dep]) {
        depType = "peerDependencies";
        currentVersion = context.peerDependencies[dep];
      }

      if (currentVersion && depType) {
        const latestVersion = await this.packageManager.getLatestVersion(dep);
        if (latestVersion !== currentVersion) {
          updates.push({
            name: dep,
            currentVersion,
            newVersion: latestVersion,
            type: depType,
          });
        }
      }
    }
    return updates;
  }

  async getGitChanges(
    packageName: string,
  ): Promise<Array<{ message: string }>> {
    const packages = await this.workspace.getPackages([packageName]);
    const pkg = packages[0];

    if (!pkg) {
      return [];
    }

    const lastTag = await this.git.getLastTag(packageName);
    return this.git.getCommitsSinceTag(lastTag, {
      packageName: pkg.name,
      packagePath: pkg.path,
      filterByPath: true,
    });
  }

  async previewChangelog(packageName: string): Promise<string> {
    const packages = await this.workspace.getPackages([packageName]);
    if (packages.length === 0) {
      throw new Error(`Package ${packageName} not found`);
    }

    const packageConfig = await this.getEffectiveConfig(packageName);
    return this.changelog.previewNewVersion(packages[0], packageConfig, {
      newVersion: packages[0].newVersion ?? "x.x.x",
      conventionalCommits: packageConfig.conventionalCommits || false,
      format: packageConfig.changelogFormat || "conventional",
      includeEmptySections:
        packageConfig.changelogFormat === "keep-a-changelog",
    });
  }

  /**
   * Prepares a changelog entry for a new version release.
   *
   * @param context - Package context containing version and path information
   * @param packageConfig - Release configuration for the package
   * @returns Promise<string | undefined> - The final changelog entry content, or undefined if skipped
   */
  public async prepareChangelogEntry(
    context: PackageContext,
    packageConfig: ReleaseConfig,
  ): Promise<string | undefined> {
    const changelogPath = path.join(
      context.path,
      packageConfig.changelogFile || "CHANGELOG.md",
    );
    this.logger.debug(`Changelog path: ${changelogPath}`);

    try {
      // Check if changelog exists
      await fs.access(changelogPath);

      // Get unreleased changes from existing changelog
      this.logger.info("Reading unreleased changes from changelog...");
      const unreleasedChanges = await this.changelog.getUnreleasedChanges(
        context,
        packageConfig,
      );

      // Get git changes since last release
      const gitChanges = await this.getGitChanges(context.name);

      this.logger.debug(
        "Unreleased changes from changelog:",
        unreleasedChanges,
      );
      this.logger.debug("Git changes since last release:", gitChanges);

      let finalChangelog: string;

      if (unreleasedChanges.length > 0) {
        // Handle existing unreleased changes
        this.logger.info(
          `Found ${unreleasedChanges.length} unreleased changes in changelog:`,
        );
        this.logger.info(unreleasedChanges.join("\n"));

        const preview = await this.changelog.previewNewVersion(
          context,
          packageConfig,
          {
            newVersion: context.newVersion ?? "x.x.x",
            conventionalCommits: packageConfig.conventionalCommits || false,
            format: packageConfig.changelogFormat || "conventional",
            includeEmptySections: false,
          },
        );
        this.logger.info("\nChangelog entry will look like this:\n");
        this.logger.info(preview);

        // Allow user to confirm or provide manual entry
        const confirmed = await this.prompts.confirmChangelogContent(preview);
        finalChangelog = confirmed
          ? preview
          : await this.prompts.getManualChangelogEntry();
      } else {
        // Generate changelog from git commits if no unreleased changes
        this.logger.info(
          "No unreleased changes found, analyzing git commits...",
        );
        const preview = await this.changelog.previewNewVersion(
          context,
          packageConfig,
          {
            newVersion: context.newVersion ?? "x.x.x",
            conventionalCommits: packageConfig.conventionalCommits || false,
            format: packageConfig.changelogFormat || "conventional",
            includeEmptySections:
              packageConfig.changelogFormat === "keep-a-changelog",
          },
        );
        this.logger.info("\nProposed changelog entries:\n");
        this.logger.info(preview);

        // Allow user to confirm or provide manual entry
        const confirmed = await this.prompts.confirmChangelogContent(preview);
        finalChangelog = confirmed
          ? preview
          : await this.prompts.getManualChangelogEntry();
      }

      return finalChangelog;
    } catch (error) {
      this.logger.error("Error preparing changelog entry:", error);
      // Handle case where changelog doesn't exist
      const shouldCreate = await this.prompts.confirmChangelogCreation(
        context.name,
      );
      if (shouldCreate) {
        return this.changelog.generate(context, packageConfig);
      }
      return undefined;
    }
  }

  private async backupFiles(
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<Array<{ path: string; content: string }>> {
    const files = [
      path.join(context.path, "package.json"),
      path.join(context.path, config.changelogFile || "CHANGELOG.md"),
    ];

    const backups = [];
    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        backups.push({ path: filePath, content });
      } catch (error) {
        // Ignore if file doesn't exist
      }
    }
    return backups;
  }

  private async validateWithProgress(
    context: PackageContext,
    options: {
      skipGitCheck?: boolean;
      skipUpstreamTracking?: boolean;
      checkIntegrity?: boolean;
      allowBranch?: boolean;
    },
  ): Promise<void> {
    const validations = [
      {
        name: "Git Status",
        skip: options.skipGitCheck,
        validate: async (): Promise<void> => {
          this.logger.info("Validating git status...");
          await this.git.validateStatus({
            skipUpstreamTracking: options.skipUpstreamTracking,
            allowBranch: options.allowBranch,
          });
        },
      },
      {
        name: "Package Manager",
        skip: false,
        validate: async (): Promise<void> => {
          if (this.config.npm?.publish) {
            this.logger.info("Validating npm authentication...");
            await this.packageManager.validateAuth(this.config);
          }
        },
      },
      {
        name: "Dependencies",
        skip: !options.checkIntegrity,
        validate: async (): Promise<void> => {
          this.logger.info("Validating workspace dependencies...");
          const result = await this.integrityService.checkWithDetails(true);
          if (!result.isValid) {
            const messages = result.issues
              .map(
                (issue) => `${issue.severity.toUpperCase()}: ${issue.message}`,
              )
              .join("\n");
            throw new Error(`Dependency validation failed:\n${messages}`);
          }
        },
      },
      {
        name: "Version",
        skip: false,
        validate: (): Promise<void> => {
          this.logger.info("Validating version format...");
          this.version.validateVersion(context.currentVersion);
          return Promise.resolve();
        },
      },
      {
        name: "Changelog",
        skip: false,
        validate: async (): Promise<void> => {
          this.logger.info("Validating changelog format...");
          await this.changelog.validate(
            context,
            await this.getEffectiveConfig(context.name),
          );
        },
      },
    ];

    let completedSteps = 0;
    const totalSteps = validations.filter((v) => !v.skip).length;

    for (const validation of validations) {
      if (validation.skip) continue;

      try {
        await this.withTimeout(
          validation.validate(),
          30000,
          `${validation.name} validation`,
        );
        completedSteps++;
        this.logger.success(
          `✓ ${validation.name} (${completedSteps}/${totalSteps})`,
        );
      } catch (error: unknown) {
        this.logger.error(`✗ ${validation.name} validation failed:`);
        if (error instanceof Error) {
          this.logger.error(error.message);
        } else {
          this.logger.error(String(error));
        }
        throw error;
      }
    }

    this.logger.success("\nAll validations passed successfully!");
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string,
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(`Operation "${operation}" timed out after ${timeoutMs}ms`),
        );
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);
      return result;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      throw error;
    }
  }

  private async updateVersion(
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<void> {
    await this.version.bump(context, config);
  }

  public async createDryRunPreview(
    pkg: PackageChanges,
    options: DryRunOptions,
  ): Promise<DryRunReport> {
    const context: PackageContext = {
      name: pkg.name,
      path: pkg.path,
      currentVersion: pkg.currentVersion,
      newVersion: pkg.suggestedVersion,
      dependencies: pkg.dependencies.reduce(
        (acc, dep) => {
          if (dep.type === "dependencies") {
            acc[dep.name] = dep.currentVersion;
          }
          return acc;
        },
        {} as Record<string, string>,
      ),
      devDependencies: pkg.devDependencies,
      peerDependencies: pkg.peerDependencies,
    };

    const config = await this.getEffectiveConfig(pkg.name);

    return this.createDryRunReport(context, config, {
      ...options,
      newVersion: pkg.suggestedVersion,
      changelog: await this.changelog.previewNewVersion(context, config, {
        newVersion: pkg.suggestedVersion,
        conventionalCommits: config.conventionalCommits || false,
        format: config.changelogFormat || "conventional",
        includeEmptySections: config.changelogFormat === "keep-a-changelog",
      }),
    });
  }
}
