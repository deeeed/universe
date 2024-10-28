import * as semver from 'semver';
import type { ExecaReturnValue, Options as ExecaOptions } from 'execa';
import type { PackageContext, ReleaseConfig, BumpType } from '../types/config';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export class VersionService {
  private async execCommand(
    command: string,
    args: string[],
    options: ExecaOptions
  ): Promise<ExecaReturnValue> {
    const execaDefault = await import('execa');
    const execa = execaDefault.default;
    return execa(command, args, options);
  }

  async bump(context: PackageContext, config: ReleaseConfig): Promise<void> {
    const packageManager = config.packageManager || 'yarn';

    try {
      if (!context.newVersion) {
        throw new Error('New version is not defined');
      }

      await this.execCommand(packageManager, ['version', context.newVersion], {
        cwd: context.path
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to bump version: ${errorMessage}`);
    }
  }

  determineVersion(
    context: PackageContext,
    bumpType: BumpType,
    preReleaseId?: string
  ): string {
    const { currentVersion } = context;

    if (bumpType === 'custom') {
      if (!context.newVersion) {
        throw new Error('New version is required for custom bump type');
      }
      return context.newVersion;
    }

    if (!semver.valid(currentVersion)) {
      throw new Error(`Invalid current version: ${currentVersion}`);
    }

    let newVersion: string | null;

    if (bumpType.startsWith('pre')) {
      if (!preReleaseId) {
        throw new Error('Prerelease identifier is required for prerelease versions');
      }
      newVersion = semver.inc(currentVersion, bumpType as semver.ReleaseType, preReleaseId);
    } else {
      newVersion = semver.inc(currentVersion, bumpType as semver.ReleaseType);
    }

    if (!newVersion) {
      throw new Error(`Failed to increment version ${currentVersion} with bump type ${bumpType}`);
    }

    return newVersion;
  }

  async updateDependencies(
    context: PackageContext,
    updatedPackages: Map<string, string>
  ): Promise<void> {
    const packageJsonPath = `${context.path}/package.json`;
    const packageJson = await import(packageJsonPath) as PackageJson;
    let updated = false;

    for (const [name, version] of updatedPackages.entries()) {
      if (packageJson.dependencies?.[name]) {
        packageJson.dependencies[name] = `^${version}`;
        updated = true;
      }
      if (packageJson.devDependencies?.[name]) {
        packageJson.devDependencies[name] = `^${version}`;
        updated = true;
      }
      if (packageJson.peerDependencies?.[name]) {
        packageJson.peerDependencies[name] = `^${version}`;
        updated = true;
      }
    }

    if (updated) {
      await this.execCommand('yarn', ['up', ...Array.from(updatedPackages.keys())], {
        cwd: context.path
      });
    }
  }
}
