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
import { deepMerge } from "./deep-merge.js";

const DEFAULT_COMPLEXITY_OPTIONS: ComplexityOptions = {
  thresholds: {
    largeFile: 100,
    veryLargeFile: 300,
    hugeFile: 500,
    multipleFiles: 5,
    manyFiles: 10,
  },
  scoring: {
    baseFileScore: 1,
    largeFileScore: 2,
    veryLargeFileScore: 3,
    hugeFileScore: 5,
    sourceFileScore: 1,
    testFileScore: 1,
    configFileScore: 0.5,
    apiFileScore: 2,
    migrationFileScore: 2,
    componentFileScore: 1,
    hookFileScore: 1,
    utilityFileScore: 0.5,
    criticalFileScore: 2,
  },
  patterns: {
    sourceFiles: ["/src/"],
    apiFiles: ["/api/", "/interfaces/"],
    migrationFiles: ["/migrations/"],
    componentFiles: ["/components/"],
    hookFiles: ["/hooks/"],
    utilityFiles: ["/utils/"],
    criticalFiles: ["package.json", "tsconfig.json", ".env"],
  },
  structureThresholds: {
    scoreThreshold: 5,
    reasonsThreshold: 1,
  },
};

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
          isTest: this.isTestFile(path),
          isConfig: this.isConfigFile(path),
        });
      }
    }

    return changes;
  }

  private parseCommitMessage(params: { message: string }): ParsedCommit {
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

  private isTestFile(path: string): boolean {
    return /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(path);
  }

  private isConfigFile(path: string): boolean {
    return (
      /\.(json|ya?ml|config\.(js|ts))$/.test(path) ||
      path.includes("tsconfig") ||
      path.includes(".eslintrc") ||
      path.includes(".prettierrc")
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
    const filesByType = this.groupFilesByType(files);
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
      reasons,
      needsStructure:
        score > config.structureThresholds.scoreThreshold ||
        reasons.length > config.structureThresholds.reasonsThreshold ||
        hasCriticalChanges,
    };
  }

  groupFilesByType(files: FileChange[]): FilesByType {
    return files.reduce((groups, file) => {
      const type = this.getFileType(file);
      if (!groups[type]) groups[type] = [];
      groups[type].push(file.path);
      return groups;
    }, {} as FilesByType);
  }

  private getFileType(file: FileChange): string {
    if (file.isTest) return "Tests";
    if (file.path.includes("/src/")) return "Source";
    if (file.path.endsWith(".md")) return "Documentation";
    if (file.isConfig) return "Configuration";
    return "Other";
  }
}
