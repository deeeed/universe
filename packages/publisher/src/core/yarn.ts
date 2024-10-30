import execa, { ExecaReturnValue } from "execa";
import type { NpmConfig, PackageContext } from "../types/config";
import { Logger } from "../utils/logger";
import { PackageArchiveInfo, PackageManagerService } from "./package-manager";

interface YarnInfoResponse {
  data?: string;
  version?: string;
  filename?: string;
}

interface YarnVersion {
  major: number;
  full: string;
}

export class YarnService implements PackageManagerService {
  private yarnVersion: YarnVersion | null = null;
  private readonly logger: Logger;

  constructor(
    private readonly config: NpmConfig,
    logger?: Logger,
  ) {
    this.logger = logger ?? new Logger();
  }

  private async getYarnVersion(): Promise<YarnVersion> {
    if (this.yarnVersion) return this.yarnVersion;

    try {
      const result = await execa("yarn", ["--version"]);
      const version = result.stdout.trim();

      // Parse version string (e.g., "4.5.0" -> major: 4)
      const major = parseInt(version.split(".")[0], 10);

      // Consider anything >= 2.0.0 as Yarn Berry
      this.yarnVersion = {
        major: major >= 2 ? 2 : 1, // Normalize to either 1 or 2 for simpler checks
        full: version,
      };

      this.logger.debug("Detected Yarn version:", this.yarnVersion);
      return this.yarnVersion;
    } catch (error) {
      throw new Error("Failed to determine Yarn version");
    }
  }

  private async execYarnCommand(
    args: string[],
  ): Promise<ExecaReturnValue<string>> {
    const version = await this.getYarnVersion();

    // Convert commands for Yarn 1
    if (version.major === 1) {
      // Map modern Yarn commands to Yarn 1 equivalents
      const yarn1Args = args.map((arg) => {
        if (arg === "npm whoami") return "whoami";
        if (arg === "npm publish") return "publish";
        if (arg === "npm info") return "info";
        return arg;
      });

      return execa("yarn", yarn1Args);
    }

    // Use modern Yarn commands (Yarn Berry)
    return execa("yarn", args);
  }

