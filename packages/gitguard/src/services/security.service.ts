import { FileChange } from "../types/commit.types";
import { Config } from "../types/config.types";
import { Logger } from "../types/logger.types";
import {
  PROBLEMATIC_FILE_PATTERNS,
  ProblematicFilePattern,
  SECRET_PATTERNS,
  SecurityAnalysis,
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
  }): SecurityAnalysis {
    const findings = this.detectAll({
      files: params.files,
      diff: params.diff,
    });

    const commands = this.generateCommands({
      findings,
    });

    return {
      findings,
      commands,
      shouldBlock: findings.some((f) => f.severity === "high"),
    };
  }

  private detectAll(params: {
    files: FileChange[];
    diff?: string;
  }): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    if (params.diff) {
      const secretFindings = this.detectSecrets({
        diff: params.diff,
      });
      findings.push(...secretFindings);
    }

    const fileFindings = this.detectProblematicFiles({
      files: params.files,
    });
    findings.push(...fileFindings);

    return findings;
  }

  private detectSecrets(params: {
    diff: string;
    patterns?: SecurityPattern[];
  }): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const lines = params.diff.split("\n");
    const patterns = params.patterns || SECRET_PATTERNS;

    for (const pattern of patterns) {
      const matchFindings = this.findPatternMatches({
        lines,
        pattern,
        diff: params.diff,
      });
      findings.push(...matchFindings);
    }

    return findings;
  }

  private findPatternMatches(params: {
    lines: string[];
    pattern: SecurityPattern;
    diff: string;
  }): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    for (let i = 0; i < params.lines.length; i++) {
      const match = this.checkLine({
        line: params.lines[i],
        pattern: params.pattern,
        lineNumber: i,
        diff: params.diff,
      });

      if (match) {
        findings.push(match);
      }
    }

    return findings;
  }

  private checkLine(params: {
    line: string;
    pattern: SecurityPattern;
    lineNumber: number;
    diff: string;
  }): SecurityFinding | null {
    const match = params.line.match(params.pattern.pattern);
    if (!match) return null;

    const path = this.extractPathFromDiff({
      diff: params.diff,
      lineNumber: params.lineNumber,
    });

    return {
      type: "secret",
      severity: params.pattern.severity,
      path,
      line: params.lineNumber + 1,
      match: "*".repeat(match[0].length),
      content: params.line.replace(match[0], "*".repeat(match[0].length)),
      suggestion: `Remove ${params.pattern.name} and use environment variables`,
    };
  }

  private detectProblematicFiles(params: {
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

  private extractPathFromDiff(params: {
    diff: string;
    lineNumber: number;
  }): string {
    const lines = params.diff.split("\n");
    let currentFile = "";

    for (let i = 0; i <= params.lineNumber; i++) {
      const line = lines[i];
      // Fix the regex escape
      const fileMatch = line.match(/^[+-]{3} [ab]\/(.+)$/);
      if (fileMatch) {
        currentFile = fileMatch[1];
      }
    }

    return currentFile;
  }

  generateCommands(params: { findings: SecurityFinding[] }): string[] {
    const filesToUnstage = params.findings.map((f) => f.path);

    if (filesToUnstage.length === 0) {
      return [];
    }

    return [`git reset HEAD ${filesToUnstage.map((f) => `"${f}"`).join(" ")}`];
  }
}
