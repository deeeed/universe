import { promises as fs } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { LoggerService } from "../services/logger.service.js";
import { getHookScript, getHookStatus } from "../utils/hook.util.js";
import { promptYesNo } from "../utils/user-prompt.util.js";
import chalk from "chalk";

interface HookCommandOptions {
  action?: "install" | "uninstall" | "status";
  global?: boolean;
  debug?: boolean;
  skipHook?: boolean;
}

export function getPackagePath(): string {
  try {
    if (typeof __dirname !== "undefined") {
      // CJS environment
      return resolve(__dirname, "..", "..");
    } else {
      // ESM environment
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      return resolve(__dirname, "..", "..");
    }
  } catch (error) {
    // Fallback to current working directory if both methods fail
    return process.cwd();
  }
}

export async function hook(options: HookCommandOptions = {}): Promise<void> {
  const logger = new LoggerService({ debug: options.debug });

  try {
    const packagePath = getPackagePath();
    const status = await getHookStatus();

    // Skip status display and prompts if skipHook is true
    if (!options.skipHook) {
      // Display current status
      logger.info("\nGitGuard Hook Status:");

      if (status.isRepo) {
        logger.info(`\nLocal repository detected at: ${process.cwd()}`);
        if (status.localHook.exists) {
          logger.info("Local hook is installed");
        } else {
          logger.info("No local hook installed");
        }
      }

      if (status.globalHook.exists) {
        logger.info(`\nGlobal hook detected at: ${status.globalHook.path}`);
      } else {
        logger.info("\nNo global hook installed");
      }
    }

    // If no action and not skipping prompts, handle interactive mode
    if (!options.action && !options.skipHook) {
      if (status.isRepo) {
        if (status.localHook.exists) {
          if (
            await promptYesNo({
              message: "\nLocal hook exists. Would you like to update it?",
              logger,
            })
          ) {
            options.action = "install";
            options.global = false;
          } else if (
            await promptYesNo({
              message: "Would you like to remove it?",
              logger,
            })
          ) {
            options.action = "uninstall";
            options.global = false;
          }
        } else {
          if (
            await promptYesNo({
              message: "\nWould you like to install a local hook?",
              logger,
            })
          ) {
            options.action = "install";
            options.global = false;
          }
        }
      }

      // If no local action chosen and global hook exists
      if (!options.action && status.globalHook.exists) {
        if (
          await promptYesNo({
            message: "\nGlobal hook exists. Would you like to update it?",
            logger,
          })
        ) {
          options.action = "install";
          options.global = true;
        } else if (
          await promptYesNo({
            message: "Would you like to remove it?",
            logger,
          })
        ) {
          options.action = "uninstall";
          options.global = true;
        }
      }

      // If still no action chosen and no hooks exist
      if (
        !options.action &&
        !status.globalHook.exists &&
        (!status.isRepo || !status.localHook.exists)
      ) {
        if (
          await promptYesNo({
            message: "\nWould you like to install a global hook?",
            logger,
          })
        ) {
          options.action = "install";
          options.global = true;
        }
      }

      // Exit if no action was chosen
      if (!options.action) {
        logger.info("\nNo action taken.");
        return;
      }
    }

    // Handle install/uninstall actions
    const targetHook = options.global ? status.globalHook : status.localHook;
    const targetType = options.global ? "global" : "local";

    // Handle uninstall
    if (options.action === "uninstall") {
      logger.info(`\nUninstalling ${targetType} hook from: ${targetHook.path}`);
      try {
        await fs.unlink(targetHook.path);
        logger.success(`Git hook uninstalled from ${targetHook.path}`);
      } catch {
        logger.warn(`No hook found at ${targetHook.path}`);
      }
      return;
    }

    // Handle install
    logger.info(`\nInstalling ${targetType} hook to: ${targetHook.path}`);
    await fs.mkdir(targetHook.hooksPath, { recursive: true });
    const hookScript = getHookScript(packagePath);

    // Force remove existing hook if it exists
    try {
      await fs.unlink(targetHook.path);
    } catch {
      // Ignore error if file doesn't exist
    }

    await fs.writeFile(targetHook.path, hookScript, { mode: 0o755 });

    // Verify installation
    const writtenContent = await fs.readFile(targetHook.path, "utf-8");
    if (writtenContent !== hookScript) {
      throw new Error("Hook file content verification failed");
    }

    logger.success(`Git hook installed at ${targetHook.path}`);

    // Skip post-install messages if skipHook is true
    if (!options.skipHook) {
      logger.info("\nTo activate the hook, set GITGUARD=true:");
      logger.info(
        `${chalk.cyan("GITGUARD=true git commit -m 'your message'")}"`,
      );

      logger.info(
        `\n${chalk.yellow("💡 Pro tip:")} Create an alias to save time!`,
      );
      logger.info(
        `${chalk.bold("Add one of these to your shell profile (~/.bashrc, ~/.zshrc):")}`,
      );

      // Option 1
      logger.info(
        `\n${chalk.green("# Option 1:")} ${chalk.bold("Quick alias for GitGuard commits")}`,
      );
      logger.info(chalk.cyan('alias gitg="GITGUARD=true git commit -m"'));
      logger.info(chalk.dim("# Usage:"));
      logger.info(chalk.yellow('gitg "your commit message"'));

      // Option 2
      logger.info(
        `\n${chalk.green("# Option 2:")} ${chalk.bold("Always enable GitGuard")}`,
      );
      logger.info(chalk.cyan("export GITGUARD=true"));
      logger.info(chalk.dim("# Then use regular git commands"));

      // Option 3
      logger.info(
        `\n${chalk.green("# Option 3:")} ${chalk.bold("Function with optional GitGuard")}`,
      );
      logger.info(chalk.cyan("function gcommit() {"));
      logger.info(chalk.cyan('  if [ "$1" = "-g" ]; then'));
      logger.info(chalk.cyan("    shift"));
      logger.info(chalk.cyan('    GITGUARD=true git commit -m "$@"'));
      logger.info(chalk.cyan("  else"));
      logger.info(chalk.cyan('    git commit -m "$@"'));
      logger.info(chalk.cyan("  fi"));
      logger.info(chalk.cyan("}"));
      logger.info(chalk.dim("# Usage:"));
      logger.info(chalk.yellow('gcommit "regular commit"'));
      logger.info(chalk.yellow('gcommit -g "GitGuard commit"'));
    }
  } catch (error) {
    logger.error("Failed to manage hook:", error);
    throw error;
  }
}
