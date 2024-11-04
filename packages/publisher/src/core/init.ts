import fs from "fs/promises";
import inquirer from "inquirer";
import path from "path";
import {
  GenerateFileFormat,
  generateMonorepoConfig,
  generatePackageConfig,
  getChangelogTemplate,
  hooksTemplate,
} from "../templates";
import type {
  MonorepoConfig,
  PackageJson,
  PackageManager,
} from "../types/config";
import { Logger } from "../utils/logger";
import { detectPackageManager } from "../utils/detect-package-manager";
import { WorkspaceService } from "./workspace";

export interface InitOptions {
  force?: boolean;
  interactive?: boolean;
  format?: GenerateFileFormat["format"];
}

// Base shared options
interface BaseInteractiveAnswers {
  packageManager: PackageManager;
  conventionalCommits: boolean;
  changelogFormat: "conventional" | "keep-a-changelog";
  versionStrategy: MonorepoConfig["versionStrategy"];
  bumpStrategy: MonorepoConfig["bumpStrategy"];
  npmPublish: boolean;
  npmAccess: "public" | "restricted";
}

// Package-specific options
interface PackageInteractiveAnswers extends BaseInteractiveAnswers {
  changelogFile?: string;
  // Add any other package-specific options
}

// Monorepo-specific options
interface MonorepoInteractiveAnswers extends BaseInteractiveAnswers {
  packagesGlob: string;
  maxConcurrency: number;
  ignorePackages: string[];
  // Add any other monorepo-specific options
}

interface InitializeParams {
  packages: string[];
  options?: InitOptions;
}

interface InitializePackageFilesParams {
  packagePath: string;
  force?: boolean;
  options?: PackageInteractiveAnswers;
  format?: "json" | "typescript";
}

interface InitializeRootConfigParams {
  force?: boolean;
  options?: MonorepoInteractiveAnswers;
  format?: GenerateFileFormat["format"];
}

interface CreateDirectoryStructureParams {
  packagePath: string;
}

export class InitService {
  private packageManager: PackageManager;

  constructor(
    private logger: Logger,
    private workspaceService: WorkspaceService = new WorkspaceService(),
  ) {
    this.packageManager = detectPackageManager(process.cwd());
  }

