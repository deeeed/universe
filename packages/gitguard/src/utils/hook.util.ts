import { execSync } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";
import { getGitDir, isGitRepository } from "./git.util.js";

export interface HookStatus {
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

export function getGlobalHooksPath(): string {
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

export function getLocalHooksPath(): string {
  const gitDir = getGitDir();
  return join(gitDir, "hooks");
}

export async function checkHookInstallation(
  hookPath: string,
): Promise<boolean> {
  try {
    const stats = await fs.stat(hookPath);
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function getHookStatus(): Promise<HookStatus> {
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

export function getHookScript(packagePath: string): string {
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
  
    prepareCommit({ 
      messageFile,
      forceTTY: true,
      debug: DEBUG 
    })
      .catch((error) => {
        console.error('Hook failed:', error);
        process.exit(1);
      });
  } catch (error) {
    console.error('Failed to run hook:', error);
    process.exit(1);
  }`;
}
