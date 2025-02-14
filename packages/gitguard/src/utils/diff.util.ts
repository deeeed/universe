import path from "path";
import {
  BINARY_FILE_PATTERNS,
  DEFAULT_MAX_PROMPT_TOKENS,
  TOKEN_TO_CHAR_RATIO,
} from "../constants.js";
import { GitConfig } from "../types/config.types.js";
import { FileChange } from "../types/git.types.js";
import { Logger } from "../types/logger.types.js";

interface FileSignificance {
  path: string;
  diff: string;
  score: number;
  metadata: {
    additions: number;
    deletions: number;
    isTest: boolean;
    isConfig: boolean;
    complexity: number;
  };
}

export interface DiffOptions {
  includeTests: boolean;
  prioritizeCore: boolean;
  contextLines: number;
}

export interface DiffParams {
  files: FileChange[];
  diff: string;
  maxLength?: number;
  logger?: Logger;
  options?: Partial<DiffOptions>;
}

interface OptimizedDiffResult {
  diff: string;
  includedFiles: number;
  groupsCovered: number;
  tokenEstimate: number;
  content?: string;
}

export function isBinaryFile(filePath: string): boolean {
  return BINARY_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function calculateComplexity(params: {
  content: string;
  file: FileChange;
  options: DiffOptions;
  logger?: Logger;
}): number {
  const { content, file, logger } = params;

  // Enhanced complexity calculation
  const lines = content.split("\n");
  const logicComplexity =
    (content.match(/if|else|switch|for|while/g) ?? []).length * 3;
  const functionCount = (content.match(/function|=>/g) ?? []).length * 2;
  const classCount = (content.match(/class\s+\w+/g) ?? []).length * 4;

  // Calculate nesting depth
  let maxNestingDepth = 0;
  let currentDepth = 0;
  for (const line of lines) {
    if (line.includes("{")) currentDepth++;
    if (line.includes("}")) currentDepth--;
    maxNestingDepth = Math.max(maxNestingDepth, currentDepth);
  }

  const complexity =
    file.additions * 1.5 +
    file.deletions * 1.0 +
    logicComplexity * 2.5 +
    functionCount * 2.0 +
    classCount * 3.0 +
    maxNestingDepth * 2.0 +
    lines.length * 0.1;

  logger?.debug("Calculated complexity:", {
    file: file.path,
    metrics: { logicComplexity, functionCount, classCount, maxNestingDepth },
    finalScore: complexity,
  });

  return complexity;
}

function calculateFileScore(params: {
  file: FileChange;
  complexity: number;
  options: DiffOptions;
  logger?: Logger;
}): number {
  const { file, complexity, options, logger } = params;

  let score = complexity;
  const adjustments: Array<{ reason: string; factor: number }> = [];

  // Adjust score based on file type
  if (file.isTest && !options.includeTests) {
    score *= 0.3;
    adjustments.push({ reason: "test file", factor: 0.3 });
  }
  if (file.isConfig) {
    score *= 0.5;
    adjustments.push({ reason: "config file", factor: 0.5 });
  }

  // Boost score for core files
  if (options.prioritizeCore) {
    const isCore =
      !file.path.includes("utils") &&
      !file.path.includes("tests") &&
      !file.path.includes("config");
    if (isCore) {
      score *= 1.5;
      adjustments.push({ reason: "core file", factor: 1.5 });
    }
  }

  // Consider path depth
  const depth = file.path.split("/").length;
  const depthFactor = 1 + depth * 0.1;
  score *= depthFactor;
  adjustments.push({ reason: "path depth", factor: depthFactor });

  logger?.debug("Calculated file score:", {
    file: file.path,
    baseComplexity: complexity,
    adjustments,
    finalScore: score,
  });

  return score;
}

function groupRelatedFiles(params: {
  files: FileSignificance[];
  logger?: Logger;
}): FileSignificance[][] {
  const { files, logger } = params;
  const groups: FileSignificance[][] = [];
  const processed = new Set<string>();

  for (const file of files) {
    if (processed.has(file.path)) continue;

    const group = [file];
    processed.add(file.path);

    // Find related files based on path and naming patterns
    const baseName = path.basename(file.path, path.extname(file.path));
    const dirName = path.dirname(file.path);

    const relatedFiles = files.filter((f) => {
      if (processed.has(f.path)) return false;

      const isSameDir = path.dirname(f.path) === dirName;
      const isRelatedName = path
        .basename(f.path, path.extname(f.path))
        .includes(baseName);

      return isSameDir || isRelatedName;
    });

    group.push(...relatedFiles);
    relatedFiles.forEach((f) => processed.add(f.path));
    groups.push(group);
  }

  logger?.debug("Grouped related files:", {
    totalFiles: files.length,
    groupCount: groups.length,
    groups: groups.map((group) => ({
      mainFile: group[0].path,
      relatedFiles: group.slice(1).map((f) => f.path),
    })),
  });

  return groups;
}

interface SortedGroup {
  files: FileSignificance[];
  score: number;
}

function buildOptimizedDiff(params: {
  groups: FileSignificance[][];
  maxLength: number;
  logger?: Logger;
}): OptimizedDiffResult {
  const { groups, maxLength, logger } = params;
  let diffContent = "";
  let currentLength = 0;
  let includedFiles = 0;
  let groupsCovered = 0;

  // Sort groups by highest scoring file
  const sortedGroups: SortedGroup[] = groups.map((group) => ({
    files: group,
    score: Math.max(...group.map((f) => f.score)),
  }));

  // Sort in descending order by score
  sortedGroups.sort((a, b) => b.score - a.score);

  logger?.debug("Sorted groups by score:", {
    groups: sortedGroups.map((group) => ({
      score: group.score,
      files: group.files.map((f) => f.path),
    })),
  });

  // Try to include at least one file from each high-scoring group
  for (const group of sortedGroups) {
    // Sort files within group by score
    const sortedFiles = [...group.files].sort((a, b) => b.score - a.score);

    // Try to include at least the highest scoring file from each group
    const highestScoringFile = sortedFiles[0];
    if (currentLength + highestScoringFile.diff.length <= maxLength) {
      diffContent += (diffContent ? "\n" : "") + highestScoringFile.diff;
      currentLength += highestScoringFile.diff.length;
      includedFiles++;
      groupsCovered++;

      // Then try to add more files from the same group if space allows
      for (let i = 1; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];
        if (currentLength + file.diff.length <= maxLength) {
          diffContent += "\n" + file.diff;
          currentLength += file.diff.length;
          includedFiles++;
        } else {
          break;
        }
      }

      logger?.debug("Added group to result:", {
        files: group.files.map((f) => f.path),
        currentLength,
        remainingSpace: maxLength - currentLength,
      });
    } else {
      logger?.debug("Skipping group due to length limit:", {
        files: group.files.map((f) => f.path),
        groupLength: highestScoringFile.diff.length,
        remainingSpace: maxLength - currentLength,
      });
      break;
    }
  }

  // Rough token estimate (average 4 chars per token)
  const tokenEstimate = Math.ceil(currentLength / TOKEN_TO_CHAR_RATIO);

  const finalDiff =
    diffContent +
    (groupsCovered < groups.length
      ? `\n\n... (truncated ${groups.length - groupsCovered} less significant file groups)`
      : "");

  logger?.debug("Final diff result:", {
    totalGroups: groups.length,
    includedGroups: groupsCovered,
    totalFiles: groups.reduce((sum, group) => sum + group.length, 0),
    includedFiles,
    diffLength: finalDiff.length,
    tokenEstimate,
    contentLength: diffContent.length,
  });

  return {
    diff: finalDiff,
    includedFiles,
    groupsCovered,
    tokenEstimate,
    content: diffContent,
  };
}

