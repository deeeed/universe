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

export const validateCommand = new Command()
  .name("validate")
  .description("Validate package(s) release readiness")
  .argument("[packages...]", "Package names to validate")
  .option("-a, --all", "Validate all packages")
  .action(
    async (packages: string[], commandOptions: ValidateCommandOptions) => {
      const logger = new Logger();

      try {
        const config = await loadConfig();
        const workspaceService = new WorkspaceService();
        const gitService = new GitService(config.git);
        const npmService = new NpmService(config.npm);

        // Get packages to validate
        const packagesToValidate = commandOptions.all
          ? await workspaceService.getPackages()
          : await workspaceService.getPackages(packages);

        if (packagesToValidate.length === 0) {
          logger.error("No packages found to validate");
          process.exit(1);
        }

        logger.info("Validating packages...");

        for (const pkg of packagesToValidate) {
          logger.info(`\nValidating ${pkg.name}...`);
          const packageConfig = await workspaceService.getPackageConfig(
            pkg.name,
          );

          // Git checks
          try {
            await gitService.validateStatus(packageConfig);
            logger.success("Git status: OK");
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            logger.error(`Git status: ${errorMessage}`);
            throw error;
          }

          // NPM checks
          if (packageConfig.npm.publish) {
            try {
              await npmService.validateAuth(packageConfig);
              logger.success("NPM authentication: OK");
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              logger.error(`NPM authentication: ${errorMessage}`);
              throw error;
            }
          }

          // Package.json validation
          await validatePackageJson(pkg, logger);

          // Changelog validation
          await validateChangelog(pkg, packageConfig, logger);
        }

        logger.success("\nAll validations passed successfully!");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error("\nValidation failed:", errorMessage);
        process.exit(1);
      }
    },
  );

async function validatePackageJson(
  pkg: PackageContext,
  logger: Logger,
): Promise<void> {
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

    logger.success("Package.json validation: OK");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      `Unable to read or validate package.json for ${pkg.name}: ${errorMessage}`,
    );
    throw error;
  }
}

async function validateChangelog(
  pkg: PackageContext,
  config: ReleaseConfig,
  logger: Logger,
): Promise<void> {
  const changelogService = new ChangelogService(logger);
  await changelogService.validate(pkg, config);
}
