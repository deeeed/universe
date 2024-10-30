import type { ExecaReturnValue } from "execa";
import fs from "fs/promises";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PackageJson } from "type-fest";
import { generateDefaultConfig } from "../templates/package-config.template";
import { loadConfig } from "./config";
import type {
  MonorepoConfig,
  PackageContext,
  ReleaseConfig,
} from "../types/config";
import { Logger } from "../utils/logger";
import { findMonorepoRootSync } from "../utils/find-monorepo-root";
import globby from "globby";

export class WorkspaceService {
  private packageCache: Map<string, PackageContext> = new Map();
  private rootDir: string | undefined;
  private configPromise: Promise<MonorepoConfig>;

  constructor(
    config?: MonorepoConfig,
    private readonly logger: Logger = new Logger(),
  ) {
    this.configPromise = config ? Promise.resolve(config) : loadConfig();
  }

  getRootDir(): string {
    if (!this.rootDir) {
      this.rootDir = findMonorepoRootSync(process.cwd());
      this.logger.debug("Monorepo root directory:", this.rootDir);
    }
    return this.rootDir;
  }

  async getPackages(packageNames?: string[]): Promise<PackageContext[]> {
    const rootDir = this.getRootDir();
    const workspaceGlobs = await this.getWorkspaceGlobs();

    this.logger.debug("Current directory:", process.cwd());
    this.logger.debug("Using workspace globs:", workspaceGlobs);

    const packagePaths = await globby(workspaceGlobs, {
      onlyDirectories: true,
      ignore: ["**/node_modules/**"],
      cwd: rootDir,
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
            path: path.resolve(rootDir, packagePath),
            currentVersion: pkgJson.version ?? "0.0.0",
            dependencies,
            devDependencies,
            peerDependencies,
          };

          this.packageCache.set(pkgJson.name, context);
          this.logger.debug(
            `Found valid package: ${pkgJson.name} at ${context.path}`,
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
    const rootDir = this.getRootDir();

    const packages = await this.getPackages();
    return packages.filter((pkg) =>
      changedFiles.some((file: string) =>
        file.startsWith(path.relative(rootDir, pkg.path)),
      ),
    );
  }

  async getPackageConfig(packageName: string): Promise<ReleaseConfig> {
    const packagePath = this.packageCache.get(packageName)?.path;
    if (!packagePath) {
      throw new Error(`Package ${packageName} not found in workspace`);
    }

    const config = await this.configPromise;

    // If no config exists at all, generate a default one
    if (!config || Object.keys(config).length === 0) {
      const pkgJson = await this.readPackageJson(packagePath);
      return generateDefaultConfig({
        packageJson: {
          name: pkgJson.name ?? packageName,
          version: pkgJson.version,
        },
        packageManager: "yarn",
        conventionalCommits: true,
        changelogFormat: "conventional",
        versionStrategy: "independent",
        bumpStrategy: "prompt",
        npm: {
          publish: true,
          access: "public",
        },
      });
    }

    // Use package-specific config if available, otherwise use monorepo config
    return {
      npm: {
        tag:
          config.packages?.[packageName]?.npm?.tag ??
          config.npm?.tag ??
          "latest",
        publish:
          config.packages?.[packageName]?.npm?.publish ??
          config.npm?.publish ??
          true,
        registry:
          config.packages?.[packageName]?.npm?.registry ??
          config.npm?.registry ??
          "https://registry.npmjs.org/",
        access:
          config.packages?.[packageName]?.npm?.access ??
          config.npm?.access ??
          "public",
        otp: config.packages?.[packageName]?.npm?.otp ?? config.npm?.otp,
      },
      packageManager:
        config.packages?.[packageName]?.packageManager ??
        config.packageManager ??
        "yarn",
      changelogFile:
        config.packages?.[packageName]?.changelogFile ??
        config.changelogFile ??
        "CHANGELOG.md",
      conventionalCommits:
        config.packages?.[packageName]?.conventionalCommits ??
        config.conventionalCommits ??
        true,
      changelogFormat:
        config.packages?.[packageName]?.changelogFormat ??
        config.changelogFormat ??
        "conventional",
      versionStrategy:
        config.packages?.[packageName]?.versionStrategy ??
        config.versionStrategy ??
        "independent",
      bumpStrategy:
        config.packages?.[packageName]?.bumpStrategy ??
        config.bumpStrategy ??
        "prompt",
      preReleaseId:
        config.packages?.[packageName]?.preReleaseId ?? config.preReleaseId,
      updateDependenciesOnRelease:
        config.packages?.[packageName]?.updateDependenciesOnRelease ??
        config.updateDependenciesOnRelease ??
        false,
      dependencyUpdateStrategy:
        config.packages?.[packageName]?.dependencyUpdateStrategy ??
        config.dependencyUpdateStrategy ??
        "none",
      git: {
        tagPrefix:
          config.packages?.[packageName]?.git?.tagPrefix ??
          config.git?.tagPrefix ??
          `${packageName}@`,
        requireUpstreamTracking:
          config.packages?.[packageName]?.git?.requireUpstreamTracking ??
          config.git?.requireUpstreamTracking ??
          true,
        requireCleanWorkingDirectory:
          config.packages?.[packageName]?.git?.requireCleanWorkingDirectory ??
          config.git?.requireCleanWorkingDirectory ??
          true,
        requireUpToDate:
          config.packages?.[packageName]?.git?.requireUpToDate ??
          config.git?.requireUpToDate ??
          true,
        commit:
          config.packages?.[packageName]?.git?.commit ??
          config.git?.commit ??
          true,
        push:
          config.packages?.[packageName]?.git?.push ?? config.git?.push ?? true,
        commitMessage:
          config.packages?.[packageName]?.git?.commitMessage ??
          config.git?.commitMessage ??
          `chore(release): release ${packageName}@\${version}`,
        tag:
          config.packages?.[packageName]?.git?.tag ?? config.git?.tag ?? true,
        tagMessage:
          config.packages?.[packageName]?.git?.tagMessage ??
          config.git?.tagMessage,
        allowedBranches: config.packages?.[packageName]?.git?.allowedBranches ??
          config.git?.allowedBranches ?? ["main", "master"],
        remote:
          config.packages?.[packageName]?.git?.remote ??
          config.git?.remote ??
          "origin",
      },
      hooks: {
        ...config.hooks,
        ...config.packages?.[packageName]?.hooks,
      },
      packValidation: {
        enabled:
          config.packages?.[packageName]?.packValidation?.enabled ??
          config.packValidation?.enabled ??
          true,
        validateFiles:
          config.packages?.[packageName]?.packValidation?.validateFiles ??
          config.packValidation?.validateFiles ??
          true,
        validateBuildArtifacts:
          config.packages?.[packageName]?.packValidation
            ?.validateBuildArtifacts ??
          config.packValidation?.validateBuildArtifacts ??
          true,
        requiredFiles:
          config.packages?.[packageName]?.packValidation?.requiredFiles ??
          config.packValidation?.requiredFiles,
      },
    };
  }

  public async readPackageJson(packagePath: string): Promise<PackageJson> {
    const rootDir = this.getRootDir();
    const fullPath = path.resolve(rootDir, packagePath, "package.json");
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
      const rootDir = this.getRootDir();
      const rootPkgJsonPath = path.join(rootDir, "package.json");
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

  // Adjusted formatting per Prettier
  async writePackageJson(
    packagePath: string,
    data: PackageJson,
  ): Promise<void> {
    const rootDir = this.getRootDir();
    const fullPath = path.resolve(rootDir, packagePath, "package.json");
    try {
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(fullPath, content, "utf8");
      this.logger.debug(`Successfully wrote package.json at: ${fullPath}`);
    } catch (error) {
      this.logger.error(`Failed to write package.json at: ${fullPath}`, error);
      throw error;
    }
  }

  async getCurrentPackage(): Promise<PackageContext | null> {
    const currentDir = path.resolve(process.cwd());
    const packages = await this.getPackages();

    // Find package whose path matches the current directory
    const currentPackage = packages.find((pkg) =>
      currentDir.startsWith(pkg.path),
    );

    return currentPackage || null;
  }
}
