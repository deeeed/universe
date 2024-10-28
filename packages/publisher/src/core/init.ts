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
import { PackageManagerDetector } from "../utils/packageManagerDetector";
import { prompt } from "inquirer";

interface InitializeOptions {
  force?: boolean;
  interactive?: boolean;
}

export class InitService {
  constructor(
    private logger: Logger,
    private workspaceService: WorkspaceService = new WorkspaceService(),
  ) {}

  async initialize(
    packages: string[],
    options: InitializeOptions = {},
  ): Promise<void> {
    try {
      // Detect package manager
      const packageManagerDetector = new PackageManagerDetector(
        await this.workspaceService.getRootDir(),
      );
      const packageManager = await packageManagerDetector.detectPackageManager();

      this.logger.info(`Detected package manager: ${packageManager}`);

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

        // Collect custom configuration if interactive mode is enabled
        let customConfig: string | undefined;
        if (options.interactive) {
          customConfig = await this.collectCustomConfig(pkg.name, packageManager);
        }

        // Initialize package files
        await this.initializePackageFiles(
          pkg.name,
          pkg.path,
          pkg.currentVersion ?? "1.0.0",
          packageManager,
          options.force,
          customConfig,
        );

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
    const rootDir = await this.workspaceService.getRootDir();

    // Ensure packagePath is absolute
    const absolutePackagePath = path.isAbsolute(packagePath)
      ? packagePath
      : path.join(rootDir, packagePath);

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
    version: string,
    packageManager: string,
    force = false,
    customConfig?: string,
  ): Promise<void> {
    const rootDir = await this.workspaceService.getRootDir();

    // Ensure packagePath is absolute
    const absolutePackagePath = path.isAbsolute(packagePath)
      ? packagePath
      : path.join(rootDir, packagePath);

    this.logger.debug(`Creating files in: ${absolutePackagePath}`);

    // Generate package configuration content
    const packageConfigContent = customConfig
      ? customConfig
      : packageConfigTemplate
          .replace(/{{packageName}}/g, packageName)
          .replace(/{{version}}/g, version)
          .replace(/{{packageManager}}/g, packageManager);

    const files = [
      {
        path: path.join(absolutePackagePath, "publisher.config.ts"),
        content: packageConfigContent,
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
    const rootDir = await this.workspaceService.getRootDir();
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

    await fs.writeFile(rootConfigPath, monorepoConfigTemplate);
    this.logger.success("Created root configuration");
  }

  private async collectCustomConfig(
    packageName: string,
    packageManager: string,
  ): Promise<string> {
    const responses = await prompt([
      {
        type: "input",
        name: "registry",
        message: `Enter the NPM registry URL for ${packageName}:`,
        default: "https://registry.npmjs.org",
      },
      {
        type: "confirm",
        name: "conventionalCommits",
        message: "Use conventional commits?",
        default: true,
      },
      {
        type: "list",
        name: "versionStrategy",
        message: "Select version strategy:",
        choices: ["independent", "synchronized"],
        default: "independent",
      },
      // Add more prompts as needed
    ]);

    // Build custom configuration content
    const customConfig = `import type { ReleaseConfig } from '@siteed/publisher';

const config: ReleaseConfig = {
  packageManager: '${packageManager}',
  changelogFile: 'CHANGELOG.md',
  conventionalCommits: ${responses.conventionalCommits},
  versionStrategy: '${responses.versionStrategy}',
  bumpStrategy: 'prompt',
  git: {
    tagPrefix: '${packageName}-v',
    requireCleanWorkingDirectory: true,
    requireUpToDate: true,
    commit: true,
    push: true,
    commitMessage: 'chore(${packageName}): release v\${version}',
    tag: true,
    allowedBranches: ['main', 'master'],
    remote: 'origin',
  },
  npm: {
    publish: true,
    registry: '${responses.registry}',
    tag: 'latest',
    access: 'public',
  },
  hooks: {
    preRelease: async () => {
      // Add your pre-release checks here
    },
  },
};

export default config;`;

    return customConfig;
  }
}
