import { execSync } from "child_process";

/**
 * Git-specific utility functions for repository operations
 */
export function isGitRepository(): boolean {
  try {
    execSync("git rev-parse --git-dir", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function getGitRoot(): string {
  try {
    return execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
    }).trim();
  } catch {
    throw new Error("Not a git repository");
  }
}

export function getGitDir(): string {
  try {
    return execSync("git rev-parse --git-dir", {
      encoding: "utf-8",
    }).trim();
  } catch {
    throw new Error("Not a git repository");
  }
}
