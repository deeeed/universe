import { execSync } from "child_process";

interface GitOptions {
  cwd?: string;
}

/**
 * Git-specific utility functions for repository operations
 */
export function isGitRepository(options?: GitOptions): boolean {
  try {
    execSync("git rev-parse --git-dir", {
      stdio: "ignore",
      cwd: options?.cwd,
    });
    return true;
  } catch {
    return false;
  }
}

export function getGitRoot(options?: GitOptions): string {
  try {
    return execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      cwd: options?.cwd,
    }).trim();
  } catch {
    throw new Error("Not a git repository");
  }
}

export function getGitDir(options?: GitOptions): string {
  try {
    return execSync("git rev-parse --git-dir", {
      encoding: "utf-8",
      cwd: options?.cwd,
    }).trim();
  } catch {
    throw new Error("Not a git repository");
  }
}

/**
 * Determines the default branch for a repository
 * Checks in order: current branch if main/master, existing main/master branch, falls back to 'main'
 */
export function determineDefaultBranch(options?: GitOptions): string {
  try {
    // Check if we're in a git repo first
    if (!isGitRepository({ cwd: options?.cwd })) {
      return "main";
    }

    // Try to get current branch
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
      cwd: options?.cwd,
    }).trim();

    if (["main", "master"].includes(currentBranch)) {
      return currentBranch;
    }

    // List all branches
    const branches = execSync("git branch --list", {
      encoding: "utf-8",
      cwd: options?.cwd,
    })
      .split("\n")
      .map((b) => b.trim().replace("*", "").trim());

    // Check for main or master
    if (branches.includes("main")) return "main";
    if (branches.includes("master")) return "master";

    return "main";
  } catch {
    return "main";
  }
}
