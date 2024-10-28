import type { ExecaReturnValue } from "execa";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PackageJson } from "type-fest";
import type { PackageContext, ReleaseConfig } from "../types/config";
import { Logger } from "../utils/logger";
import fs from "fs";

export class WorkspaceService {
  private packageCache: Map<string, PackageContext> = new Map();
  private logger: Logger;
  private rootDir: string;

  constructor(logger?: Logger) {
    this.logger = logger ?? new Logger();
    this.rootDir = this.findMonorepoRoot(process.cwd());
    this.logger.debug("Monorepo root directory:", this.rootDir);
  }

  getRootDir(): string {
    return this.rootDir;
  }

  private findMonorepoRoot(startDir: string): string {
    let currentDir = startDir;
    while (currentDir !== path.parse(currentDir).root) {
      const pkgJsonPath = path.join(currentDir, "package.json");
      if (fs.existsSync(pkgJsonPath)) {
        try {
          const content = fs.readFileSync(pkgJsonPath, "utf-8");
          const pkgJson = JSON.parse(content) as PackageJson; // Use type assertion
          if (pkgJson.workspaces) {
            // Safe access due to type assertion
            return currentDir;
          }
        } catch (error) {
          this.logger.debug(`Error reading ${pkgJsonPath}:`, error);
        }
      }
      currentDir = path.dirname(currentDir);
    }
    return startDir; // fallback to current directory if no root found
  }

  async getPackages(packageNames?: string[]): Promise<PackageContext[]> {
    const globby = (await import("globby")).default;
    const workspaceGlobs = await this.getWorkspaceGlobs();

    this.logger.debug("Current directory:", process.cwd());
    this.logger.debug("Using workspace globs:", workspaceGlobs);

    // Use rootDir for globbing
    const packagePaths = await globby(workspaceGlobs, {
      onlyDirectories: true,
      ignore: ["**/node_modules/**"],
      cwd: this.rootDir,
    });

    this.logger.debug("Found package paths:", packagePaths);

    const contexts = await Promise.all(
      packagePaths.map(async (packagePath: string) => {
        try {
          const pkgJson = await this.readPackageJson(packagePath);

          if (!pkgJson.name) {
            this.logger.warning(
              `Package at ${packagePath} has no name, skipping`,
            );
            return null;
          }

          if (
            packageNames &&
            !this.matchPackageName(pkgJson.name, packageNames)
          ) {
            this.logger.debug(
              `Package ${pkgJson.name} doesn't match requested names:`,
              packageNames,
            );
            return null;
          }

          const dependencies = this.ensureStringRecord(pkgJson.dependencies);
          const devDependencies = this.ensureStringRecord(
            pkgJson.devDependencies,
          );
          const peerDependencies = this.ensureStringRecord(
            pkgJson.peerDependencies,
          );

          const context: PackageContext = {
            name: pkgJson.name,
            path: packagePath,
            currentVersion: pkgJson.version ?? "0.0.0",
            dependencies,
            devDependencies,
            peerDependencies,
          };

          this.packageCache.set(pkgJson.name, context);
          this.logger.debug(
            `Found valid package: ${pkgJson.name} at ${packagePath}`,
          );
          return context;
        } catch (error) {
          this.logger.error(
            `Error processing package at ${packagePath}:`,
            error,
          );
          return null;
        }
      }),
    );

    const filtered = contexts.filter(
      (ctx): ctx is PackageContext => ctx !== null,
    );
    this.logger.debug(`Total valid packages found: ${filtered.length}`);

    return filtered;
  }

  private matchPackageName(
    packageName: string,
    requestedNames: string[],
  ): boolean {
    return requestedNames.some((requested) => {
      // Full match
      if (packageName === requested) return true;

      // Match simple name against the last part of the package name
      const simpleName = packageName.split("/").pop();
      if (simpleName === requested) return true;

      // Match without @ prefix
      if (packageName.startsWith("@") && packageName.slice(1) === requested)
        return true;

      return false;
    });
  }

  async getChangedPackages(): Promise<PackageContext[]> {
    const execa = (await import("execa")).default;
    const result: ExecaReturnValue<string> = await execa("git", [
      "diff",
      "--name-only",
      "HEAD^",
    ]);
    const changedFiles = result.stdout.split("\n").filter(Boolean);

    const packages = await this.getPackages();
    return packages.filter((pkg) =>
      changedFiles.some((file: string) => file.startsWith(pkg.path)),
    );
  }

  async getPackageConfig(packageName: string): Promise<ReleaseConfig> {
    const packagePath = this.packageCache.get(packageName)?.path;
    if (!packagePath) {
      throw new Error(`Package ${packageName} not found in workspace`);
    }

    try {
      const configPath = path.join(
        process.cwd(),
        packagePath,
        "publisher.config.ts",
      );
      const importedConfig = (await import(configPath)) as {
        default: ReleaseConfig;
      };
      return importedConfig.default;
    } catch {
      // Return default config if no package-specific config exists
      return {
        packageManager: "yarn",
        changelogFile: "CHANGELOG.md",
        conventionalCommits: true,
        versionStrategy: "independent",
        bumpStrategy: "prompt",
        git: {
          tagPrefix: "v",
          requireCleanWorkingDirectory: true,
          requireUpToDate: true,
          commit: true,
          push: true,
          commitMessage: "chore(release): release ${packageName}@${version}",
          tag: true,
          allowedBranches: ["main", "master"],
          remote: "origin",
        },
        npm: {
          publish: true,
          registry: "https://registry.npmjs.org",
          tag: "latest",
          access: "public",
        },
        hooks: {},
      };
    }
  }

  private async readPackageJson(packagePath: string): Promise<PackageJson> {
    const fullPath = path.join(this.rootDir, packagePath, "package.json");
    try {
      const content = await readFile(fullPath, "utf-8");
      const parsed = JSON.parse(content) as PackageJson;
      this.logger.debug(`Successfully read package.json at: ${fullPath}`);
      return parsed;
    } catch (error) {
      this.logger.error(`Failed to read package.json at: ${fullPath}`, error);
      throw error;
    }
  }

  private async getWorkspaceGlobs(): Promise<string[]> {
    try {
      // Use rootDir for reading root package.json
      const rootPkgJsonPath = path.join(this.rootDir, "package.json");
      const content = await readFile(rootPkgJsonPath, "utf-8");
      const rootPkgJson = JSON.parse(content) as PackageJson;

      this.logger.debug(
        "Root package.json workspaces:",
        rootPkgJson.workspaces,
      );

      if (rootPkgJson.workspaces) {
        if (Array.isArray(rootPkgJson.workspaces)) {
          return rootPkgJson.workspaces;
        }
        if (
          rootPkgJson.workspaces.packages &&
          Array.isArray(rootPkgJson.workspaces.packages)
        ) {
          return rootPkgJson.workspaces.packages;
        }
      }
      this.logger.warning(
        "No workspaces found in package.json, using default: packages/*",
      );
      return ["packages/*"];
    } catch (error) {
      this.logger.error("Error reading root package.json:", error);
      return ["packages/*"];
    }
  }

  private ensureStringRecord(
    obj: Record<string, unknown> | undefined,
  ): Record<string, string> {
    if (!obj) return {};
    return Object.entries(obj).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (typeof value === "string") {
          acc[key] = value;
        }
        return acc;
      },
      {},
    );
  }
}