export function formatDiffForAI({
  files,
  diff,
  maxLength,
  logger,
  options,
  gitConfig,
}: {
  files: FileChange[];
  diff: string;
  maxLength?: number;
  logger?: Logger;
  options?: {
    includeTests?: boolean;
    prioritizeCore?: boolean;
    contextLines?: number;
  };
  gitConfig?: GitConfig;
}): string {
  const {
    includeTests = false,
    prioritizeCore = true,
    contextLines = 3,
  } = options ?? {};

  const fullOptions: DiffOptions = {
    includeTests,
    prioritizeCore,
    contextLines,
  };

  if (!diff || diff.length === 0) return "";

  // Split into sections but don't filter yet
  const sections = diff.split(/(?=diff --git)/).filter(Boolean);
  const fileSignificances: FileSignificance[] = [];

  // Process each file
  for (const file of files) {
    // Check if file should be ignored based on config patterns
    const isIgnored = gitConfig?.ignorePatterns?.some((pattern) => {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".");
      return new RegExp(regexPattern).test(file.path);
    });

    if (isIgnored) {
      logger?.debug(`Skipping ignored file: ${file.path}`);
      continue;
    }

    // Find matching section using normalized paths
    const fileSection = sections.find((section) => {
      const match = /diff --git [a-z]\/(.+?) [a-z]\//.exec(section);
      if (!match) return false;

      // Extract paths and normalize them
      const diffPath = match[1].split("/").filter(Boolean).join("/");
      const filePath = file.path.split("/").filter(Boolean).join("/");

      const isMatch = diffPath.endsWith(filePath);

      logger?.debug(`Comparing paths:`, {
        diffPath,
        filePath,
        isMatch,
        isBinary: isBinaryFile(file.path),
        hasBinaryMarker:
          section.includes("Binary files") ||
          section.includes("GIT binary patch"),
      });

      return (
        isMatch &&
        !isBinaryFile(file.path) &&
        !section.includes("Binary files") &&
        !section.includes("GIT binary patch")
      );
    });

    if (!fileSection) {
      logger?.debug(`No matching section for file: ${file.path}`);
      continue;
    }

    const complexity = calculateComplexity({
      content: fileSection,
      file,
      options: fullOptions,
      logger,
    });

    const score = calculateFileScore({
      file,
      complexity,
      options: fullOptions,
      logger,
    });

    fileSignificances.push({
      path: file.path,
      diff: fileSection,
      score,
      metadata: {
        additions: file.additions,
        deletions: file.deletions,
        isTest: file.isTest,
        isConfig: file.isConfig,
        complexity,
      },
    });
  }

  // Return early with sorted sections if we have valid diffs
  if (fileSignificances.length === 0) {
    logger?.debug("No valid file significances found");
    return "";
  }

  // Add debug logging for skipped files
  if (logger) {
    const totalFiles = files.length;
    const includedFiles = fileSignificances.length;
    const skippedFiles = files.filter((f) => isBinaryFile(f.path));

    logger.debug("File processing summary:", {
      totalFiles,
      includedFiles,
      skippedBinaryFiles: skippedFiles.length,
      skippedFiles: skippedFiles.map((f) => f.path),
    });
  }

  const groupedFiles = groupRelatedFiles({ files: fileSignificances, logger });
  const result = buildOptimizedDiff({
    groups: groupedFiles,
    maxLength:
      (maxLength ??
        Math.ceil(DEFAULT_MAX_PROMPT_TOKENS * TOKEN_TO_CHAR_RATIO)) * 0.95, // Leave room for truncation message
    logger,
  });

  return result.diff;
}
