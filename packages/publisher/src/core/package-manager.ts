import type { NpmConfig, PackageContext } from "../types/config";
import { NpmService } from "./npm";
import { YarnService } from "./yarn";

export interface PackageManagerService {
  validateAuth(config?: { npm: NpmConfig }): Promise<void>;
  publish(
    context: PackageContext,
    config?: { npm: NpmConfig },
  ): Promise<{ published: boolean; registry: string }>;
  getLatestVersion(
    packageName: string,
    config?: { npm: NpmConfig },
  ): Promise<string>;
  checkWorkspaceIntegrity(): Promise<boolean>;
  updateDependencies(
    context: PackageContext,
    dependencies: string[],
  ): Promise<void>;
  pack(context: PackageContext): Promise<string>;
  runScript(context: PackageContext, script: string): Promise<void>;
}

export class PackageManagerFactory {
  static create(
    packageManager: "npm" | "yarn",
    config: NpmConfig,
  ): PackageManagerService {
    switch (packageManager) {
      case "npm":
        return new NpmService(config);
      case "yarn":
        return new YarnService(config);
      // Since packageManager is typed as 'npm' | 'yarn', this case is technically unreachable
      // but we include it to satisfy TypeScript's exhaustive check
      default: {
        throw new Error("Unsupported package manager");
      }
    }
  }
}
