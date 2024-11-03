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
  const DEBUG = process.env.GITGUARD_DEBUG === 'true';
  const path = require('path');
  const fs = require('fs');
  
  function debug(...args) {
    if (DEBUG) {
      console.log(...args);
    }
  }
  
  // Skip hook if SKIP_GITGUARD is set
  if (process.env.SKIP_GITGUARD === 'true') {
    debug('⏭️  Skipping GitGuard hook (SKIP_GITGUARD=true)');
    process.exit(0);
  }
  
  debug('🔍 GitGuard Hook Debug:');
  debug('- Package Path:', '${packagePath}');
  debug('- Process CWD:', process.cwd());
  
  try {
    debug('- Resolving prepare-commit path...');
    const prepareCommitPath = path.resolve('${packagePath}', 'dist/cjs/hooks/prepare-commit.cjs');
    
    debug('- Resolved Path:', prepareCommitPath);
    debug('- File exists:', fs.existsSync(prepareCommitPath));
    
    if (!fs.existsSync(prepareCommitPath)) {
      // Try alternative path without dist prefix
      const altPath = path.resolve('${packagePath}', 'cjs/hooks/prepare-commit.cjs');
      debug('- Trying alternative path:', altPath);
      debug('- Alternative path exists:', fs.existsSync(altPath));
      
      if (fs.existsSync(altPath)) {
        debug('- Using alternative path');
        require(altPath).prepareCommit({ 
          messageFile: process.argv[2],
          forceTTY: true,
          debug: DEBUG 
        }).catch(handleError);
        return;
      }
      
      throw new Error(\`prepare-commit.cjs not found at \${prepareCommitPath} or \${altPath}\`);
    }
    
    debug('- Requiring prepare-commit module...');
    const { prepareCommit } = require(prepareCommitPath);
    const messageFile = process.argv[2];
    
    if (!messageFile) {
      console.error('No commit message file provided');
      process.exit(1);
    }
    
    debug('- Executing prepareCommit with messageFile:', messageFile);
  
    prepareCommit({ 
      messageFile,
      forceTTY: true,
      debug: DEBUG 
    })
      .catch(handleError);
  } catch (error) {
    handleError(error);
  }
  
  function handleError(error) {
    if (DEBUG) {
      console.error('Failed to run hook with detailed error:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
    } else {
      console.error('Failed to run hook:', error);
    }
    process.exit(1);
  }`;
}
