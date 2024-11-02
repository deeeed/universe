import { promises as fs } from "fs";
import { join, resolve } from "path";
import { LoggerService } from "../services/logger.service.js";
import { execSync } from "child_process";

interface HookCommandOptions {
  action: "install" | "uninstall";
  global?: boolean;
  debug?: boolean;
  skipHook?: boolean;
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
// Skip hook if SKIP_GITGUARD is set
if (process.env.SKIP_GITGUARD === 'true') {
  process.exit(0);
}

const DEBUG = process.env.GITGUARD_DEBUG === 'true';
const path = require('path');
const { spawn } = require('child_process');

function debug(...args) {
  if (DEBUG) console.log(...args);
}

// Force TTY allocation
const tty = require('tty');
if (!process.stdin.isTTY) {
  const fd = require('fs').openSync('/dev/tty', 'r+');
  process.stdin = new tty.ReadStream(fd);
  process.stdout = new tty.WriteStream(fd);
  process.stderr = new tty.WriteStream(fd);
}

try {
  const prepareCommitPath = path.resolve('${packagePath}', 'dist/cjs/hooks/prepare-commit.cjs');
  const { prepareCommit } = require(prepareCommitPath);
  const messageFile = process.argv[2];
  
  if (!messageFile) {
    console.error('No commit message file provided');
    process.exit(1);
  }

  prepareCommit({ 
    messageFile,
    forceTTY: true
  })
    .catch((error) => {
      console.error('Hook failed:', error);
      process.exit(1);
    });
} catch (error) {
  console.error('Failed to run hook:', error);
  process.exit(1);
}
`;
}

export async function hook(options: HookCommandOptions): Promise<void> {
  const logger = new LoggerService({ debug: options.debug });

  try {
    const packagePath = resolve(__dirname, "../../..");
    const hooksPath = options.global
      ? getGlobalHooksPath()
      : getLocalHooksPath();
    const hookPath = join(hooksPath, "prepare-commit-msg");

    if (options.action === "uninstall") {
      try {
        await fs.unlink(hookPath);
        logger.success(`✅ Git hook uninstalled from ${hookPath}`);
      } catch {
        logger.warn(`No hook found at ${hookPath}`);
      }
      return;
    }

    // For install action
    await fs.mkdir(hooksPath, { recursive: true });
    const hookScript = getHookScript(packagePath);

    // Force remove existing hook if it exists
    try {
      await fs.unlink(hookPath);
    } catch {
      // Ignore error if file doesn't exist
    }

    await fs.writeFile(hookPath, hookScript, { mode: 0o755 });

    // Simple verification
    const writtenContent = await fs.readFile(hookPath, "utf-8");
    if (writtenContent !== hookScript) {
      throw new Error("Hook file content verification failed");
    }

    logger.success(`✅ Git hook installed at ${hookPath}`);
    if (options.skipHook) {
      logger.info("To skip the hook, set SKIP_GITGUARD=true:");
      logger.info("SKIP_GITGUARD=true git commit -m 'your message'");
    }
  } catch (error) {
    logger.error("Failed to install hook:", error);
    throw error;
  }
}
