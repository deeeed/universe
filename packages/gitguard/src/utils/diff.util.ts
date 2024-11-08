import { FileChange } from "../types/git.types.js";
import { Logger } from "../types/logger.types.js";

export interface DiffParams {
  files: FileChange[];
  diff: string;
  maxLength?: number;
  logger?: Logger;
}

/**
 * Prioritizes and formats diffs for AI analysis by selecting the most significant changes
 * Uses file additions/deletions to determine importance
 */
export function formatDiffForAI(params: DiffParams): string {
  const { files, diff, maxLength = 8000, logger } = params;

  if (!diff || diff.length === 0) return "";
  if (diff.length <= maxLength) return diff;

  const diffs: Array<{ path: string; diff: string; significance: number }> = [];

  // Split by file sections
  const sections = diff.split("diff --git").filter(Boolean);

  logger?.debug("Processing diff sections:", {
    totalSections: sections.length,
    totalLength: diff.length,
    targetLength: maxLength,
  });

  // Match sections to files and calculate significance
  for (const file of files) {
    const section = sections.find((section) => {
      const normalizedPath = file.path.replace(/^\/+/, "");
      return section.includes(normalizedPath);
    });

    if (section) {
      diffs.push({
        path: file.path,
        diff: `diff --git${section}`,
        significance: file.additions + file.deletions,
      });
    }
  }

  // Sort by significance and combine within limit
  diffs.sort((a, b) => b.significance - a.significance);

  let result = "";
  let currentLength = 0;
  let includedFiles = 0;

  for (const { diff: fileDiff } of diffs) {
    if (currentLength + fileDiff.length <= maxLength) {
      result += fileDiff;
      currentLength += fileDiff.length;
      includedFiles++;
    } else {
      break;
    }
  }

  logger?.debug("Formatted diff result:", {
    originalFiles: files.length,
    includedFiles,
    resultLength: result.length,
  });

  return (
    result +
    (includedFiles < diffs.length
      ? `\n\n... (truncated ${diffs.length - includedFiles} less significant files)`
      : "")
  );
}
