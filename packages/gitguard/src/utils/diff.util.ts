import path from "path";
import {
  DEFAULT_MAX_PROMPT_TOKENS,
  TOKEN_TO_CHAR_RATIO,
} from "../constants.js";
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

function calculateComplexity(params: {
  content: string;
  file: FileChange;
  options: DiffOptions;
  logger?: Logger;
}): number {
  const { content, file, logger } = params;

  // Basic complexity indicators
  const lineCount = content.split("\n").length;
  const logicComplexity = (content.match(/if|else|switch|for|while/g) || [])
    .length;
  const functionCount = (content.match(/function|=>/g) || []).length;

  const complexity =
    file.additions * 1.2 + // New code has higher weight
    file.deletions * 0.8 + // Deletions are important but less than additions
    logicComplexity * 2 + // Control flow changes are significant
    functionCount * 1.5 + // Function changes are important
    lineCount * 0.1; // Small factor for overall size

  logger?.debug("Calculated complexity:", {
    file: file.path,
    metrics: {
      lineCount,
      logicComplexity,
      functionCount,
      additions: file.additions,
      deletions: file.deletions,
    },
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

export function formatDiffForAI(params: DiffParams): string {
  const {
    files,
    diff,
    maxLength = DEFAULT_MAX_PROMPT_TOKENS,
    logger,
    options = {
      includeTests: false,
      prioritizeCore: true,
      contextLines: 3,
    },
  } = params;

  const fullOptions: DiffOptions = {
    includeTests: false,
    prioritizeCore: true,
    contextLines: 3,
    ...options,
  };

  if (!diff || diff.length === 0) return "";
  if (diff.length <= maxLength) return diff;

  // Split into file sections
  const sections = diff.split("diff --git").filter(Boolean);
  const fileSignificances: FileSignificance[] = [];

  // Calculate significance scores for each file
  for (const file of files) {
    const section = sections.find((section) =>
      section.includes(file.path.replace(/^\/+/, "")),
    );

    if (!section) continue;

    const complexity = calculateComplexity({
      content: section,
      file,
      options: fullOptions,
      logger,
    });

    fileSignificances.push({
      path: file.path,
      diff: `diff --git${section}`,
      score: calculateFileScore({
        file,
        complexity,
        options: fullOptions,
        logger,
      }),
      metadata: {
        additions: file.additions,
        deletions: file.deletions,
        isTest: file.isTest,
        isConfig: file.isConfig,
        complexity,
      },
    });
  }

  const groupedFiles = groupRelatedFiles({ files: fileSignificances, logger });
  const result = buildOptimizedDiff({
    groups: groupedFiles,
    maxLength,
    logger,
  });

  return result.diff;
}
