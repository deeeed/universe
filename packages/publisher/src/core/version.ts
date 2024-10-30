import type { Options as ExecaOptions, ExecaReturnValue } from "execa";
import * as semver from "semver";
import type {
  BumpType,
  GitConfig,
  PackageContext,
  PackageJson,
  ReleaseConfig,
} from "../types/config";
import { GitService } from "./git";

export class VersionService {
  private git: GitService;

  constructor(gitConfig: GitConfig) {
    const rootDir = process.cwd(); // Or get it from workspace service
    this.git = new GitService(gitConfig, rootDir);
  }

  private async execCommand(
    command: string,
    args: string[],
    options: ExecaOptions,
  ): Promise<ExecaReturnValue> {
    const execaDefault = await import("execa");
    const execa = execaDefault.default;
    return execa(command, args, options);
  }

  async bump(context: PackageContext, config: ReleaseConfig): Promise<void> {
    const packageManager = config.packageManager || "yarn";

    try {
      if (!context.newVersion) {
        throw new Error("New version is not defined");
      }

      await this.execCommand(packageManager, ["version", context.newVersion], {
        cwd: context.path,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to bump version: ${errorMessage}`);
    }
  }

  determineVersion(
    context: PackageContext,
    bumpType: BumpType,
    preReleaseId?: string,
  ): string {
    const { currentVersion } = context;

    if (bumpType === "custom") {
      if (!context.newVersion) {
        throw new Error("New version is required for custom bump type");
      }
      return context.newVersion;
    }

    if (!semver.valid(currentVersion)) {
      throw new Error(`Invalid current version: ${currentVersion}`);
    }

    let newVersion: string | null;

    if (bumpType.startsWith("pre")) {
      if (!preReleaseId) {
        throw new Error(
          "Prerelease identifier is required for prerelease versions",
        );
      }
      newVersion = semver.inc(
        currentVersion,
        bumpType as semver.ReleaseType,
        preReleaseId,
      );
    } else {
      newVersion = semver.inc(currentVersion, bumpType as semver.ReleaseType);
    }

    if (!newVersion) {
      throw new Error(
        `Failed to increment version ${currentVersion} with bump type ${bumpType}`,
      );
    }

    return newVersion;
  }

  async updateDependencies(
    context: PackageContext,
    updatedPackages: Map<string, string>,
  ): Promise<void> {
    const packageJsonPath = `${context.path}/package.json`;
    const packageJson = (await import(packageJsonPath)) as PackageJson;
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
      await this.execCommand(
        "yarn",
        ["up", ...Array.from(updatedPackages.keys())],
        {
          cwd: context.path,
        },
      );
    }
  }

  async analyzeCommits(context: PackageContext): Promise<BumpType> {
    try {
      const lastTag = await this.git.getLastTag(context.name);
      const commits = await this.git.getCommitsSinceTag(lastTag);

      if (
        commits.some((commit) => commit.message.includes("BREAKING CHANGE"))
      ) {
        return "major";
      }

      if (commits.some((commit) => commit.message.startsWith("feat"))) {
        return "minor";
      }

      return "patch";
    } catch {
      return "patch";
    }
  }

  validateVersion(version: string): void {
    // Basic semver validation
    if (!semver.valid(version)) {
      throw new Error(
        `Invalid version format: ${version}\n` +
          "Version must follow semver format (major.minor.patch[-prerelease][+build])",
      );
    }

    // Additional validations
    const parsed = semver.parse(version);
    if (!parsed) {
      throw new Error(`Failed to parse version: ${version}`);
    }

    // Validate version components
    if (parsed.major < 0 || parsed.minor < 0 || parsed.patch < 0) {
      throw new Error("Version components cannot be negative");
    }

    // Validate prerelease format if present
    if (parsed.prerelease.length > 0) {
      const prereleaseId = parsed.prerelease[0];
      if (
        typeof prereleaseId === "string" &&
        !prereleaseId.match(/^[a-zA-Z][\w.-]*$/)
      ) {
        throw new Error(
          "Invalid prerelease identifier format. Must start with a letter and contain only alphanumeric characters, dots, and hyphens.",
        );
      }
    }

    // Validate build metadata format if present
    if (parsed.build.length > 0) {
      const buildId = parsed.build[0];
      if (!buildId.match(/^[\w.-]+$/)) {
        throw new Error(
          "Invalid build metadata format. Must contain only alphanumeric characters, dots, and hyphens.",
        );
      }
    }
  }
}
