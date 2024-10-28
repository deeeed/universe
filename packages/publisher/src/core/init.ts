import fs from "fs/promises";
import path from "path";
import {
  changelogTemplate,
  hooksTemplate,
  monorepoConfigTemplate,
  packageConfigTemplate,
} from "../templates";
import { Logger } from "../utils/logger";
import { WorkspaceService } from "./workspace";

export class InitService {
  private rootDir: string;

  constructor(
    private logger: Logger,
    private workspaceService: WorkspaceService = new WorkspaceService(),
  ) {
    // Initialize rootDir from workspaceService
    this.rootDir = this.workspaceService.getRootDir();
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
        await this.initializePackageFiles(pkg.name, pkg.path, options.force);

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

  private async createDirectoryStructure(packagePath: string): Promise<void> {
    // Ensure packagePath is absolute
    const absolutePackagePath = path.isAbsolute(packagePath)
      ? packagePath
      : path.join(this.rootDir, packagePath);

    this.logger.debug(`Creating directories in: ${absolutePackagePath}`);

    const dirs = [
      path.join(absolutePackagePath, ".publisher"),
      path.join(absolutePackagePath, ".publisher/hooks"),
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        this.logger.debug(`Created directory: ${dir}`);
      } catch (error) {
        this.logger.error(`Failed to create directory ${dir}:`, error);
        throw error;
      }
    }
  }

  private async initializePackageFiles(
    packageName: string,
    packagePath: string,
    force = false,
  ): Promise<void> {
    // Ensure packagePath is absolute
    const absolutePackagePath = path.isAbsolute(packagePath)
      ? packagePath
      : path.join(this.rootDir, packagePath);

    this.logger.debug(`Creating files in: ${absolutePackagePath}`);

    const files = [
      {
        path: path.join(absolutePackagePath, "publisher.config.ts"),
        content: packageConfigTemplate.replace(/\${packageName}/g, packageName),
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
            `${file.description} already exists for ${packageName}. Use --force to overwrite.`,
          );
          continue;
        }
      } catch {
        // File doesn't exist, continue with creation
      }

      await fs.writeFile(file.path, file.content);
      this.logger.info(`Created ${file.description} for ${packageName}`);
    }
  }

  private async initializeRootConfig(force = false): Promise<void> {
    const rootConfigPath = path.join(process.cwd(), "publisher.config.ts");

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

    await fs.writeFile(rootConfigPath, monorepoConfigTemplate);
    this.logger.success("Created root configuration");
  }
}
