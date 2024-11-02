import { Config } from "../types/config.types";
import { FileChange } from "../types/git.types";
import { Logger } from "../types/logger.types";
import {
  PROBLEMATIC_FILE_PATTERNS,
  ProblematicFilePattern,
  SECRET_PATTERNS,
  SecurityCheckResult,
  SecurityFinding,
  SecurityPattern,
} from "../types/security.types";
import { BaseService } from "./base.service";

export class SecurityService extends BaseService {
  constructor(params: { logger: Logger; config: Config }) {
    super(params);
  }

  analyzeSecurity(params: {
    files: FileChange[];
    diff?: string;
  }): SecurityCheckResult {
    const secretFindings = params.diff
      ? this.detectSecrets({ diff: params.diff })
      : [];

    const fileFindings = this.detectProblematicFiles({
      files: params.files,
    });

    const filesToUnstage = [...secretFindings, ...fileFindings].map(
      (f) => f.path,
    );

    const commands = this.generateCommands({
      findings: [...secretFindings, ...fileFindings],
    });

    return {
      secretFindings,
      fileFindings,
      filesToUnstage,
      commands,
      shouldBlock: [...secretFindings, ...fileFindings].some(
        (f) => f.severity === "high",
      ),
    };
  }

  detectSecrets(params: { diff: string }): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const lines = params.diff.split("\n");
    let currentFile = "";

    // Track the current file being processed from the diff
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
      if (fileMatch) {
        currentFile = fileMatch[1];
        continue;
      }

      for (const pattern of SECRET_PATTERNS) {
        const match = this.checkLine({
          line,
          pattern,
          lineNumber: i,
          currentFile,
        });

        if (match) {
          findings.push(match);
        }
      }
    }

    return findings;
  }

  detectProblematicFiles(params: {
    files: FileChange[];
    patterns?: ProblematicFilePattern[];
  }): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const patterns = params.patterns || PROBLEMATIC_FILE_PATTERNS;

    for (const file of params.files) {
      const fileFindings = this.checkFile({
        path: file.path,
        patterns,
      });
      findings.push(...fileFindings);
    }

    return findings;
  }

  private checkLine(params: {
    line: string;
    pattern: SecurityPattern;
    lineNumber: number;
    currentFile: string;
  }): SecurityFinding | null {
    // Only check added lines (starting with +)
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

  private checkFile(params: {
    path: string;
    patterns: ProblematicFilePattern[];
  }): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    for (const category of params.patterns) {
      if (category.patterns.some((pattern) => pattern.test(params.path))) {
        findings.push({
          type: "sensitive_file",
          severity: category.severity,
          path: params.path,
          suggestion: this.getSuggestionForFile({
            path: params.path,
            category: category.category,
          }),
        });
      }
    }

    return findings;
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
    const filesToUnstage = params.findings.map((f) => f.path);

    if (filesToUnstage.length === 0) {
      return [];
    }

    return [`git reset HEAD ${filesToUnstage.map((f) => `"${f}"`).join(" ")}`];
  }
}
