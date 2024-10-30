import fs from "fs";
import path from "path";
import type { PackageManager } from "../types/config";

export function detectPackageManager(rootDir: string): PackageManager {
  let currentDir = path.resolve(rootDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    try {
      const yarnLockPath = path.join(currentDir, "yarn.lock");
      const packageLockPath = path.join(currentDir, "package-lock.json");

      // Check lock files synchronously
      if (fs.existsSync(yarnLockPath)) return "yarn";
      if (fs.existsSync(packageLockPath)) return "npm";

      // Move up one directory
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break; // Prevent infinite loop if we can't go up anymore
      }
      currentDir = parentDir;
    } catch (error) {
      console.error(`Error checking lock files in ${currentDir}:`, error);
      break;
    }
  }

  // Default to yarn if no lock file is found
  return "yarn";
}
