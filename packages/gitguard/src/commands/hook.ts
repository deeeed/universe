import { promises as fs } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { LoggerService } from "../services/logger.service.js";
import { getHookScript, getHookStatus } from "../utils/hook.util.js";
import { promptYesNo } from "../utils/user-prompt.util.js";

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

    // Handle different modes
    if (options.action === "status") {
      // Show suggestions for status command
      logger.info("\nSuggested actions:");
      if (status.isRepo) {
        if (status.localHook.exists) {
          logger.info("• To reinstall local hook:  gitguard hook install");
          logger.info("• To remove local hook:     gitguard hook uninstall");
        } else {
          logger.info("• To install local hook:    gitguard hook install");
        }
      }
      if (status.globalHook.exists) {
        logger.info("• To reinstall global hook: gitguard hook install -g");
        logger.info("• To remove global hook:    gitguard hook uninstall -g");
      } else {
        logger.info("• To install global hook:   gitguard hook install -g");
      }
      return;
    }

    // Interactive mode when no action is provided
    if (!options.action) {
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
    if (options.skipHook) {
      logger.info("To skip the hook, set SKIP_GITGUARD=true:");
      logger.info("SKIP_GITGUARD=true git commit -m 'your message'");
    }
  } catch (error) {
    logger.error("Failed to manage hook:", error);
    throw error;
  }
}
