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
import { shouldIgnoreFile } from "../utils/ignore-pattern.util.js";
import { BaseService } from "./base.service.js";

export class SecurityService extends BaseService {
  private readonly config: Config;

  constructor(params: { logger: Logger; config: Config }) {
    super(params);
    this.config = params.config;
  }

  analyzeSecurity(params: {
    files: FileChange[];
    diff?: string;
  }): SecurityCheckResult {
    this.logger.debug("Running security analysis...");

    const filesToCheck = this.config.git.ignorePatterns?.length
      ? params.files.filter(
          (file) =>
            !shouldIgnoreFile({
              path: file.path,
              patterns: this.config.git.ignorePatterns ?? [],
              logger: this.logger,
            }),
        )
      : params.files;

    if (filesToCheck.length === 0) {
      this.logger.debug("No files to check after applying ignore patterns");
      return {
        secretFindings: [],
        fileFindings: [],
        filesToUnstage: [],
        shouldBlock: false,
        commands: [],
      };
    }

    const secretFindings =
      params.diff && this.config.security.rules.secrets.enabled
        ? this.detectSecrets({
            diff: params.diff,
            files: filesToCheck,
          })
        : [];

    this.logger.debug(`Found ${secretFindings.length} secret findings`);

    const fileFindings = this.config.security.rules.files.enabled
      ? this.detectProblematicFiles({
          files: filesToCheck,
          patterns: PROBLEMATIC_FILE_PATTERNS,
        })
      : [];

    this.logger.debug(`Found ${fileFindings.length} problematic files`);

    const filesToUnstage = [
      ...new Set([
        ...secretFindings.map((f) => f.path),
        ...fileFindings.map((f) => f.path),
      ]),
    ];

    return {
      secretFindings,
      fileFindings,
      filesToUnstage,
      shouldBlock:
        secretFindings.some((f) => f.severity === "high") ||
        fileFindings.some((f) => f.severity === "high"),
      commands: this.generateCommands({
        findings: [...secretFindings, ...fileFindings],
      }),
    };
  }

  private detectSecrets(params: {
    diff: string;
    files: FileChange[];
  }): SecurityFinding[] {
    this.logger.debug("Analyzing diff content for secrets", {
      filesCount: params.files.length,
      diffLength: params.diff.length,
    });

    const customPatterns =
      this.config.security.rules.secrets.patterns?.map((pattern) => ({
        name: "Custom Pattern",
        pattern: new RegExp(pattern, "i"),
        severity: this.config.security.rules.secrets.severity ?? "high",
      })) ?? [];

    const allPatterns = [...SECRET_PATTERNS, ...customPatterns];

    const validPaths = new Set(params.files.map((f) => f.path));
    const filteredDiff = this.filterDiffForFiles(
      params.diff,
      Array.from(validPaths),
    );
    const lines = filteredDiff.split("\n");
    const filePathMap = this.buildFilePathMap(lines, filteredDiff);

    return this.analyzeLines({
      lines,
      filePathMap,
      foundSecrets: new Set<string>(),
      validPaths,
      patterns: allPatterns,
    });
  }

  private filterDiffForFiles(diff: string, validPaths: string[]): string {
    this.logger.debug(`Original diff content:\n${diff}`);
    this.logger.debug(`Valid paths: ${validPaths.join(", ")}`);

    const lines = diff.split("\n");
    const filteredLines: string[] = [];
    let isValidFile = false;
    let currentFile: string | undefined;

    for (const line of lines) {
      if (line.startsWith("diff --git")) {
        const diffPattern = /diff --git [a-z]\/?(.*?) [a-z]\/?(.*?)$/;
        const match = diffPattern.exec(line);
        if (match) {
          currentFile = match[2];
          isValidFile = validPaths.includes(currentFile);
          this.logger.debug(
            `Found file in diff: ${currentFile} (valid: ${isValidFile})`,
          );
        }
      }

      if (
        isValidFile ||
        line.startsWith("diff --git") ||
        line.startsWith("+++") ||
        line.startsWith("---") ||
        line.startsWith("@@")
      ) {
        filteredLines.push(line);
      }
    }

    const filteredDiff = filteredLines.join("\n");
    this.logger.debug(`Filtered diff content:\n${filteredDiff}`);
    return filteredDiff;
  }

  private buildFilePathMap(lines: string[], diff: string): Map<number, string> {
    const filePathMap = new Map<number, string>();
    lines.forEach((_line, index) => {
      const filePath = this.extractFilePath(diff, index);
      if (filePath) {
        filePathMap.set(index, filePath);
      }
    });
    return filePathMap;
  }

  private analyzeLines(params: {
    lines: string[];
    filePathMap: Map<number, string>;
    foundSecrets: Set<string>;
    validPaths: Set<string>;
    patterns?: SecurityPattern[];
  }): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    let currentFile: string | undefined;
    const patterns = params.patterns ?? SECRET_PATTERNS;

    this.logger.debug("=== Starting line analysis ===");

    for (let i = 0; i < params.lines.length; i++) {
      const line = params.lines[i];
      currentFile = params.filePathMap.get(i) ?? currentFile;

      if (
        !currentFile ||
        !this.isValidLine(currentFile, params.validPaths, line)
      ) {
        continue;
      }

      const result = this.analyzeSingleLine({
        line,
        lineIndex: i,
        currentFile,
        patterns,
      });

      if (result.findings.length) {
        findings.push(...result.findings);
      }
    }