  async validateAuth(config?: { npm: NpmConfig }): Promise<void> {
    const effectiveConfig = this.getEffectiveConfig(config);
    this.logger.debug("Starting npm authentication validation", {
      registry: effectiveConfig.registry,
    });

    try {
      const version = await this.getYarnVersion();
      this.logger.debug("Configuring auth command for Yarn version:", version);

      // Check if authentication is configured in .yarnrc.yml for Yarn Berry
      if (version.major === 2) {
        try {
          await this.execYarnCommand(["config", "get", "npmAuthToken"]);
        } catch (error) {
          throw new Error(
            "No authentication configured for Yarn Berry. Please add npmAuthToken to your .yarnrc.yml file:\n" +
              "npmAuthToken: ${NPM_AUTH_TOKEN}\n" +
              "Or run: yarn config set npmAuthToken <your-token>",
          );
        }
      }

      // Try whoami command
      const args =
        version.major === 1
          ? ["whoami", "--registry", effectiveConfig.registry]
          : ["npm", "whoami"];

      this.logger.debug("Executing auth validation command:", {
        command: `yarn ${args.join(" ")}`,
        cwd: process.cwd(),
      });

      const result = await this.execYarnCommand(args);
      const username = result.stdout.toString().trim();

      if (!username) {
        throw new Error("Not authenticated to npm registry");
      }

      this.logger.debug("Authentication successful", { username });
    } catch (error) {
      this.logger.error("Authentication validation failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        registry: effectiveConfig.registry,
      });
      throw error;
    }
  }

  async publish(
    context: PackageContext,
    config?: { npm: NpmConfig },
  ): Promise<{ published: boolean; registry: string }> {
    const effectiveConfig = this.getEffectiveConfig(config);
    const version = await this.getYarnVersion();

    this.logger.debug("Starting package publication process", {
      package: context.name,
      version: context.currentVersion,
      registry: effectiveConfig.registry,
      yarnVersion: version,
    });

    try {
      const publishArgs = this.getPublishArgs(version, effectiveConfig);
      this.logger.debug("Attempting Yarn publish with args:", {
        command: `yarn ${publishArgs.join(" ")}`,
        cwd: context.path,
      });

      await this.execYarnCommand(publishArgs);
      this.logger.debug("Package published successfully with Yarn");
    } catch (error) {
      this.logger.warn("Yarn publish failed, attempting npm fallback", {
        error: error instanceof Error ? error.message : "Unknown error",
      });

      const npmArgs = this.getNpmPublishArgs(effectiveConfig);
      this.logger.debug("Attempting npm publish with args:", {
        command: `npm ${npmArgs.join(" ")}`,
        cwd: context.path,
      });

      try {
        await execa("npm", npmArgs, { cwd: context.path });
        this.logger.debug("Package published successfully with npm fallback");
      } catch (npmError) {
        this.logger.error("Publication failed with both Yarn and npm", {
          error: npmError instanceof Error ? npmError.message : "Unknown error",
        });
        throw npmError;
      }
    }

    const result = {
      published: true,
      registry: effectiveConfig.registry,
    };

    this.logger.debug("Publication completed successfully", result);
    return result;
  }

  private getPublishArgs(version: YarnVersion, config: NpmConfig): string[] {
    return version.major === 1
      ? [
          "publish",
          "--registry",
          config.registry,
          "--tag",
          config.tag,
          "--access",
          config.access,
        ]
      : ["npm", "publish", "--tag", config.tag, "--access", config.access];
  }

  private getNpmPublishArgs(config: NpmConfig): string[] {
    const args = [
      "publish",
      "--registry",
      config.registry,
      "--tag",
      config.tag,
      "--access",
      config.access,
    ];

    if (config.otp) {
      args.push("--otp", config.otp);
    }

    return args;
  }

  async getLatestVersion(
    packageName: string,
    config?: { npm: NpmConfig },
  ): Promise<string> {
    const effectiveConfig = this.getEffectiveConfig(config);
    try {
      const result: ExecaReturnValue<string> = await execa("yarn", [
        "npm",
        "info",
        packageName,
        "version",
        "--registry",
        effectiveConfig.registry,
        "--json",
      ]);

      const parsed = this.parseJsonResponse<YarnInfoResponse>(result.stdout);
      return parsed.data ?? "0.0.0";
    } catch {
      return "0.0.0";
    }
  }

  async checkWorkspaceIntegrity(): Promise<boolean> {
    try {
      this.logger.debug("Checking Yarn workspace integrity...");
      const startTime = performance.now();
      const version = await this.getYarnVersion();

      // Use different commands based on Yarn version
      if (version.major === 1) {
        await execa("yarn", ["install", "--frozen-lockfile", "--check-files"]);
      } else {
        // Yarn Berry uses different flags
        await execa("yarn", ["install", "--immutable"]);
      }

      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      this.logger.debug(`Yarn integrity check completed in ${duration}s`);

      return true;
    } catch (error) {
      this.logger.debug("Yarn integrity check failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  async getWorkspaceVersion(packageName: string): Promise<string> {
    try {
      const result: ExecaReturnValue<string> = await execa("yarn", [
        "workspaces",
        "info",
        packageName,
        "--json",
      ]);

      const parsed = this.parseJsonResponse<YarnInfoResponse>(result.stdout);
      return parsed.version ?? "0.0.0";
    } catch {
      return "0.0.0";
    }
  }

  async updateDependencies(
    context: PackageContext,
    dependencies: string[],
  ): Promise<void> {
    try {
      await execa("yarn", ["up", ...dependencies], {
        cwd: context.path,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update dependencies: ${error.message}`);
      }
      throw new Error("Failed to update dependencies: Unknown error occurred");
    }
  }

  async pack(context: PackageContext): Promise<PackageArchiveInfo> {
    let packageFile = "";
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const tar = await import("tar");
      const crypto = await import("crypto");

      this.logger.debug("Starting package pack process", {
        package: context.name,
        path: context.path,
      });

      const result = await this.execYarnCommand(["pack", "--json"]);
      const parsed = this.parseJsonResponse<YarnInfoResponse>(result.stdout);
      packageFile = parsed.filename || "";

      if (!packageFile) {
        throw new Error("No package file was created during pack");
      }

      const packagePath = path.join(context.path, packageFile);
      this.logger.debug("Package created", {
        filename: packageFile,
        path: packagePath,
      });

      // Get compressed size
      const stats = await fs.stat(packagePath);

      // Calculate SHA hash
      const fileBuffer = await fs.readFile(packagePath);
      const hashSum = crypto.createHash("sha256");
      hashSum.update(fileBuffer);
      const sha = hashSum.digest("hex");

      // Get uncompressed size and file list
      const files: Array<{ path: string; size: number }> = [];
      let uncompressedSize = 0;

      await tar.list({
        file: packagePath,
        onentry: (entry) => {
          if (entry.type === "File") {
            files.push({
              path: entry.path,
              size: entry.size,
            });
            uncompressedSize += entry.size;
          }
        },
      });

      const archiveInfo: PackageArchiveInfo = {
        filename: packageFile,
        path: packagePath,
        size: {
          compressed: stats.size,
          uncompressed: uncompressedSize,
        },
        files,
        created: new Date(),
        sha,
      };

      this.logger.debug("Package analysis complete", {
        compressedSize: `${(stats.size / 1024).toFixed(2)}KB`,
        uncompressedSize: `${(uncompressedSize / 1024).toFixed(2)}KB`,
        fileCount: files.length,
      });

      return archiveInfo;
    } catch (error) {
      this.logger.error("Package pack failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        package: context.name,
      });
      throw error;
    } finally {
      if (packageFile) {
        try {
          const fs = await import("fs/promises");
          const path = await import("path");
          const filePath = path.join(context.path, packageFile);
          await fs.unlink(filePath);
          this.logger.debug("Cleaned up package file", { path: filePath });
        } catch (cleanupError) {
          this.logger.warn("Failed to cleanup package file", {
            error:
              cleanupError instanceof Error
                ? cleanupError.message
                : "Unknown error",
            path: packageFile,
          });
        }
      }
    }
  }

  async runScript(context: PackageContext, script: string): Promise<void> {
    try {
      await execa("yarn", ["run", script], {
        cwd: context.path,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to run script ${script}: ${error.message}`);
      }
      throw new Error(`Failed to run script ${script}: Unknown error occurred`);
    }
  }

  async install(): Promise<void> {
    try {
      await execa("yarn", ["install"]);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to install dependencies: ${error.message}`);
      }
      throw new Error("Failed to install dependencies: Unknown error occurred");
    }
  }

  private getEffectiveConfig(providedConfig?: { npm: NpmConfig }): NpmConfig {
    return providedConfig?.npm ?? this.config;
  }

  private parseJsonResponse<T>(stdout: string): T {
    try {
      return JSON.parse(stdout) as T;
    } catch {
      return {} as T;
    }
  }
}
