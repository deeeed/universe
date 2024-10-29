import fs from "fs";
import path from "node:path";
import type { PackageJson } from "type-fest";

export function findMonorepoRootSync(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== path.parse(currentDir).root) {
    const pkgJsonPath = path.join(currentDir, "package.json");
    try {
      if (fs.existsSync(pkgJsonPath)) {
        const content = fs.readFileSync(pkgJsonPath, "utf-8");
        const pkgJson = JSON.parse(content) as PackageJson;
        if (pkgJson.workspaces) {
          return currentDir;
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug(`Error accessing ${pkgJsonPath}:`, error);
    }
    currentDir = path.dirname(currentDir);
  }
  return startDir; // fallback to start directory if no root found
}
