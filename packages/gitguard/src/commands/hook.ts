/* eslint-disable no-console */
import { promises as fs } from "fs";
import { join, resolve } from "path";
import { LoggerService } from "../services/logger.service.js";
import { execSync } from "child_process";

interface HookCommandOptions {
  action: "install" | "uninstall";
  global?: boolean;
  debug?: boolean;
}

function getGlobalHooksPath(): string {
  try {
    const output = execSync("git config --global core.hooksPath", {
      encoding: "utf-8",
    }).trim();
    if (output) return output;

    // Default to ~/.config/git/hooks
    return join(process.env.HOME || "~", ".config", "git", "hooks");
  } catch {
    // Default to ~/.config/git/hooks if command fails
    return join(process.env.HOME || "~", ".config", "git", "hooks");
  }
}

function getLocalHooksPath(): string {
  try {
    const gitDir = execSync("git rev-parse --git-dir", {
      encoding: "utf-8",
    }).trim();
    return join(gitDir, "hooks");
  } catch (error) {
    throw new Error("Not a git repository");
  }
}

function getHookScript(packagePath: string): string {
  return `#!/usr/bin/env node
const DEBUG = process.env.GITGUARD_DEBUG === 'true';

function debug(...args) {
  if (DEBUG) console.log(...args);
}

debug('Hook script starting...');
debug('Package path:', '${packagePath}');

try {
  // Use direct path to the prepare-commit.cjs file
  const { prepareCommit } = require('${packagePath}/dist/cjs/hooks/prepare-commit.cjs');
  debug('Successfully loaded prepareCommit');

  // Get the commit message file from git
  const messageFile = process.argv[2];
  if (!messageFile) {
    console.error('No commit message file provided');
    process.exit(1);
  }

  debug('Message file:', messageFile);

  // Run the hook
  prepareCommit({ messageFile })
    .catch((error) => {
      console.error('Hook failed:', error);
      process.exit(1);
    });
} catch (error) {
  console.error('Failed to load or run hook:', error);
  console.error('Error details:', error.message);
  console.error('Module path attempted:', '${packagePath}/dist/cjs/hooks/prepare-commit.cjs');
  process.exit(1);
}
`;
}

export async function hook(options: HookCommandOptions): Promise<void> {
  const logger = new LoggerService({ debug: options.debug });
  logger.info("Hook function called with options:", options);

  try {
    // Get the absolute path to the package
    const packagePath = resolve(__dirname, "../../..");
    logger.debug("Package path:", packagePath);

    const hooksPath = options.global
      ? getGlobalHooksPath()
      : getLocalHooksPath();

    logger.debug("Hooks path:", hooksPath);

    const hookPath = join(hooksPath, "prepare-commit-msg");
    logger.debug("Hook path:", hookPath);

    if (options.action === "uninstall") {
      try {
        await fs.unlink(hookPath);
        logger.success(`✅ Git hook uninstalled from ${hookPath}`);
      } catch (error) {
        logger.warn(`No hook found at ${hookPath}`);
      }
      return;
    }

    // For install action
    // Create hooks directory if it doesn't exist
    await fs.mkdir(hooksPath, { recursive: true });

    // Write the hook script with the absolute package path
    const hookScript = getHookScript(packagePath);

    // Force remove existing hook if it exists
    try {
      await fs.unlink(hookPath);
    } catch {
      // Ignore error if file doesn't exist
    }

    // Write new hook
    await fs.writeFile(hookPath, hookScript, { mode: 0o755 });
    logger.debug("Hook script content:", hookScript);

    // Verify the hook was written correctly
    const writtenContent = await fs.readFile(hookPath, "utf-8");
    if (writtenContent !== hookScript) {
      throw new Error("Hook file content verification failed");
    }

    logger.success(`✅ Git hook installed at ${hookPath}`);
  } catch (error) {
    logger.error("Failed to install hook:", error);
    throw error;
  }
}
