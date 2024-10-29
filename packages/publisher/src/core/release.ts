import fs from "fs/promises";
import path from "path";
import type {
  MonorepoConfig,
  PackageChanges,
  PackageContext,
  ReleaseConfig,
  ReleaseResult,
} from "../types/config";
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

  constructor(
    private config: MonorepoConfig,
    private logger: Logger,
  ) {
    if (!["npm", "yarn"].includes(config.packageManager)) {
      logger.warning('Invalid package manager specified, defaulting to "yarn"');
      this.config.packageManager = "yarn";
    }

    const rootDir = process.cwd();
    this.git = new GitService(config.git, rootDir);
    this.packageManager = PackageManagerFactory.create(
      config.packageManager as "npm" | "yarn",
      config.npm,
    );
    this.version = new VersionService(config.git);
    this.changelog = new ChangelogService(logger);
    this.workspace = new WorkspaceService();
    this.prompts = new Prompts(logger);
    this.integrityService = new WorkspaceIntegrityService(
      this.packageManager,
      logger,
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
    },
  ): Promise<ReleaseResult[]> {
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

    const results: ReleaseResult[] = [];
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
  }): Promise<ReleaseResult[]> {
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
    },
  ): Promise<ReleaseResult> {
    try {
      this.logger.info(`Loading package configuration...`);
      const packageConfig: ReleaseConfig = await this.getEffectiveConfig(
        context.name,
      );

      this.logger.info("Validating environment...");
      await this.validateEnvironment({
        skipGitCheck: options.skipGitCheck,
        skipUpstreamTracking: options.skipUpstreamTracking,
      });

      this.logger.info("Determining new version...");
      context.newVersion = await this.determineVersion(context, packageConfig);

      this.logger.info("Processing changelog...");
      const changelogEntry = await this.handleChangelog(context, packageConfig);

      if (!options.dryRun && !(await this.prompts.confirmRelease())) {
        throw new Error("Release cancelled");
      }

      if (options.dryRun) {
        this.logger.info("Dry run completed");
        return this.createDryRunResult(context);
      }

      await this.runHooks("preRelease", packageConfig, context);
      await this.updateVersionAndDependencies(context, packageConfig);
      if (changelogEntry) {
        await this.changelog.update(context, changelogEntry, packageConfig);
      }

      const tag = await this.git.createTag(context);
      const commit = await this.git.commitChanges(context);

      if (options.gitPush) {
        await this.git.push();
      }

      if (options.publish) {
        // Validate package contents before publishing
        await this.validatePackageContents(context);

        const publishResult = await this.packageManager.publish(context, {
          npm: packageConfig.npm,
        });

        return {
          packageName: context.name,
          version: context.newVersion,
          changelog: changelogEntry || "",
          git: { tag, commit },
          npm: publishResult,
        };
      }

      await this.runHooks("postRelease", packageConfig, context);

      return {
        packageName: context.name,
        version: context.newVersion,
        changelog: changelogEntry || "",
        git: { tag, commit },
      };
    } catch (error) {
      // Enhanced error handling
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.debug("Release process failed:", error);
      throw new Error(
        `Release failed for ${context.name}:\n${errorMessage}\n\n` +
          "For more details, run with DEBUG=true",
      );
    }
  }

  private async validateEnvironment(options: {
    skipGitCheck?: boolean;
    skipUpstreamTracking?: boolean;
  }): Promise<void> {
    if (!options.skipGitCheck) {
      this.logger.info("Validating git status...");
      await this.git.validateStatus({
        skipUpstreamTracking: options.skipUpstreamTracking,
      });
    }

    if (this.config.npm?.publish) {
      this.logger.info("Validating npm authentication...");
      await this.packageManager.validateAuth(this.config);
    }
  }

  private async determineVersion(
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<string> {
    if (config.bumpStrategy === "conventional") {
      const analyzedBumpType = await this.version.analyzeCommits(context);
      const bumpType = config.bumpType || analyzedBumpType;
      return this.version.determineVersion(
        context,
        bumpType,
        config.preReleaseId,
      );
    }

    if (config.bumpStrategy === "prompt") {
      const bumpType = await this.prompts.getVersionBump();
      return this.version.determineVersion(
        context,
        bumpType,
        config.preReleaseId,
      );
    }

    return this.version.determineVersion(context, "patch", config.preReleaseId);
  }

  private async updateVersionAndDependencies(
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<void> {
    await this.version.bump(context, config);
    const workspaceDependencies = this.getWorkspaceDependencies(context);
    if (workspaceDependencies.length > 0) {
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

  private createDryRunResult(context: PackageContext): ReleaseResult {
    return {
      packageName: context.name,
      version: context.newVersion || "0.0.0",
      changelog: "Dry run - no changes made",
      git: { tag: "dry-run", commit: "dry-run" },
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
        currentVersion: pkg.currentVersion,
        suggestedVersion,
        dependencies: dependencyUpdates,
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
        config.bumpType || (await this.version.analyzeCommits(context));
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
    Array<{ name: string; currentVersion: string; newVersion: string }>
  > {
    const updates = [];
    for (const dep of dependencies) {
      const currentVersion =
        context.dependencies?.[dep] ||
        context.devDependencies?.[dep] ||
        context.peerDependencies?.[dep];
      if (currentVersion) {
        const latestVersion = await this.packageManager.getLatestVersion(dep);
        if (latestVersion !== currentVersion) {
          updates.push({
            name: dep,
            currentVersion,
            newVersion: latestVersion,
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
    return this.git.getCommitsSinceTag(lastTag);
  }

  async previewChangelog(packageName: string): Promise<string> {
    const pkg = await this.workspace.getPackages([packageName]);
    if (pkg.length === 0) {
      throw new Error(`Package ${packageName} not found`);
    }

    const packageConfig = await this.workspace.getPackageConfig(packageName);
    const context = pkg[0];

    // Generate changelog content
    const changelogContent = await this.changelog.generate(
      context,
      packageConfig,
    );

    // Format the preview to show how it would look in the changelog
    const dateStr = new Date().toISOString().split("T")[0];
    const version = context.newVersion || "x.x.x";

    return `## [${version}] - ${dateStr}\n\n${changelogContent}`;
  }

  private async handleChangelog(
    context: PackageContext,
    packageConfig: ReleaseConfig,
  ): Promise<string | undefined> {
    const changelogPath = path.join(
      context.path,
      packageConfig.changelogFile || "CHANGELOG.md",
    );

    try {
      // Check if changelog exists
      await fs.access(changelogPath);

      // If changelog exists, only update it if conventionalCommits is true
      if (packageConfig.conventionalCommits) {
        return this.changelog.generate(context, packageConfig);
      }

      // Return undefined if no conventional commits and changelog exists
      return undefined;
    } catch (error) {
      // If changelog doesn't exist, generate it
      const shouldCreate = await this.prompts.confirmChangelogCreation(
        context.name,
      );
      if (shouldCreate) {
        return this.changelog.generate(context, packageConfig);
      }
      return undefined;
    }
  }

  private async validatePackageContents(
    context: PackageContext,
  ): Promise<void> {
    try {
      // Check for required files
      const requiredFiles = ["LICENSE", "README.md"];
      for (const file of requiredFiles) {
        const filePath = path.join(context.path, file);
        try {
          await fs.access(filePath);
        } catch {
          throw new Error(`Required file ${file} is missing`);
        }
      }

      // Pack the package to verify contents
      const packageFile = await this.packageManager.pack(context);

      // Clean up the package file after validation
      await fs.unlink(path.join(context.path, packageFile));
    } catch (error) {
      // Clean up on error as well
      try {
        const packageFile = path.join(context.path, "package.tgz");
        await fs.unlink(packageFile);
      } catch {
        // Ignore cleanup errors
      }

      throw new Error(
        `Package validation failed for ${context.name}:\n${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
