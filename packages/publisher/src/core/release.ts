import type {
  MonorepoConfig,
  PackageContext,
  ReleaseConfig,
  ReleaseResult,
} from "../types/config";
import { Logger } from "../utils/logger";
import { Prompts } from "../utils/prompt";
import { ChangelogService } from "./changelog";
import { GitService } from "./git";
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

  constructor(
    private config: MonorepoConfig,
    private logger: Logger,
  ) {
    if (!["npm", "yarn"].includes(config.packageManager)) {
      logger.warning('Invalid package manager specified, defaulting to "yarn"');
      this.config.packageManager = "yarn";
    }

    this.git = new GitService(config.git);
    this.packageManager = PackageManagerFactory.create(
      config.packageManager as "npm" | "yarn",
      config.npm,
    );
    this.version = new VersionService();
    this.changelog = new ChangelogService();
    this.workspace = new WorkspaceService();
    this.prompts = new Prompts(logger);
  }
  async releasePackages(
    packageNames: string[],
    options: { dryRun?: boolean; gitPush?: boolean; npmPublish?: boolean },
  ): Promise<ReleaseResult[]> {
    // Validate workspace integrity before proceeding
    if (!(await this.packageManager.checkWorkspaceIntegrity())) {
      throw new Error(
        "Workspace integrity check failed. Please run yarn install",
      );
    }

    const packages = await this.workspace.getPackages(packageNames);
    const results: ReleaseResult[] = [];

    for (const pkg of packages) {
      const result = await this.releasePackage(pkg, options);
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
    options: { dryRun?: boolean; gitPush?: boolean; publish?: boolean },
  ): Promise<ReleaseResult> {
    this.logger.info(`\nPreparing release for ${context.name}...`);

    const packageConfig: ReleaseConfig = await this.getEffectiveConfig(
      context.name,
    );

    await this.validateEnvironment(packageConfig);
    context.newVersion = await this.determineVersion(context, packageConfig);
    const changelogEntry = await this.changelog.generate(
      context,
      packageConfig,
    );

    if (!options.dryRun && !(await this.prompts.confirmRelease())) {
      throw new Error("Release cancelled");
    }

    if (options.dryRun) {
      this.logger.info("Dry run completed");
      return this.createDryRunResult(context);
    }

    await this.runHooks("preRelease", packageConfig, context);
    await this.updateVersionAndDependencies(context, packageConfig);
    await this.changelog.update(context, changelogEntry, packageConfig);

    const tag = await this.git.createTag(context, { git: packageConfig.git });
    const commit = await this.git.commitChanges(context, {
      git: packageConfig.git,
    });

    if (options.gitPush) {
      await this.git.push({ git: packageConfig.git });
    }

    let publishResult;
    if (options.publish) {
      const packageFile = await this.packageManager.pack(context);
      if (!packageFile) {
        throw new Error("Failed to pack package");
      }

      publishResult = await this.packageManager.publish(context, {
        npm: packageConfig.npm,
      });
    }

    await this.runHooks("postRelease", packageConfig, context);

    return {
      packageName: context.name,
      version: context.newVersion,
      changelog: changelogEntry,
      git: { tag, commit },
      npm: publishResult,
    };
  }

  private async validateEnvironment(config: ReleaseConfig): Promise<void> {
    await this.git.validateStatus(config);
    if (config.npm?.publish) {
      await this.packageManager.validateAuth(config);
    }
  }

  private async determineVersion(
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<string> {
    if (config.bumpStrategy === "prompt") {
      const bumpType = await this.prompts.getVersionBump();
      return this.version.determineVersion(
        context,
        bumpType,
        config.preReleaseId,
      );
    } else if (config.bumpStrategy === "conventional") {
      // Use conventional commits to determine version
      const bumpType = config.bumpType || "patch";
      return this.version.determineVersion(
        context,
        bumpType,
        config.preReleaseId,
      );
    } else {
      // Auto strategy - use patch by default
      return this.version.determineVersion(
        context,
        "patch",
        config.preReleaseId,
      );
    }
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
}
