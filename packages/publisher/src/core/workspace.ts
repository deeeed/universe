import type { ExecaReturnValue } from 'execa';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { PackageJson } from 'type-fest';
import type { PackageContext, ReleaseConfig } from '../types/config';

export class WorkspaceService {
  private packageCache: Map<string, PackageContext> = new Map();

  async getPackages(packageNames?: string[]): Promise<PackageContext[]> {
    const globby = (await import('globby')).default;
    const workspaceGlobs = await this.getWorkspaceGlobs();

    const packagePaths = await globby(workspaceGlobs, {
      onlyDirectories: true,
      ignore: ['**/node_modules/**'],
    });

    const contexts = await Promise.all(
      packagePaths.map(async (packagePath: string) => {
        try {
          const pkgJson = await this.readPackageJson(packagePath);

          if (!pkgJson.name) {
            console.warn(`Package at ${packagePath} has no name, skipping`);
            return null;
          }

          if (packageNames && !packageNames.includes(pkgJson.name)) {
            return null;
          }

          const dependencies = this.ensureStringRecord(pkgJson.dependencies);
          const devDependencies = this.ensureStringRecord(pkgJson.devDependencies);
          const peerDependencies = this.ensureStringRecord(pkgJson.peerDependencies);

          const context: PackageContext = {
            name: pkgJson.name,
            path: packagePath,
            currentVersion: pkgJson.version ?? '0.0.0',
            dependencies,
            devDependencies,
            peerDependencies,
          };

          this.packageCache.set(pkgJson.name, context);
          return context;
        } catch (error) {
          console.error(`Error processing package at ${packagePath}:`, error);
          return null;
        }
      }),
    );

    return contexts.filter((ctx): ctx is PackageContext => ctx !== null);
  }

  async getChangedPackages(): Promise<PackageContext[]> {
    const execa = (await import('execa')).default;
    const result: ExecaReturnValue<string> = await execa('git', ['diff', '--name-only', 'HEAD^']);
    const changedFiles = result.stdout.split('\n').filter(Boolean);

    const packages = await this.getPackages();
    return packages.filter(pkg =>
      changedFiles.some((file: string) => file.startsWith(pkg.path)),
    );
  }

  async getPackageConfig(packageName: string): Promise<ReleaseConfig> {
    const packagePath = this.packageCache.get(packageName)?.path;
    if (!packagePath) {
      throw new Error(`Package ${packageName} not found in workspace`);
    }

    try {
      const configPath = path.join(process.cwd(), packagePath, 'publisher.config.ts');
      const importedConfig = (await import(configPath)) as { default: ReleaseConfig };
      return importedConfig.default;
    } catch {
      // Return default config if no package-specific config exists
      return {
        packageManager: 'yarn',
        changelogFile: 'CHANGELOG.md',
        conventionalCommits: true,
        versionStrategy: 'independent',
        bumpStrategy: 'prompt',
        git: {
          tagPrefix: 'v',
          requireCleanWorkingDirectory: true,
          requireUpToDate: true,
          commit: true,
          push: true,
          commitMessage: 'chore(release): release ${packageName}@${version}',
          tag: true,
          allowedBranches: ['main', 'master'],
          remote: 'origin',
        },
        npm: {
          publish: true,
          registry: 'https://registry.npmjs.org',
          tag: 'latest',
          access: 'public',
        },
        hooks: {},
      };
    }
  }

  private async readPackageJson(packagePath: string): Promise<PackageJson> {
    const fullPath = path.join(process.cwd(), packagePath, 'package.json');
    const content = await readFile(fullPath, 'utf-8');
    const parsed = JSON.parse(content) as PackageJson;
    return parsed;
  }

  private async getWorkspaceGlobs(): Promise<string[]> {
    try {
      const rootPkgJson = await this.readPackageJson('.');
      if (rootPkgJson.workspaces) {
        if (Array.isArray(rootPkgJson.workspaces)) {
          return rootPkgJson.workspaces;
        }
        if (rootPkgJson.workspaces.packages && Array.isArray(rootPkgJson.workspaces.packages)) {
          return rootPkgJson.workspaces.packages;
        }
      }
      return ['packages/*'];
    } catch {
      return ['packages/*'];
    }
  }

  private ensureStringRecord(obj: Record<string, unknown> | undefined): Record<string, string> {
    if (!obj) return {};
    return Object.entries(obj).reduce<Record<string, string>>((acc, [key, value]) => {
      if (typeof value === 'string') {
        acc[key] = value;
      }
      return acc;
    }, {});
  }
}
