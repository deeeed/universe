import { minimatch } from "minimatch";
import { Logger } from "../types/logger.types.js";

export function shouldIgnoreFile(params: {
  path: string;
  patterns: string[];
  logger: Logger;
}): boolean {
  const { path, patterns, logger } = params;

  if (!patterns.length) return false;

  logger.debug(`Checking if should ignore path: ${path}`, { patterns });

  return patterns.some((pattern) => {
    try {
      const matches = minimatch(path, pattern, {
        matchBase: !pattern.includes("/"),
        dot: true,
      });

      logger.debug(`Checking pattern match:`, {
        path,
        pattern,
        matches,
      });

      return matches;
    } catch (error) {
      logger.warn(`Invalid ignore pattern: ${pattern}`, error);
      return false;
    }
  });
}
