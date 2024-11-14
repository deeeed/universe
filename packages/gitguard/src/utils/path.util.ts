import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function resolvePackagePath(relativePath: string): string {
  // For test environments, always use process.cwd()
  const isTest = process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID;
  if (isTest) {
    return join(process.cwd(), relativePath);
  }

  // For ESM environments (e2e tests and production)
  const currentFileUrl = import.meta.url;
  const currentFilePath = fileURLToPath(currentFileUrl);
  const currentDir = dirname(currentFilePath);

  // Go up two directories from utils/ to reach the package root
  return join(dirname(currentDir), relativePath);
}