  async initialize({
    packages,
    options = {},
  }: InitializeParams): Promise<void> {
    try {
      let packageOptions: PackageInteractiveAnswers | undefined;
      let monorepoOptions: MonorepoInteractiveAnswers | undefined;

      if (options.interactive) {
        const isRoot = process.cwd() === this.workspaceService.getRootDir();
        if (isRoot) {
          monorepoOptions = await this.promptForMonorepoOptions();
          // Use monorepo answers as defaults for package options
          packageOptions = {
            ...monorepoOptions,
            changelogFile: "CHANGELOG.md",
          };
        } else {
          packageOptions = await this.promptForPackageOptions();
        }
      }

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
        await this.createDirectoryStructure({ packagePath: pkg.path });

        // Initialize package files
        await this.initializePackageFiles({
          packagePath: pkg.path,
          force: options.force,
          options: packageOptions,
          format: options.format,
        });

        this.logger.success(`Initialized ${pkg.name}`);
      }

      // Create root config if it doesn't exist
      await this.initializeRootConfig({
        force: options.force,
        options: monorepoOptions,
        format: options.format,
      });

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

  private async promptForPackageOptions(): Promise<PackageInteractiveAnswers> {
    const answers = await inquirer.prompt<
      Omit<PackageInteractiveAnswers, "packageManager">
    >([
      {
        type: "confirm",
        name: "conventionalCommits",
        message: "Use conventional commits?",
        default: true,
      },
      {
        type: "list",
        name: "changelogFormat",
        message: "Choose changelog format:",
        choices: [
          { name: "Conventional Changelog", value: "conventional" },
          { name: "Keep a Changelog", value: "keep-a-changelog" },
        ] as const,
        default: "conventional",
      },
      {
        type: "list",
        name: "versionStrategy",
        message: "Choose version strategy:",
        choices: ["independent", "fixed"] as const,
        default: "independent",
      },
      {
        type: "list",
        name: "bumpStrategy",
        message: "Choose bump strategy:",
        choices: ["conventional", "prompt", "auto"] as const,
        default: "prompt",
      },
      {
        type: "confirm",
        name: "npmPublish",
        message: "Publish to npm?",
        default: true,
      },
      {
        type: "list",
        name: "npmAccess",
        message: "npm package access:",
        choices: ["public", "restricted"] as const,
        default: "public",
        when: (answers: Partial<PackageInteractiveAnswers>) =>
          answers.npmPublish,
      },
      {
        type: "input",
        name: "changelogFile",
        message: "Changelog file path:",
        default: "CHANGELOG.md",
      },
    ]);

    return {
      ...answers,
      packageManager: this.packageManager,
    };
  }

  private async promptForMonorepoOptions(): Promise<MonorepoInteractiveAnswers> {
    const baseAnswers = await inquirer.prompt<
      Omit<BaseInteractiveAnswers, "packageManager">
    >([
      {
        type: "confirm",
        name: "conventionalCommits",
        message: "Use conventional commits?",
        default: true,
      },
      {
        type: "list",
        name: "changelogFormat",
        message: "Choose changelog format:",
        choices: [
          { name: "Conventional Changelog", value: "conventional" },
          { name: "Keep a Changelog", value: "keep-a-changelog" },
        ] as const,
        default: "conventional",
      },
      {
        type: "list",
        name: "versionStrategy",
        message: "Choose version strategy:",
        choices: ["independent", "fixed"] as const,
        default: "independent",
      },
      {
        type: "list",
        name: "bumpStrategy",
        message: "Choose bump strategy:",
        choices: ["conventional", "prompt", "auto"] as const,
        default: "prompt",
      },
      {
        type: "confirm",
        name: "npmPublish",
        message: "Publish to npm?",
        default: true,
      },
      {
        type: "list",
        name: "npmAccess",
        message: "npm package access:",
        choices: ["public", "restricted"] as const,
        default: "public",
        when: (answers: Partial<BaseInteractiveAnswers>) => answers.npmPublish,
      },
    ]);

    const monorepoSpecific = await inquirer.prompt<
      Omit<MonorepoInteractiveAnswers, keyof BaseInteractiveAnswers>
    >([
      {
        type: "input",
        name: "packagesGlob",
        message: "Packages glob pattern:",
        default: "packages/*",
      },
      {
        type: "number",
        name: "maxConcurrency",
        message: "Maximum concurrent package operations:",
        default: 4,
      },
      {
        type: "input",
        name: "ignorePackages",
        message: "Packages to ignore (comma-separated):",
        default: "",
        filter: (input: string) =>
          input ? input.split(",").map((p) => p.trim()) : [],
      },
    ]);

    return {
      ...baseAnswers,
      ...monorepoSpecific,
      packageManager: this.packageManager,
    };
  }

  private async initializePackageFiles({
    packagePath,
    force = false,
    options,
    format = "json",
  }: InitializePackageFilesParams): Promise<void> {
    const rootDir = this.workspaceService.getRootDir();
    const absolutePackagePath = path.isAbsolute(packagePath)
      ? packagePath
      : path.join(rootDir, packagePath);

    // Ensure directory structure exists
    await this.createDirectoryStructure({ packagePath: absolutePackagePath });

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

    // Ensure all parent directories exist for each file
    const configExtension = format === "json" ? "json" : "ts";

    for (const file of [
      {
        path: path.join(
          absolutePackagePath,
          `publisher.config.${configExtension}`,
        ),
        content: generatePackageConfig({
          options: {
            packageJson,
            packageManager: this.packageManager,
            conventionalCommits: options?.conventionalCommits,
            changelogFormat: options?.changelogFormat,
            versionStrategy: options?.versionStrategy,
            bumpStrategy: options?.bumpStrategy,
            npm: options
              ? {
                  publish: options.npmPublish,
                  access: options.npmAccess,
                }
              : undefined,
          },
          format,
        }),
        description: "package configuration",
      },
      {
        path: path.join(absolutePackagePath, "CHANGELOG.md"),
        content: getChangelogTemplate(
          options?.changelogFormat ?? "conventional",
        ),
        description: "changelog",
      },
      {
        path: path.join(absolutePackagePath, ".publisher/hooks/index.ts"),
        content: hooksTemplate,
        description: "release hooks",
      },
    ]) {
      try {
        // Ensure parent directory exists
        await fs.mkdir(path.dirname(file.path), { recursive: true });

        // Check if file exists
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
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to create ${file.description}: ${errorMessage}`,
        );
      }
    }
  }

  private async initializeRootConfig({
    force = false,
    options,
    format = "json",
  }: InitializeRootConfigParams): Promise<void> {
    const rootDir = this.workspaceService.getRootDir();
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

    const packageManager = options?.packageManager ?? this.packageManager;

    const packageJsonPath = path.join(rootDir, "package.json");
    const packageJson = await fs
      .readFile(packageJsonPath, "utf-8")
      .then((content) => JSON.parse(content) as PackageJson)
      .catch(() => {
        throw new Error("Could not read package.json for root config");
      });

    const content = generateMonorepoConfig({
      options: {
        packageJson,
        packageManager,
        conventionalCommits: options?.conventionalCommits,
        versionStrategy: options?.versionStrategy,
        bumpStrategy: options?.bumpStrategy,
        packagesGlob: "packages/*",
      },
      format,
    });

    await fs.writeFile(rootConfigPath, content);
    this.logger.success("Created root configuration");
  }

  private async createDirectoryStructure({
    packagePath,
  }: CreateDirectoryStructureParams): Promise<void> {
    const publisherDir = path.join(packagePath, ".publisher");
    const hooksDir = path.join(publisherDir, "hooks");

    try {
      // Create directories with recursive option
      await fs.mkdir(publisherDir, { recursive: true });
      await fs.mkdir(hooksDir, { recursive: true });

      // Verify directories were created
      const publisherStats = await fs.stat(publisherDir);
      const hooksStats = await fs.stat(hooksDir);

      if (!publisherStats.isDirectory() || !hooksStats.isDirectory()) {
        throw new Error(
          "Failed to create directory structure - not a directory",
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create directory structure: ${errorMessage}`, {
        cause: error,
      });
    }
  }
}
