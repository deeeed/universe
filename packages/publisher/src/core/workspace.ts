import type { ExecaReturnValue } from "execa";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PackageJson } from "type-fest";
import type { PackageContext, ReleaseConfig } from "../types/config";
import { Logger } from "../utils/logger";
import fs from "fs/promises";
import { generatePackageConfig } from "../templates/package-config.template";

export class WorkspaceService {
  private packageCache: Map<string, PackageContext> = new Map();
  private logger: Logger;
  private rootDir: string | undefined;

  constructor(logger?: Logger) {
    this.logger = logger ?? new Logger();
    // Initialize rootDir later asynchronously
  }

  async getRootDir(): Promise<string> {
    if (!this.rootDir) {
      this.rootDir = await this.findMonorepoRoot(process.cwd());
      this.logger.debug("Monorepo root directory:", this.rootDir);
    }
    return this.rootDir;
  }

  private async findMonorepoRoot(startDir: string): Promise<string> {
    let currentDir = startDir;
    while (currentDir !== path.parse(currentDir).root) {
      const pkgJsonPath = path.join(currentDir, "package.json");
      try {
        await fs.access(pkgJsonPath);
        const content = await fs.readFile(pkgJsonPath, "utf-8");
        const pkgJson = JSON.parse(content) as PackageJson;
        if (pkgJson.workspaces) {
          return currentDir;
        }
      } catch (error) {
        this.logger.debug(`Error accessing ${pkgJsonPath}:`, error);
      }
      currentDir = path.dirname(currentDir);
    }
    return startDir; // fallback to start directory if no root found
  }

  async getPackages(packageNames?: string[]): Promise<PackageContext[]> {
    const globby = (await import("globby")).default;
    const rootDir = await this.getRootDir();
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
      // Generate default config using the template helper
      const defaultConfig = generatePackageConfig({
        packageJson: { name: packageName },
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

      // Parse the generated config string back to an object
      // Remove the type declaration and export statement
      const configString = defaultConfig
        .replace(/import.*?;\n\n/g, "")
        .replace("const config: ReleaseConfig = ", "")
        .replace(";\n\nexport default config", "");

      return JSON.parse(configString) as ReleaseConfig;
    }
  }

  private async readPackageJson(packagePath: string): Promise<PackageJson> {
    const rootDir = await this.getRootDir();
    const fullPath = path.join(rootDir, packagePath, "package.json");
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
      const rootDir = await this.getRootDir();
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
    const rootDir = await this.getRootDir();
    const fullPath = path.join(rootDir, packagePath, "package.json");
    try {
      const content = JSON.stringify(data, null, 2);
      await fs.writeFile(fullPath, content, "utf8");
      this.logger.debug(`Successfully wrote package.json at: ${fullPath}`);
    } catch (error) {
      this.logger.error(`Failed to write package.json at: ${fullPath}`, error);
      throw error;
    }
  }
}
