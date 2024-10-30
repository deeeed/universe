import type {
  NpmConfig,
  PackageContext,
  DependencyUpdate,
} from "../types/config";
import { NpmService } from "./npm";
import { YarnService } from "./yarn";
import { Logger } from "../utils/logger";

export interface PackageArchiveInfo {
  filename: string;
  path: string;
  size: {
    compressed: number;
    uncompressed: number;
  };
  files: Array<{
    path: string;
    size: number;
  }>;
  created: Date;
  sha: string;
}

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
  getDependencyUpdates(): Promise<DependencyUpdate[]>;
  updateDependencies(
    context: PackageContext,
    dependencies: string[],
  ): Promise<void>;
  pack(context: PackageContext): Promise<PackageArchiveInfo>;
  runScript(context: PackageContext, script: string): Promise<void>;
  install(): Promise<void>;
}

export class PackageManagerFactory {
  private static logger = new Logger();

  static create(
    packageManager: "npm" | "yarn",
    config: NpmConfig,
  ): PackageManagerService {
    this.logger.debug("Creating package manager service:", {
      type: packageManager,
      registry: config.registry,
      access: config.access,
    });

    let service: PackageManagerService;

    switch (packageManager) {
      case "npm":
        this.logger.debug("Initializing NPM service");
        service = new NpmService(config);
        break;
      case "yarn":
        this.logger.debug("Initializing Yarn service");
        service = new YarnService(config);
        break;
      default: {
        throw new Error("Unsupported package manager");
      }
    }

    this.logger.debug("Package manager service created successfully");
    return service;
  }
}
