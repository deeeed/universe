import type { MonorepoConfig, PackageContext, ReleaseConfig, ReleaseResult } from '../types/config';
import { Logger } from '../utils/logger';
import { Prompts } from '../utils/prompt';
import { ChangelogService } from './changelog';
import { GitService } from './git';
import { YarnService } from './yarn';
import { VersionService } from './version';
import { WorkspaceService } from './workspace';

export class ReleaseService {
  private git: GitService;
  private yarn: YarnService;
  private version: VersionService;
  private changelog: ChangelogService;
  private workspace: WorkspaceService;
  private prompts: Prompts;

  constructor(
    private config: MonorepoConfig,
    private logger: Logger
  ) {
    this.git = new GitService(config.git);
    this.yarn = new YarnService(config.npm);
    this.version = new VersionService();
    this.changelog = new ChangelogService();
    this.workspace = new WorkspaceService();
    this.prompts = new Prompts(logger);
  }

  async releasePackages(packageNames: string[], options: { dryRun?: boolean; gitPush?: boolean; npmPublish?: boolean }): Promise<ReleaseResult[]> {
    // Validate workspace integrity before proceeding
    if (!await this.yarn.checkWorkspaceIntegrity()) {
      throw new Error('Workspace integrity check failed. Please run yarn install');
    }

    const packages = await this.workspace.getPackages(packageNames);
    const results: ReleaseResult[] = [];

    for (const pkg of packages) {
      const result = await this.releasePackage(pkg, options);
      results.push(result);
    }

    return results;
  }

  async releaseAll(options: { dryRun?: boolean; gitPush?: boolean; npmPublish?: boolean }): Promise<ReleaseResult[]> {
    const changedPackages = await this.workspace.getChangedPackages();
    return this.releasePackages(changedPackages.map(p => p.name), options);
  }

  private async releasePackage(context: PackageContext, options: { dryRun?: boolean; gitPush?: boolean; npmPublish?: boolean }): Promise<ReleaseResult> {
    this.logger.info(`\nPreparing release for ${context.name}...`);

    // Load package-specific config
    const packageConfig = await this.workspace.getPackageConfig(context.name);

    // Validate environment
    await this.validateEnvironment(packageConfig);

    // Determine new version using VersionService
    context.newVersion = await this.determineVersion(context, packageConfig);

    // Generate changelog
    const changelogEntry = await this.changelog.generate(context, packageConfig);

    // Confirm release
    if (!options.dryRun && !await this.prompts.confirmRelease()) {
      throw new Error('Release cancelled');
    }

    if (options.dryRun) {
      this.logger.info('Dry run completed');
      return this.createDryRunResult(context);
    }

    // Run pre-release hooks
    await this.runHooks('preRelease', packageConfig, context);

    // Update version and dependencies
    await this.updateVersionAndDependencies(context, packageConfig);

    // Update changelog
    await this.changelog.update(context, changelogEntry, packageConfig);

    // Create git tag
    const tag = await this.git.createTag(context, packageConfig);

    // Commit changes
    const commit = await this.git.commitChanges(context, packageConfig);

    // Push changes
    if (options.gitPush) {
      await this.git.push(packageConfig);
    }

    // Pack and publish to npm registry using yarn
    let npmResult;
    if (options.npmPublish) {
      // Pack the package first as a verification step
      const packageFile = await this.yarn.pack(context);
      if (!packageFile) {
        throw new Error('Failed to pack package');
      }

      npmResult = await this.yarn.publish(context, packageConfig);
    }

    // Run post-release hooks
    await this.runHooks('postRelease', packageConfig, context);

    return {
      packageName: context.name,
      version: context.newVersion,
      changelog: changelogEntry,
      git: { tag, commit },
      npm: npmResult
    };
  }

  private async validateEnvironment(config: ReleaseConfig): Promise<void> {
    await this.git.validateStatus(config);
    if (config.npm?.publish) {
      await this.yarn.validateAuth(config);
    }
  }

  private async determineVersion(context: PackageContext, config: ReleaseConfig): Promise<string> {
    if (config.bumpStrategy === 'prompt') {
      const bumpType = await this.prompts.getVersionBump();
      return this.version.determineVersion(context, bumpType, config.preReleaseId);
    } else if (config.bumpStrategy === 'conventional') {
      // Use conventional commits to determine version
      const bumpType = config.bumpType || 'patch';
      return this.version.determineVersion(context, bumpType, config.preReleaseId);
    } else {
      // Auto strategy - use patch by default
      return this.version.determineVersion(context, 'patch', config.preReleaseId);
    }
  }

  private async updateVersionAndDependencies(context: PackageContext, config: ReleaseConfig): Promise<void> {
    // First update the version
    await this.version.bump(context, config);

    // Then update any workspace dependencies if needed
    const workspaceDependencies = this.getWorkspaceDependencies(context);
    if (workspaceDependencies.length > 0) {
      await this.yarn.updateDependencies(context, workspaceDependencies);
    }
  }

  private getWorkspaceDependencies(context: PackageContext): string[] {
    const allDependencies = {
      ...context.dependencies,
      ...context.devDependencies,
      ...context.peerDependencies
    };

    return Object.keys(allDependencies).filter(dep => 
      dep.startsWith('@siteed/') || // Adjust this prefix based on your workspace
      dep.startsWith('@your-scope/') // Add any other relevant scopes
    );
  }

  private async runHooks(hookName: keyof ReleaseConfig['hooks'], config: ReleaseConfig, context: PackageContext): Promise<void> {
    const hook = config.hooks[hookName];
    if (hook) {
      this.logger.info(`Running ${hookName} hook...`);
      await hook(context);
    }
  }

  private createDryRunResult(context: PackageContext): ReleaseResult {
    return {
      packageName: context.name,
      version: context.newVersion || '0.0.0',
      changelog: 'Dry run - no changes made',
      git: { tag: 'dry-run', commit: 'dry-run' }
    };
  }
}
