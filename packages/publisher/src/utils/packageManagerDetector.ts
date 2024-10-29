import fs from "fs/promises";
import path from "path";
import { PackageManager } from "../types/config";

export class PackageManagerDetector {
  constructor(private rootDir: string) {}

  async detectPackageManager(): Promise<PackageManager> {
    let currentDir = this.rootDir;

    // Traverse up until we find a lock file or reach the root
    while (currentDir !== path.parse(currentDir).root) {
      const yarnLockPath = path.join(currentDir, "yarn.lock");
      const packageLockPath = path.join(currentDir, "package-lock.json");

      try {
        await fs.access(yarnLockPath);
        return "yarn";
      } catch {
        // Continue checking other lock files
      }

      try {
        await fs.access(packageLockPath);
        return "npm";
      } catch {
        // Continue checking other lock files
      }

      // Move up one directory
      currentDir = path.dirname(currentDir);
    }

    // Default to yarn if no lock file is found
    return "yarn";
  }
}
