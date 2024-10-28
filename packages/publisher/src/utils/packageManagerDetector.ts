import fs from "fs/promises";
import path from "path";

export class PackageManagerDetector {
  constructor(private rootDir: string) {}

  async detectPackageManager(): Promise<string> {
    const yarnLockPath = path.join(this.rootDir, "yarn.lock");
    const packageLockPath = path.join(this.rootDir, "package-lock.json");
    const pnpmLockPath = path.join(this.rootDir, "pnpm-lock.yaml");

    try {
      await fs.access(yarnLockPath);
      return "yarn";
    } catch {}

    try {
      await fs.access(packageLockPath);
      return "npm";
    } catch {}

    try {
      await fs.access(pnpmLockPath);
      return "pnpm";
    } catch {}

    // Default to npm if no lock file is found
    return "npm";
  }
} 
