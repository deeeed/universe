import { Command } from "commander";
import { promises as fsPromises } from "fs";
import path from "path";
import { ChangelogService } from "../core/changelog";
import { loadConfig } from "../core/config";
import { GitService } from "../core/git";
import { NpmService } from "../core/npm";
import { WorkspaceService } from "../core/workspace";
import type { PackageContext, ReleaseConfig } from "../types/config";
import { Logger } from "../utils/logger";

interface ValidateCommandOptions {
  all?: boolean;
}

interface PackageJsonContent {
  name?: string;
  version?: string;
  main?: string;
  types?: string;
  files?: string[];
}

export class ValidateCommand {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly gitService: GitService,
    private readonly npmService: NpmService,
    private readonly logger: Logger,
  ) {}

  async validate(
    packages: string[],
    options: ValidateCommandOptions,
  ): Promise<void> {
    try {
      // Get packages to validate
      const packagesToValidate = options.all
        ? await this.workspaceService.getPackages()
        : await this.workspaceService.getPackages(packages);

      if (packagesToValidate.length === 0) {
        this.logger.error("No packages found to validate");
        process.exit(1);
      }

      this.logger.info("Validating packages...");

      for (const pkg of packagesToValidate) {
        await this.validatePackage(pkg);
      }

      this.logger.success("\nAll validations passed successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("\nValidation failed:", errorMessage);
      process.exit(1);
    }
  }

  private async validatePackage(pkg: PackageContext): Promise<void> {
    this.logger.info(`\nValidating ${pkg.name}...`);
    const packageConfig = await this.workspaceService.getPackageConfig(
      pkg.name,
    );

    // Git checks
    try {
      await this.gitService.validateStatus(packageConfig);
      this.logger.success("Git status: OK");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Git status: ${errorMessage}`);
      throw error;
    }

    // NPM checks
    if (packageConfig.npm.publish) {
      try {
        await this.npmService.validateAuth(packageConfig);
        this.logger.success("NPM authentication: OK");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`NPM authentication: ${errorMessage}`);
        throw error;
      }
    }

    // Package.json validation
    await this.validatePackageJson(pkg);

    // Changelog validation
    await this.validateChangelog(pkg, packageConfig);
  }

  private async validatePackageJson(pkg: PackageContext): Promise<void> {
    const requiredFields = ["name", "version", "main", "types", "files"];
    const missingFields: string[] = [];

    try {
      const packageJsonPath = path.join(pkg.path, "package.json");
      const content = await fsPromises.readFile(packageJsonPath, "utf8");
      const packageJson = JSON.parse(content) as PackageJsonContent;

      for (const field of requiredFields) {
        if (!packageJson[field as keyof PackageJsonContent]) {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        throw new Error(
          `Missing required fields in package.json: ${missingFields.join(", ")}`,
        );
      }

      this.logger.success("Package.json validation: OK");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Unable to read or validate package.json for ${pkg.name}: ${errorMessage}`,
      );
      throw error;
    }
  }

  private async validateChangelog(
    pkg: PackageContext,
    config: ReleaseConfig,
  ): Promise<void> {
    const changelogService = new ChangelogService(this.logger);
    await changelogService.validate(pkg, config);
  }
}

export const validateCommand = new Command()
  .name("validate")
  .description("Validate package(s) release readiness")
  .argument("[packages...]", "Package names to validate")
  .option("-a, --all", "Validate all packages")
  .action(
    async (packages: string[], commandOptions: ValidateCommandOptions) => {
      const logger = new Logger();
      const config = await loadConfig();

      const workspaceService = new WorkspaceService(config, logger);
      const gitService = new GitService(config.git);
      const npmService = new NpmService(config.npm);

      const validateCommand = new ValidateCommand(
        workspaceService,
        gitService,
        npmService,
        logger,
      );

      await validateCommand.validate(packages, commandOptions);
    },
  );
