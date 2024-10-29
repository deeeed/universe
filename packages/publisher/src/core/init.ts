import fs from "fs/promises";
import path from "path";
import {
  changelogTemplate,
  hooksTemplate,
  generatePackageConfig,
  generateMonorepoConfig,
} from "../templates";
import { Logger } from "../utils/logger";
import { WorkspaceService } from "./workspace";
import { PackageManagerDetector } from "../utils/packageManagerDetector";
import type { PackageJson } from "../types/config";

export class InitService {
  private packageManagerDetector: PackageManagerDetector;

  constructor(
    private logger: Logger,
    private workspaceService: WorkspaceService = new WorkspaceService(),
  ) {
    this.packageManagerDetector = new PackageManagerDetector(process.cwd());
  }

  async initialize(
    packages: string[],
    options: { force?: boolean } = {},
  ): Promise<void> {
    try {
      // Get packages to initialize
      const packagesToInit =
        packages.length > 0
          ? await this.workspaceService.getPackages(packages)
          : await this.workspaceService.getPackages();

      if (packagesToInit.length === 0) {
        throw new Error("No packages found to initialize");
      }

      // Initialize each package
      for (const pkg of packagesToInit) {
        this.logger.info(`\nInitializing ${pkg.name}...`);

        // Create directory structure
        await this.createDirectoryStructure(pkg.path);

        // Initialize package files
        await this.initializePackageFiles(pkg.path, options.force);

        this.logger.success(`Initialized ${pkg.name}`);
      }

      // Create root config if it doesn't exist
      await this.initializeRootConfig(options.force);

      this.logger.success("\nInitialization completed successfully!");
      this.logger.info("\nNext steps:");
      this.logger.info("1. Review and adjust the generated configurations");
      this.logger.info(
        "2. Update CHANGELOG.md files with your initial content",
      );
      this.logger.info("3. Review and customize release hooks in hooks.ts");
      this.logger.info("4. Commit the changes");
    } catch (error) {
      this.logger.error("Initialization failed:", error);
      throw error;
    }
  }

  private async initializePackageFiles(
    packagePath: string,
    force = false,
  ): Promise<void> {
    const rootDir = await this.workspaceService.getRootDir();
    const absolutePackagePath = path.isAbsolute(packagePath)
      ? packagePath
      : path.join(rootDir, packagePath);

    // Get async dependencies first
    const packageManager =
      await this.packageManagerDetector.detectPackageManager();
    const packageJsonPath = path.join(absolutePackagePath, "package.json");
    const packageJson = await fs
      .readFile(packageJsonPath, "utf-8")
      .then((content) => JSON.parse(content) as PackageJson)
      .catch(() => {
        throw new Error(
          `Could not read package.json in ${absolutePackagePath}`,
        );
      });

    this.logger.debug(`Creating files in: ${absolutePackagePath}`);

    const files = [
      {
        path: path.join(absolutePackagePath, "publisher.config.ts"),
        content: generatePackageConfig({
          packageJson,
          packageManager,
        }),
        description: "package configuration",
      },
      {
        path: path.join(absolutePackagePath, "CHANGELOG.md"),
        content: changelogTemplate,
        description: "changelog",
      },
      {
        path: path.join(absolutePackagePath, ".publisher/hooks/index.ts"),
        content: hooksTemplate,
        description: "release hooks",
      },
    ];

    for (const file of files) {
      try {
        await fs.access(file.path);
        if (!force) {
          this.logger.warning(
            `${file.description} already exists for ${packagePath}. Use --force to overwrite.`,
          );
          continue;
        }
      } catch {
        // File doesn't exist, continue with creation
      }

      await fs.writeFile(file.path, file.content);
      this.logger.info(`Created ${file.description} for ${packagePath}`);
    }
  }

  private async initializeRootConfig(force = false): Promise<void> {
    const rootDir = await this.workspaceService.getRootDir();
    const currentDir = process.cwd();

    if (rootDir !== currentDir) {
      this.logger.debug("Skipping root config creation - not in monorepo root");
      return;
    }

    const rootConfigPath = path.join(rootDir, "publisher.config.ts");

    try {
      await fs.access(rootConfigPath);
      if (!force) {
        this.logger.info(
          "Root config already exists. Use --force to overwrite.",
        );
        return;
      }
    } catch {
      // File doesn't exist, continue
    }

    // Get async dependencies first
    const packageManager =
      await this.packageManagerDetector.detectPackageManager();
    const packageJsonPath = path.join(rootDir, "package.json");
    const packageJson = await fs
      .readFile(packageJsonPath, "utf-8")
      .then((content) => JSON.parse(content) as PackageJson)
      .catch(() => {
        throw new Error("Could not read package.json for root config");
      });

    const content = generateMonorepoConfig({
      packageJson,
      packageManager,
      packagesGlob: "packages/*", // You might want to make this configurable
    });

    await fs.writeFile(rootConfigPath, content);
    this.logger.success("Created root configuration");
  }

  private async createDirectoryStructure(packagePath: string): Promise<void> {
    const publisherDir = path.join(packagePath, ".publisher");
    const hooksDir = path.join(publisherDir, "hooks");

    try {
      await fs.mkdir(publisherDir, { recursive: true });
      await fs.mkdir(hooksDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory structure`, { cause: error });
    }
  }
}
