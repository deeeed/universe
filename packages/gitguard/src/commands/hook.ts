import { promises as fs } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { LoggerService } from "../services/logger.service.js";
import { execSync } from "child_process";

interface HookCommandOptions {
  action?: "install" | "uninstall" | "status";
  global?: boolean;
  debug?: boolean;
  skipHook?: boolean;
}

interface HookStatus {
  isRepo: boolean;
  globalHook: {
    exists: boolean;
    path: string;
    hooksPath: string;
  };
  localHook: {
    exists: boolean;
    path: string;
    hooksPath: string;
  };
}

function getGlobalHooksPath(): string {
  try {
    const output = execSync("git config --global core.hooksPath", {
      encoding: "utf-8",
    }).trim();
    if (output) return output;
    return join(process.env.HOME || "~", ".config", "git", "hooks");
  } catch {
    return join(process.env.HOME || "~", ".config", "git", "hooks");
  }
}

function getLocalHooksPath(): string {
  try {
    const gitDir = execSync("git rev-parse --git-dir", {
      encoding: "utf-8",
    }).trim();
    return join(gitDir, "hooks");
  } catch {
    throw new Error("Not a git repository");
  }
}

function isGitRepository(): boolean {
  try {
    execSync("git rev-parse --git-dir", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function checkHookInstallation(hookPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(hookPath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function getHookStatus(): Promise<HookStatus> {
  const isRepo = isGitRepository();
  const globalHooksPath = getGlobalHooksPath();
  const globalHookPath = join(globalHooksPath, "prepare-commit-msg");

  const status: HookStatus = {
    isRepo,
    globalHook: {
      exists: await checkHookInstallation(globalHookPath),
      path: globalHookPath,
      hooksPath: globalHooksPath,
    },
    localHook: {
      exists: false,
      path: "",
      hooksPath: "",
    },
  };

  if (isRepo) {
    const localHooksPath = getLocalHooksPath();
    const localHookPath = join(localHooksPath, "prepare-commit-msg");
    status.localHook = {
      exists: await checkHookInstallation(localHookPath),
      path: localHookPath,
      hooksPath: localHooksPath,
    };
  }

  return status;
}

function getHookScript(packagePath: string): string {
  return `#!/usr/bin/env node
// Skip hook if SKIP_GITGUARD is set
if (process.env.SKIP_GITGUARD === 'true') {
  process.exit(0);
}

const DEBUG = process.env.GITGUARD_DEBUG === 'true';
const path = require('path');

try {
  const prepareCommitPath = path.resolve('${packagePath}', 'dist/cjs/hooks/prepare-commit.cjs');
  const { prepareCommit } = require(prepareCommitPath);
  const messageFile = process.argv[2];
  
  if (!messageFile) {
    console.error('No commit message file provided');
    process.exit(1);
  }

  prepareCommit({ messageFile })
    .catch((error) => {
      console.error('Hook failed:', error);
      process.exit(1);
    });
} catch (error) {
  console.error('Failed to run hook:', error);
  process.exit(1);
}`;
}

async function prompt(
  logger: LoggerService,
  question: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    logger.info(`${question} [Y/n]`);

    const onData = (data: string): void => {
      const response = data.trim().toLowerCase();
      process.stdin.removeListener("data", onData);
      resolve(response === "" || response === "y" || response === "yes");
    };

    process.stdin.once("data", onData);
  });
}

function getPackagePath(): string {
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
    logger.info("\n📦 GitGuard Hook Status:");

    if (status.isRepo) {
      logger.info(`\nLocal repository detected at: ${process.cwd()}`);
      if (status.localHook.exists) {
        logger.info("✓ Local hook is installed");
      } else {
        logger.info("✗ No local hook installed");
      }
    }

    if (status.globalHook.exists) {
      logger.info(`\nGlobal hook detected at: ${status.globalHook.path}`);
    } else {
      logger.info("\n✗ No global hook installed");
    }

    // Handle different modes
    if (options.action === "status") {
      // Show suggestions for status command
      logger.info("\n📝 Suggested actions:");
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
      // Set up stdin for the entire interactive session
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      try {
        if (status.isRepo) {
          if (status.localHook.exists) {
            if (
              await prompt(
                logger,
                "\nLocal hook exists. Would you like to update it?",
              )
            ) {
              options.action = "install";
              options.global = false;
            } else if (await prompt(logger, "Would you like to remove it?")) {
              options.action = "uninstall";
              options.global = false;
            }
          } else {
            if (
              await prompt(logger, "\nWould you like to install a local hook?")
            ) {
              options.action = "install";
              options.global = false;
            }
          }
        }

        // If no local action chosen and global hook exists
        if (!options.action && status.globalHook.exists) {
          if (
            await prompt(
              logger,
              "\nGlobal hook exists. Would you like to update it?",
            )
          ) {
            options.action = "install";
            options.global = true;
          } else if (await prompt(logger, "Would you like to remove it?")) {
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
            await prompt(logger, "\nWould you like to install a global hook?")
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
      } finally {
        // Clean up stdin
        process.stdin.pause();
      }
    }

    // Handle install/uninstall actions
    const targetHook = options.global ? status.globalHook : status.localHook;
    const targetType = options.global ? "global" : "local";

    // Handle uninstall
    if (options.action === "uninstall") {
      logger.info(
        `\n🗑️  Uninstalling ${targetType} hook from: ${targetHook.path}`,
      );
      try {
        await fs.unlink(targetHook.path);
        logger.success(`✅ Git hook uninstalled from ${targetHook.path}`);
      } catch {
        logger.warn(`No hook found at ${targetHook.path}`);
      }
      return;
    }

    // Handle install
    logger.info(`\n📥 Installing ${targetType} hook to: ${targetHook.path}`);
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

    logger.success(`✅ Git hook installed at ${targetHook.path}`);
    if (options.skipHook) {
      logger.info("To skip the hook, set SKIP_GITGUARD=true:");
      logger.info("SKIP_GITGUARD=true git commit -m 'your message'");
    }
  } catch (error) {
    logger.error("Failed to manage hook:", error);
    throw error;
  }
}
