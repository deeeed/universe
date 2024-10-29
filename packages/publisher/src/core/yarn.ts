import execa, { ExecaReturnValue } from "execa";
import type { NpmConfig, PackageContext } from "../types/config";
import { PackageManagerService } from "./package-manager";
import { Logger } from "../utils/logger";

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
    try {
      const version = await this.getYarnVersion();
      this.logger.debug("Using Yarn version:", version);

      // For Yarn Berry (v2+), we need to use different command format
      const args =
        version.major === 1
          ? ["whoami", "--registry", effectiveConfig.registry]
          : ["npm", "whoami", "--publish"]; // Add --publish flag for Yarn Berry

      this.logger.debug("Executing auth command:", args.join(" "));
      const result = await this.execYarnCommand(args);

      if (!result.stdout || result.stdout.toString().trim() === "") {
        throw new Error("Not authenticated to npm registry");
      }
    } catch (error) {
      const yarnVersion = await this.getYarnVersion();
      const isYarnBerry = yarnVersion.major >= 2;

      let errorMessage = "npm authentication failed.\n\n";
      errorMessage += "To fix this issue:\n";

      if (isYarnBerry) {
        errorMessage += `1. Run 'yarn npm login --publish' to authenticate with the npm registry
2. Make sure you have the correct npm credentials
3. If you're using a custom registry, configure it using:
   yarn config set npmRegistryServer ${effectiveConfig.registry}
4. For organizations, you might need to run:
   yarn npm login --scope=@your-org --publish\n`;
      } else {
        errorMessage += `1. Run 'yarn login' to authenticate with the npm registry
2. Make sure you have the correct npm credentials
3. If you're using a custom registry, use:
   yarn login --registry ${effectiveConfig.registry}\n`;
      }

      errorMessage += "\nOriginal error: ";
      if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += "Unknown error occurred";
      }

      this.logger.error("Authentication failed:", error);
      throw new Error(errorMessage);
    }
  }

  async publish(
    context: PackageContext,
    config?: { npm: NpmConfig },
  ): Promise<{ published: boolean; registry: string }> {
    const effectiveConfig = this.getEffectiveConfig(config);
    const version = await this.getYarnVersion();

    this.logger.debug("Publishing package:", {
      name: context.name,
      version: context.currentVersion,
      path: context.path,
      registry: effectiveConfig.registry,
      tag: effectiveConfig.tag,
      access: effectiveConfig.access,
    });

    const publishArgs =
      version.major === 1
        ? [
            "publish",
            "--registry",
            effectiveConfig.registry,
            "--tag",
            effectiveConfig.tag,
            "--access",
            effectiveConfig.access,
          ]
        : [
            "npm",
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
      this.logger.debug("Using OTP for publishing");
    }

    try {
      this.logger.debug("Executing publish command:", publishArgs.join(" "));
      await this.execYarnCommand(publishArgs);

      const result = {
        published: true,
        registry: effectiveConfig.registry,
      };
      this.logger.debug("Package published successfully:", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to publish package:", error);
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
      await execa("yarn", ["install", "--check-cache"]);
      return true;
    } catch {
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

  async pack(context: PackageContext): Promise<string> {
    try {
      this.logger.debug("Current working directory:", process.cwd());
      this.logger.debug("Context path:", context.path);

      const result: ExecaReturnValue<string> = await execa(
        "yarn",
        ["pack", "--json"],
        {
          cwd: context.path,
        },
      );

      const parsed = this.parseJsonResponse<YarnInfoResponse>(result.stdout);
      if (!parsed.filename) {
        this.logger.debug("No package file was created during pack");
        return "";
      }

      return parsed.filename;
    } catch (error) {
      this.logger.debug("Package pack failed:", error);
      return ""; // Return empty string instead of throwing
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
