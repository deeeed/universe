import {
  CommitComplexity,
  ComplexityOptions,
  FilesByType,
} from "../types/analysis.types.js";
import {
  CommitInfo,
  CommitType,
  FileChange,
  ParsedCommit,
} from "../types/git.types.js";
import {
  DEFAULT_COMPLEXITY_OPTIONS,
  DEFAULT_FILE_PATTERNS,
  FILE_PATTERNS,
} from "./config.util.js";
import { deepMerge } from "./deep-merge.js";

export class CommitParser {
  parseCommitLog(params: { log: string }): Omit<CommitInfo, "files">[] {
    const commits: Omit<CommitInfo, "files">[] = [];
    const entries = params.log.split("--END--").filter((entry) => entry.trim());

    for (const entry of entries) {
      const [hash, author, dateStr, ...messageLines] = entry.trim().split("\n");
      const message = messageLines.join("\n").trim();

      if (hash && author && dateStr && message) {
        commits.push({
          hash,
          author,
          date: new Date(dateStr),
          message,
          parsed: this.parseCommitMessage({ message }),
        });
      }
    }

    return commits;
  }

  parseFileChanges(params: { numstat: string }): FileChange[] {
    const changes: FileChange[] = [];
    const lines = params.numstat
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    for (const line of lines) {
      const [additions, deletions, path] = line.trim().split(/\s+/);

      if (path) {
        changes.push({
          path,
          additions: parseInt(additions, 10) || 0,
          deletions: parseInt(deletions, 10) || 0,
          isTest: this.isTestFile({ path }),
          isConfig: this.isConfigFile({ path }),
        });
      }
    }

    return changes;
  }

  public parseCommitMessage(params: { message: string }): ParsedCommit {
    const pattern =
      /^(?<type>feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?: (?<description>.+)(?:\n\n(?<body>[\s\S]+))?$/;

    const match = pattern.exec(params.message);

    if (!match?.groups) {
      return {
        type: "chore",
        scope: null,
        description: params.message,
        body: null,
        breaking: false,
      };
    }

    const { type, scope, breaking, description, body } = match.groups;

    return {
      type: type as CommitType,
      scope: scope || null,
      description: description.trim(),
      body: body?.trim() || null,
      breaking: Boolean(breaking),
    };
  }

  private isTestFile(params: { path: string }): boolean {
    const { path } = params;
    return (
      FILE_PATTERNS.TEST.test(path) ||
      DEFAULT_FILE_PATTERNS.test.some((pattern) => path.includes(pattern))
    );
  }

  private isConfigFile(params: { path: string }): boolean {
    const { path } = params;
    return (
      FILE_PATTERNS.CONFIG.test(path) ||
      DEFAULT_FILE_PATTERNS.config.some((pattern) => path.includes(pattern)) ||
      DEFAULT_FILE_PATTERNS.critical.some((pattern) => path === pattern)
    );
  }

  analyzeCommitComplexity(params: {
    files: FileChange[];
    options?: Partial<ComplexityOptions>;
  }): CommitComplexity {
    const { files, options = {} } = params;
    const config = deepMerge<ComplexityOptions>(
      DEFAULT_COMPLEXITY_OPTIONS,
      options,
    );

    const score = files.reduce((total, file) => {
      let fileScore = config.scoring.baseFileScore;
      const totalChanges = file.additions + file.deletions;

      // File size complexity
      if (totalChanges > config.thresholds.hugeFile) {
        fileScore += config.scoring.hugeFileScore;
      } else if (totalChanges > config.thresholds.veryLargeFile) {
        fileScore += config.scoring.veryLargeFileScore;
      } else if (totalChanges > config.thresholds.largeFile) {
        fileScore += config.scoring.largeFileScore;
      }

      // File type complexity
      if (
        config.patterns.sourceFiles.some((pattern) =>
          file.path.includes(pattern),
        )
      ) {
        fileScore += config.scoring.sourceFileScore;
      }
      if (file.isTest) {
        fileScore += config.scoring.testFileScore;
      }
      if (file.isConfig) {
        fileScore += config.scoring.configFileScore;
      }

      // Special file patterns
      if (
        config.patterns.apiFiles.some((pattern) => file.path.includes(pattern))
      ) {
        fileScore += config.scoring.apiFileScore;
      }
      if (
        config.patterns.migrationFiles.some((pattern) =>
          file.path.includes(pattern),
        )
      ) {
        fileScore += config.scoring.migrationFileScore;
      }
      if (
        config.patterns.componentFiles.some((pattern) =>
          file.path.includes(pattern),
        )
      ) {
        fileScore += config.scoring.componentFileScore;
      }
      if (
        config.patterns.hookFiles.some((pattern) => file.path.includes(pattern))
      ) {
        fileScore += config.scoring.hookFileScore;
      }
      if (
        config.patterns.utilityFiles.some((pattern) =>
          file.path.includes(pattern),
        )
      ) {
        fileScore += config.scoring.utilityFileScore;
      }

      // Critical file changes
      if (
        config.patterns.criticalFiles.some((pattern) =>
          file.path.includes(pattern),
        )
      ) {
        fileScore += config.scoring.criticalFileScore;
      }

      return total + fileScore;
    }, 0);

    const reasons: string[] = [];
    const filesByType = this.groupFilesByType({ files });
    const scopes = new Set(files.map((f) => f.path.split("/")[1]));

    // File count complexity
    if (files.length > config.thresholds.manyFiles) {
      reasons.push("Large number of files changed");
    } else if (files.length > config.thresholds.multipleFiles) {
      reasons.push("Multiple files changed");
    }

    // Size complexity
    if (
      files.some((f) => f.additions + f.deletions > config.thresholds.largeFile)
    ) {
      reasons.push("Large file changes");
    }

    // Scope complexity
    if (scopes.size > 1) {
      reasons.push("Changes span multiple directories");
    }

    // Type complexity
    const fileTypes = Object.keys(filesByType);
    if (fileTypes.length > 2) {
      reasons.push(`Changes affect multiple areas (${fileTypes.join(", ")})`);
    }

    // Critical changes
    const hasCriticalChanges = files.some((f) =>
      config.patterns.criticalFiles.some((pattern) => f.path.includes(pattern)),
    );
    if (hasCriticalChanges) {
      reasons.push("Contains critical configuration changes");
    }

    return {
      score,
      reasons: [
        ...reasons,
        // Add reason when score exceeds threshold
        score > config.structureThresholds.scoreThreshold
          ? `Complexity score (${score}) exceeds threshold (${config.structureThresholds.scoreThreshold})`
          : "",
      ].filter(Boolean), // Remove empty strings
      needsStructure:
        score > config.structureThresholds.scoreThreshold ||
        reasons.length > config.structureThresholds.reasonsThreshold ||
        hasCriticalChanges,
    };
  }

  groupFilesByType(params: { files: FileChange[] }): FilesByType {
    const { files } = params;
    return files.reduce((groups, file) => {
      const type = this.getFileType({ file });
      if (!groups[type]) groups[type] = [];
      groups[type].push(file.path);
      return groups;
    }, {} as FilesByType);
  }

  private getFileType(params: { file: FileChange }): string {
    const patterns = DEFAULT_FILE_PATTERNS;
    const { file } = params;

    if (file.isTest) return "Tests";
    if (patterns.source.some((p) => file.path.includes(p))) return "Source";
    if (patterns.docs.some((p) => file.path.includes(p)))
      return "Documentation";
    if (file.isConfig) return "Configuration";
    return "Other";
  }
}