    this.logger.debug(`Analysis complete. Found ${findings.length} secrets`);
    return findings;
  }

  private isValidLine(
    currentFile: string,
    validPaths: Set<string>,
    line: string,
  ): boolean {
    return validPaths.has(currentFile) && line.startsWith("+");
  }

  private analyzeSingleLine(params: {
    line: string;
    lineIndex: number;
    currentFile: string;
    patterns: SecurityPattern[];
  }): { findings: SecurityFinding[] } {
    const findings: SecurityFinding[] = [];
    const contentLine = params.line.substring(1);

    // Handle private key detection
    const privateKeyFindings = this.analyzePrivateKey({
      contentLine,
      currentFile: params.currentFile,
      lineIndex: params.lineIndex,
    });

    if (privateKeyFindings.length) {
      return { findings: privateKeyFindings };
    }

    // Handle regular pattern matching
    findings.push(
      ...this.analyzePatterns({
        contentLine,
        currentFile: params.currentFile,
        lineIndex: params.lineIndex,
        patterns: params.patterns,
      }),
    );

    return { findings };
  }

  private analyzePrivateKey(params: {
    contentLine: string;
    currentFile: string;
    lineIndex: number;
  }): SecurityFinding[] {
    // Remove the leading '+' if it exists
    const line = params.contentLine.startsWith("+")
      ? params.contentLine.substring(1)
      : params.contentLine;

    // Check for BEGIN marker of private keys
    if (!line.includes("BEGIN")) {
      return [];
    }

    // Look for the private key pattern
    const privateKeyPattern = /-----BEGIN (?:RSA |DSA |EC )?PRIVATE KEY-----/;
    const match = privateKeyPattern.exec(line);

    if (!match) return [];

    return [
      {
        type: "secret",
        severity: "high",
        path: params.currentFile,
        line: params.lineIndex + 1,
        match: match[0],
        content: line,
        suggestion: "Remove Private Key and use a secret manager instead",
      },
    ];
  }

  private analyzePatterns(params: {
    contentLine: string;
    currentFile: string;
    lineIndex: number;
    patterns: SecurityPattern[];
  }): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    for (const pattern of params.patterns) {
      if (pattern.name === "Private Key") continue;

      let match: RegExpExecArray | null;
      // Reset lastIndex to ensure we start from the beginning of the string
      pattern.pattern.lastIndex = 0;

      while ((match = pattern.pattern.exec(params.contentLine)) !== null) {
        findings.push({
          type: "secret",
          severity: pattern.severity,
          path: params.currentFile,
          line: params.lineIndex + 1,
          match: match[0],
          content: this.maskSecret(params.contentLine),
          suggestion: this.getPatternSuggestion(pattern.name),
        });

        // If the pattern is not global, break to avoid infinite loop
        if (!pattern.pattern.global) break;
      }
    }

    return findings;
  }

  private getPatternSuggestion(patternName: string): string {
    return patternName === "Custom Pattern"
      ? "Remove this secret and use environment variables instead"
      : `Detected ${patternName}. Use environment variables instead.`;
  }

  private extractFilePath(diff: string, lineIndex: number): string | undefined {
    const lines = diff
      .split("\n")
      .slice(0, lineIndex + 1)
      .reverse();
    let currentFile: string | undefined;

    for (const line of lines) {
      if (line.startsWith("diff --git")) {
        const diffPattern = /diff --git [a-z]\/?(.*?) [a-z]\/?(.*?)$/;
        const match = diffPattern.exec(line);
        if (match) {
          currentFile = match[2];
          return currentFile;
        }
      }
    }

    return currentFile;
  }

  private detectProblematicFiles(params: {
    files: FileChange[];
    patterns?: ProblematicFilePattern[];
  }): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const patterns = params.patterns ?? PROBLEMATIC_FILE_PATTERNS;
    const foundFiles = new Set<string>();

    this.logger.debug(
      `Checking ${params.files.length} files for sensitive content`,
    );

    for (const file of params.files) {
      this.logger.debug(`Checking file: ${file.path}`);
      if (foundFiles.has(file.path)) continue;

      for (const category of patterns) {
        if (category.patterns.some((pattern) => pattern.test(file.path))) {
          foundFiles.add(file.path);
          this.logger.debug(
            `Found sensitive file: ${file.path} (${category.category})`,
          );
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

    // Special handling for private keys - collect multiple lines
    if (
      params.pattern.name === "Private Key" &&
      params.line.includes("BEGIN")
    ) {
      const keyLines = [params.line];
      let lineCount = 1;
      while (lineCount < 10 && !keyLines[keyLines.length - 1].includes("END")) {
        lineCount++;
        keyLines.push(`+${params.line}`);
      }
      const fullKey = keyLines.join("\n");
      const match = params.pattern.pattern.exec(fullKey.substring(1));
      if (match) {
        return {
          type: "secret",
          severity: params.pattern.severity,
          path: params.currentFile,
          line: params.lineNumber + 1,
          match: match[0],
          content: fullKey.substring(1),
          suggestion: "Remove Private Key and use a secret manager instead",
        };
      }
      return null;
    }

    // Regular single-line pattern matching
    const match = params.pattern.pattern.exec(params.line.substring(1));
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

  private maskSecret(line: string): string {
    return line.replace(
      /[a-zA-Z0-9+/=]{8,}/g,
      (match) =>
        `${match.slice(0, 4)}${"*".repeat(match.length - 8)}${match.slice(-4)}`,
    );
  }
}
