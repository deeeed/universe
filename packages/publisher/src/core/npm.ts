import execa, { ExecaReturnValue } from "execa";
import type { NpmConfig, PackageContext } from "../types/config";
import { PackageArchiveInfo, PackageManagerService } from "./package-manager";
import { Logger } from "../utils/logger";

export class NpmService implements PackageManagerService {
  private readonly logger: Logger;

  constructor(
    private readonly config: NpmConfig,
    logger?: Logger,
  ) {
    this.logger = logger ?? new Logger();
  }

  private getEffectiveConfig(providedConfig?: { npm: NpmConfig }): NpmConfig {
    return providedConfig?.npm ?? this.config;
  }

  async validateAuth(config?: { npm: NpmConfig }): Promise<void> {
    const effectiveConfig = this.getEffectiveConfig(config);
    try {
      const execa = (await import("execa")).default;
      const result: ExecaReturnValue<string | Buffer> = await execa("npm", [
        "whoami",
        "--registry",
        effectiveConfig.registry,
      ]);

      const output = result.stdout.toString().trim();
      if (!output) {
        throw new Error("Not authenticated to npm registry");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`npm authentication failed: ${error.message}`);
      }
      throw new Error("npm authentication failed: Unknown error occurred");
    }
  }

  async publish(
    context: PackageContext,
    config?: { npm: NpmConfig },
  ): Promise<{ published: boolean; registry: string }> {
    const effectiveConfig = this.getEffectiveConfig(config);
    const publishArgs = [
      "publish",
      "--registry",
      effectiveConfig.registry,
      "--tag",
      effectiveConfig.tag,
      "--access",
      effectiveConfig.access,
    ];

    if (effectiveConfig.otp) {
      publishArgs.push("--otp", effectiveConfig.otp);
    }

    try {
      const execa = (await import("execa")).default;
      await execa("npm", publishArgs, { cwd: context.path });

      return {
        published: true,
        registry: effectiveConfig.registry,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to publish package: ${error.message}`);
      }
      throw new Error("Failed to publish package: Unknown error occurred");
    }
  }

  async getLatestVersion(
    packageName: string,
    config?: { npm: NpmConfig },
  ): Promise<string> {
    const effectiveConfig = this.getEffectiveConfig(config);
    try {
      const execa = (await import("execa")).default;
      const result: ExecaReturnValue<string | Buffer> = await execa("npm", [
        "view",
        packageName,
        "version",
        "--registry",
        effectiveConfig.registry,
      ]);

      return result.stdout.toString().trim();
    } catch {
      return "0.0.0";
    }
  }

  async checkWorkspaceIntegrity(): Promise<boolean> {
    try {
      this.logger.debug("Checking npm workspace integrity...");
      const startTime = performance.now();

      // Use --dry-run and --package-lock-only for faster checks
      await execa("npm", ["install", "--dry-run", "--package-lock-only"]);

      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      this.logger.debug(`npm integrity check completed in ${duration}s`);

      return true;
    } catch (error) {
      this.logger.debug("npm integrity check failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  async updateDependencies(
    context: PackageContext,
    dependencies: string[],
  ): Promise<void> {
    try {
      const execa = (await import("execa")).default;
      await execa("npm", ["install", ...dependencies], {
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
      const execa = (await import("execa")).default;
      const fs = await import("fs/promises");
      const path = await import("path");
      const tar = await import("tar");
      const crypto = await import("crypto");

      this.logger.debug("Starting package pack process", {
        package: context.name,
        path: context.path,
      });

      // Pack the package
      const result: ExecaReturnValue<string | Buffer> = await execa(
        "npm",
        ["pack", "--json"],
        {
          cwd: context.path,
        },
      );

      packageFile = result.stdout.toString().trim();
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
      const execa = (await import("execa")).default;
      this.logger.debug("Running npm script", {
        script,
        cwd: context.path,
      });

      await execa("npm", ["run", script], {
        cwd: context.path,
      });

      this.logger.debug("Script completed successfully", { script });
    } catch (error) {
      this.logger.error("Script execution failed", {
        script,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error(
        `Failed to run script ${script}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  async install(): Promise<void> {
    try {
      const execa = (await import("execa")).default;
      this.logger.debug("Starting npm install");

      await execa("npm", ["install"]);

      this.logger.debug("Dependencies installed successfully");
    } catch (error) {
      this.logger.error("Installation failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error(
        `Failed to install dependencies: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }
}
