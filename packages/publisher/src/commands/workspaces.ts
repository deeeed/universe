import { Command } from "commander";
import { WorkspaceService } from "../core/workspace";
import { Logger } from "../utils/logger";

interface WorkspacesCommandOptions {
  json?: boolean;
  full?: boolean;
}

export const workspacesCommand = new Command()
  .name("workspaces")
  .description("Manage and inspect workspace packages");

workspacesCommand
  .command("list")
  .description("List all packages in the workspace")
  .option("-j, --json", "Output in JSON format")
  .option("-f, --full", "Show full package details")
  .action(async (options: WorkspacesCommandOptions) => {
    const logger = new Logger();
    const workspaceService = new WorkspaceService();

    try {
      const packages = await workspaceService.getPackages();

      if (packages.length === 0) {
        logger.warning("No packages found in workspace");
        return;
      }

      if (options.json) {
        const output = options.full
          ? packages
          : packages.map((pkg) => ({
              name: pkg.name,
              version: pkg.currentVersion,
              path: pkg.path,
            }));
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      logger.info(`\nWorkspace Packages (${packages.length}):\n`);

      if (options.full) {
        packages.forEach((pkg) => {
          logger.info(`📦 ${pkg.name}@${pkg.currentVersion}`);
          logger.info(`   Path: ${pkg.path}`);
          if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
            logger.info("   Dependencies:");
            Object.entries(pkg.dependencies).forEach(([name, version]) => {
              logger.info(`   - ${name}@${version}`);
            });
          }
          if (
            pkg.devDependencies &&
            Object.keys(pkg.devDependencies).length > 0
          ) {
            logger.info("   Dev Dependencies:");
            Object.entries(pkg.devDependencies).forEach(([name, version]) => {
              logger.info(`   - ${name}@${version}`);
            });
          }
          logger.info("");
        });
      } else {
        packages.forEach((pkg) => {
          logger.info(`📦 ${pkg.name}@${pkg.currentVersion} (${pkg.path})`);
        });
      }
    } catch (error) {
      logger.error(
        "Failed to list packages:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

workspacesCommand
  .command("changed")
  .description("List packages that have changes since last release")
  .option("-j, --json", "Output in JSON format")
  .action(async (options: WorkspacesCommandOptions) => {
    const logger = new Logger();
    const workspaceService = new WorkspaceService();

    try {
      const changedPackages = await workspaceService.getChangedPackages();

      if (changedPackages.length === 0) {
        logger.info("No packages have changed since last release");
        return;
      }

      if (options.json) {
        const output = changedPackages.map((pkg) => ({
          name: pkg.name,
          version: pkg.currentVersion,
          path: pkg.path,
        }));
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      logger.info(`\nChanged Packages (${changedPackages.length}):\n`);
      changedPackages.forEach((pkg) => {
        logger.info(`📦 ${pkg.name}@${pkg.currentVersion} (${pkg.path})`);
      });
    } catch (error) {
      logger.error(
        "Failed to list changed packages:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

workspacesCommand
  .command("info")
  .description(
    "Show detailed information about packages. When run from within a package directory, defaults to the current package. " +
      "In monorepo root, requires package names.",
  )
  .argument(
    "[packages...]",
    "Package names to show info for (optional when in package directory)",
  )
  .option("-j, --json", "Output in JSON format")
  .action(async (packages: string[], options: WorkspacesCommandOptions) => {
    const logger = new Logger();
    const workspaceService = new WorkspaceService();

    try {
      if (packages.length === 0) {
        const currentPackage = await workspaceService.getCurrentPackage();
        if (currentPackage) {
          packages = [currentPackage.name];
        }
      }

      const packageInfos = await workspaceService.getPackages(packages);

      if (packageInfos.length === 0) {
        logger.error(`No matching packages found for: ${packages.join(", ")}`);
        process.exit(1);
      }

      if (options.json) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(packageInfos, null, 2));
        return;
      }

      packageInfos.forEach((pkg) => {
        logger.info(`\n📦 ${pkg.name}`);
        logger.info(`Version: ${pkg.currentVersion}`);
        logger.info(`Path: ${pkg.path}`);

        if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
          logger.info("\nDependencies:");
          Object.entries(pkg.dependencies).forEach(([name, version]) =>
            logger.info(`- ${name}@${version}`),
          );
        }

        if (
          pkg.devDependencies &&
          Object.keys(pkg.devDependencies).length > 0
        ) {
          logger.info("\nDev Dependencies:");
          Object.entries(pkg.devDependencies).forEach(([name, version]) =>
            logger.info(`- ${name}@${version}`),
          );
        }

        if (
          pkg.peerDependencies &&
          Object.keys(pkg.peerDependencies).length > 0
        ) {
          logger.info("\nPeer Dependencies:");
          Object.entries(pkg.peerDependencies).forEach(([name, version]) =>
            logger.info(`- ${name}@${version}`),
          );
        }
      });
    } catch (error) {
      logger.error(
        "Failed to get package info:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

export default workspacesCommand;
