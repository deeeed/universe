import { Config } from "../types/config.types.js";
import { FileChange } from "../types/git.types.js";
import { Logger } from "../types/logger.types.js";
import {
  PROBLEMATIC_FILE_PATTERNS,
  ProblematicFilePattern,
  SECRET_PATTERNS,
  SecurityCheckResult,
  SecurityFinding,
  SecurityPattern,
} from "../types/security.types.js";
import { BaseService } from "./base.service.js";

export class SecurityService extends BaseService {
  constructor(params: { logger: Logger; config: Config }) {
    super(params);
  }

  analyzeSecurity(params: {
    files: FileChange[];
    diff?: string;
  }): SecurityCheckResult {
    this.logger.debug("Running security analysis...");

    const secretFindings = params.diff
      ? this.detectSecrets({ diff: params.diff })
      : [];

    this.logger.debug(`Found ${secretFindings.length} secret findings`);

    const fileFindings = this.detectProblematicFiles({
      files: params.files,
    });

    this.logger.debug(`Found ${fileFindings.length} problematic files`);

    const filesToUnstage = [...secretFindings, ...fileFindings].map(
      (f) => f.path,
    );

    return {
      secretFindings,
      fileFindings,
      filesToUnstage,
      shouldBlock: [...secretFindings, ...fileFindings].some(
        (f) => f.severity === "high",
      ),
      commands: this.generateCommands({
        findings: [...secretFindings, ...fileFindings],
      }),
    };
  }

  private detectSecrets(params: { diff: string }): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const lines = params.diff.split("\n");
    const foundSecrets = new Set<string>();
    let currentFile: string | undefined;

    // First pass: find all file paths
    const filePathMap = new Map<number, string>();
    lines.forEach((_, index) => {
      const filePath = this.extractFilePath(params.diff, index);
      if (filePath) {
        filePathMap.set(index, filePath);
        currentFile = filePath;
      }
    });

    // Second pass: detect secrets with correct file paths
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Update current file if we have a mapping
      if (filePathMap.has(i)) {
        currentFile = filePathMap.get(i);
      }

      if (!line.startsWith("+")) continue;

      for (const pattern of SECRET_PATTERNS) {
        const match = line.match(pattern.pattern);
        if (match) {
          const secretKey = `${currentFile || "unknown"}-${match[0]}`;
          if (foundSecrets.has(secretKey)) continue;

          foundSecrets.add(secretKey);
          findings.push({
            type: "secret",
            severity: pattern.severity,
            path: currentFile || ".env", // Default to .env if unknown
            line: i + 1,
            content: this.maskSecret(line.substring(1)),
            match: pattern.name,
            suggestion: `Detected ${pattern.name}. Consider using environment variables or a secret manager.`,
          });
        }
      }
    }

    return findings;
  }

  private maskSecret(line: string): string {
    return line.replace(
      /[a-zA-Z0-9+/=]{8,}/g,
      (match) =>
        `${match.slice(0, 4)}${"*".repeat(match.length - 8)}${match.slice(-4)}`,
    );
  }

  private extractFilePath(diff: string, lineIndex: number): string | undefined {
    const lines = diff
      .split("\n")
      .slice(0, lineIndex + 1)
      .reverse();

    // Try different git diff formats
    const patterns = [
      /^\+\+\+ b\/(.+)$/,
      /^diff --git a\/(.+) b\/.+$/,
      /^diff --git a\/(.+) b\/\1$/,
    ];

    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
    }

    return undefined;
  }

  private detectProblematicFiles(params: {
    files: FileChange[];
    patterns?: ProblematicFilePattern[];
  }): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const patterns = params.patterns || PROBLEMATIC_FILE_PATTERNS;
    const foundFiles = new Set<string>();

    for (const file of params.files) {
      if (foundFiles.has(file.path)) continue;

      for (const category of patterns) {
        if (category.patterns.some((pattern) => pattern.test(file.path))) {
          foundFiles.add(file.path);
          findings.push({
            type: "sensitive_file",
            severity: category.severity,
            path: file.path,
            suggestion: this.getSuggestionForFile({
              path: file.path,
              category: category.category,
            }),
          });
          break;
        }
      }
    }

    return findings;
  }

  public checkLine(params: {
    line: string;
    pattern: SecurityPattern;
    lineNumber: number;
    currentFile: string;
  }): SecurityFinding | null {
    if (!params.line.startsWith("+")) {
      return null;
    }

    const match = params.line.substring(1).match(params.pattern.pattern);
    if (!match) return null;

    return {
      type: "secret",
      severity: params.pattern.severity,
      path: params.currentFile,
      line: params.lineNumber + 1,
      match: "*".repeat(match[0].length),
      content: params.line
        .substring(1)
        .replace(match[0], "*".repeat(match[0].length)),
      suggestion: `Remove ${params.pattern.name} and use environment variables`,
    };
  }

  private getSuggestionForFile(params: {
    path: string;
    category: string;
  }): string {
    switch (params.category) {
      case "Environment Files":
        return "Add to .gitignore and use .env.example instead";
      case "Key Files":
        return "Remove sensitive keys and use a secret manager instead";
      default:
        return "Consider if this file should be in version control";
    }
  }

  generateCommands(params: { findings: SecurityFinding[] }): string[] {
    // Filter out findings with "unknown" paths and get unique paths
    const filesToUnstage = [
      ...new Set(
        params.findings
          .filter((f) => f.path && f.path !== "unknown")
          .map((f) => f.path),
      ),
    ];

    if (filesToUnstage.length === 0) {
      return [];
    }

    return [`git reset HEAD ${filesToUnstage.map((f) => `"${f}"`).join(" ")}`];
  }
}