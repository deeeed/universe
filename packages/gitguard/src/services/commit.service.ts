// services/commit.service.ts
import { promises as fs } from "fs";
import { AIProvider } from "../types/ai.types.js";
import {
  AnalysisWarning,
  CommitAnalysisOptions,
  CommitAnalysisResult,
  CommitCohesionAnalysis,
  CommitSplitSuggestion,
  CommitStats,
  CommitSuggestion,
} from "../types/analysis.types.js";
import { Config } from "../types/config.types.js";
import { FileChange } from "../types/git.types.js";
import { Logger } from "../types/logger.types.js";
import {
  SecurityCheckResult,
  SecurityFinding,
} from "../types/security.types.js";
import { generateCommitSuggestionPrompt } from "../utils/ai-prompt.util.js";
import { CommitParser } from "../utils/commit-parser.util.js";
import { formatDiffForAI } from "../utils/diff.util.js";
import { BaseService } from "./base.service.js";
import { GitService } from "./git.service.js";
import { SecurityService } from "./security.service.js";

export class CommitService extends BaseService {
  private readonly git: GitService;
  private readonly security?: SecurityService;
  private readonly ai?: AIProvider;

  constructor(params: {
    config: Config;
    git: GitService;
    security?: SecurityService;
    ai?: AIProvider;
    logger: Logger;
  }) {
    super({ logger: params.logger });
    this.git = params.git;
    this.security = params.security;
    this.ai = params.ai;
  }

  async analyze(params: CommitAnalysisOptions): Promise<CommitAnalysisResult> {
    try {
      const branch = await this.git.getCurrentBranch();
      const baseBranch = this.git.config.baseBranch;

      // Use the files passed in instead of getting staged changes
      const files = params.files || (await this.git.getStagedChanges());

      this.logger.debug("Analyzing files:", files);

      if (files.length === 0) {
        return this.createEmptyResult({ branch, baseBranch });
      }

      let originalMessage = "";
      if (params.messageFile) {
        originalMessage = await fs.readFile(params.messageFile, "utf-8");
      } else if (params.message) {
        originalMessage = params.message;
      }

      if (originalMessage.trim().startsWith("Merge")) {
        return this.createEmptyResult({ branch, baseBranch });
      }

      // First analyze security and structure
      const securityResult =
        params.securityResult ||
        (this.security
          ? this.security.analyzeSecurity({
              files,
              diff: "",
            })
          : undefined);

      const warnings = this.getWarnings({ securityResult, files });

      // Analyze commit cohesion FIRST
      const cohesionAnalysis = this.analyzeCommitCohesion({
        files,
        originalMessage: params.message ?? "",
      });

      // Add cohesion warnings to result
      warnings.push(...cohesionAnalysis.warnings);

      let suggestions: CommitSuggestion[] | undefined;
      let splitSuggestion: CommitSplitSuggestion | undefined;
      let shouldPromptUser = false;

      // Only set splitSuggestion if needed
      if (cohesionAnalysis.shouldSplit) {
        splitSuggestion = cohesionAnalysis.splitSuggestion;
        shouldPromptUser = true;
      }

      // Only prepare for AI if no structural issues need addressing first
      if (
        params.enableAI &&
        this.ai &&
        !cohesionAnalysis.shouldSplit &&
        !securityResult?.shouldBlock
      ) {
        shouldPromptUser = true;
      }

      const parser = new CommitParser();
      const complexity = parser.analyzeCommitComplexity({
        files: files,
      });

      // Format the message if provided
      const formattedMessage = params.message
        ? this.formatCommitMessage({
            message: params.message,
            files,
          })
        : "";

      return {
        branch,
        baseBranch,
        originalMessage,
        formattedMessage, // Include the formatted message
        stats: this.calculateStats(files),
        warnings,
        suggestions,
        splitSuggestion,
        shouldPromptUser,
        complexity,
      };
    } catch (error) {
      this.logger.error("Failed to analyze commit", error);
      throw error;
    }
  }

  private calculateStats(files: FileChange[]): CommitStats {
    return {
      filesChanged: files.length,
      additions: files.reduce((sum, file) => sum + file.additions, 0),
      deletions: files.reduce((sum, file) => sum + file.deletions, 0),
    };
  }

  private getWarnings(params: {
    securityResult?: SecurityCheckResult;
    files: FileChange[];
  }): AnalysisWarning[] {
    const warnings: AnalysisWarning[] = [];
    const scopes = this.detectScopes(params.files);

    if (params.securityResult) {
      if (params.securityResult.secretFindings.length > 0) {
        warnings.push(
          ...this.mapSecurityToWarnings(params.securityResult.secretFindings),
        );
      }
    }

    if (params.files.length > 10) {
      warnings.push({
        type: "file",
        message:
          "Large number of files changed. Consider splitting the commit.",
        severity: "medium",
      });
    }

    if (scopes.length > 1) {
      warnings.push({
        type: "file",
        message:
          "Changes span multiple packages. Consider splitting the commit by package.",
        severity: "medium",
      });
    }

    return warnings;
  }

  private mapSecurityToWarnings(
    findings: SecurityFinding[],
  ): AnalysisWarning[] {
    return findings.map((finding) => ({
      type: "security",
      severity: finding.severity,
      message: finding.suggestion,
    }));
  }

  private detectScopes(files: FileChange[]): string[] {
    const scopes = new Set<string>();

    for (const file of files) {
      if (file.path.startsWith("packages/")) {
        const parts = file.path.split("/");
        if (parts.length >= 2) {
          scopes.add(parts[1]);
        }
      }
    }

    return Array.from(scopes);
  }

  public async generateAISuggestions(params: {
    files: FileChange[];
    message: string;
    diff: string;
    needsDetailedMessage?: boolean;
  }): Promise<CommitSuggestion[] | undefined> {
    if (!this.ai) {
      this.logger.debug("AI service not configured");
      return undefined;
    }

    try {
      const detectedScope = this.detectScope(params.files);

      this.logger.debug("Generating AI suggestions for files:", {
        fileCount: params.files.length,
        diffLength: params.diff.length,
        message: params.message,
        aiProvider: this.ai.constructor.name,
        detectedScope,
        needsDetailedMessage: params.needsDetailedMessage ?? false,
      });

      const prompt = generateCommitSuggestionPrompt({
        files: params.files,
        message: params.message,
        diff: params.diff,
        scope: detectedScope,
        needsDetailedMessage: params.needsDetailedMessage ?? false,
        logger: this.logger,
      });

      const suggestions = await this.ai.generateCompletion<{
        suggestions: CommitSuggestion[];
      }>({
        prompt,
        options: {
          requireJson: true,
          temperature: 0.7,
          systemPrompt: `You are a git commit message assistant. Generate 3 distinct conventional commit format suggestions in JSON format. 
            Each suggestion must include:
            - title: the description without type/scope
            - message: optional detailed explanation (${params.needsDetailedMessage ? "required" : "optional"} for this commit)
            - type: conventional commit type

            ${params.needsDetailedMessage ? "Include detailed message for complex changes." : "Keep suggestions concise with title only."}
            Only use the provided scope if one is specified.`,
        },
      });

      this.logger.debug("AI response:", suggestions);

      if (!suggestions?.suggestions?.length) {
        this.logger.warn("No suggestions received from AI service");
        this.logger.debug("Raw AI response:", suggestions);
        return undefined;
      }

      return suggestions.suggestions;
    } catch (error) {
      this.logger.error("Failed to generate AI suggestions:", error);
      this.logger.debug("Error details:", {
        files: params.files.map((f) => f.path),
        messageLength: params.message.length,
        diffLength: params.diff.length,
        error: error instanceof Error ? error.message : error,
      });
      return undefined;
    }
  }

  public getPrioritizedDiffs(params: {
    files: FileChange[];
    diff: string;
    maxLength: number;
  }): string {
    return formatDiffForAI({
      files: params.files,
      diff: params.diff,
      maxLength: params.maxLength,
      logger: this.logger,
    });
  }

  public getSplitSuggestion(params: {
    files: FileChange[];
    message: string;
  }): CommitSplitSuggestion | undefined {
    const scopes = this.detectScopes(params.files);

    if (scopes.length <= 1) return undefined;

    const filesByScope = params.files.reduce(
      (acc, file) => {
        const scope = file.path.startsWith("packages/")
          ? file.path.split("/")[1]
          : "root";

        if (!acc[scope]) acc[scope] = [];
        acc[scope].push(file.path);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    const suggestions = Object.entries(filesByScope).map(
      ([scope, files], index) => ({
        message: `${this.detectCommitType(files.map((path) => ({ path }) as FileChange))}(${scope}): ${params.message}`,
        files,
        order: index + 1,
        type: this.detectCommitType(
          files.map((path) => ({ path }) as FileChange),
        ),
        scope,
      }),
    );

    const commands = suggestions.map(
      (suggestion) =>
        `git reset HEAD ${suggestion.files.map((f) => `"${f}"`).join(" ")}`,
    );

    return {
      reason:
        "Changes span multiple packages and should be split into separate commits",
      suggestions,
      commands,
    };
  }

  private createEmptyResult(params: {
    branch: string;
    baseBranch: string;
  }): CommitAnalysisResult {
    return {
      branch: params.branch,
      baseBranch: params.baseBranch,
      originalMessage: "",
      formattedMessage: "",
      stats: {
        filesChanged: 0,
        additions: 0,
        deletions: 0,
      },
      warnings: [],
      complexity: {
        score: 0,
        reasons: [],
        needsStructure: false,
      },
    };
  }

  private static readonly CONVENTIONAL_COMMIT_PATTERN = {
    // Matches: type(scope)!: description
    full: /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(?:\(([^)]+)\))?(!)?:\s+(.+)$/,
    // Valid commit types
    types: [
      "feat",
      "fix",
      "docs",
      "style",
      "refactor",
      "perf",
      "test",
      "chore",
      "ci",
      "build",
      "revert",
    ],
  } as const;

  private isConventionalCommit(message: string): boolean {
    return (
      CommitService.CONVENTIONAL_COMMIT_PATTERN.full.exec(message) !== null
    );
  }

  private parseConventionalCommit(message: string): {
    type: string;
    scope?: string;
    breaking: boolean;
    description: string;
  } | null {
    const match = CommitService.CONVENTIONAL_COMMIT_PATTERN.full.exec(message);
    if (!match) return null;

    const [, type, scope, breaking, description] = match;
    return {
      type,
      scope,
      breaking: breaking === "!",
      description,
    };
  }

  private enhanceConventionalCommit(
    message: string,
    files: FileChange[],
  ): string {
    const parsed = this.parseConventionalCommit(message);
    if (!parsed) return message;

    // If already has a scope, keep it
    if (parsed.scope) return message;

    // Try to detect monorepo scope
    const detectedScope = this.detectScope(files);
    if (!detectedScope) return message;

    // Reconstruct message with detected scope
    return `${parsed.type}(${detectedScope})${parsed.breaking ? "!" : ""}: ${parsed.description}`;
  }

  public formatCommitMessage(params: {
    message: string;
    files: FileChange[];
  }): string {
    const { message, files } = params;

    this.logger.debug("Formatting commit message:", {
      originalMessage: message,
      fileCount: files.length,
    });

    // Check if it's conventional
    if (this.isConventionalCommit(message)) {
      // Even if conventional, check if it needs scope enhancement
      const enhanced = this.enhanceConventionalCommit(message, files);
      if (enhanced !== message) {
        this.logger.debug("Enhanced conventional commit with scope:", {
          original: message,
          enhanced,
        });
      }
      return enhanced;
    }

    const type = this.detectCommitType(files);
    const scope = this.detectScope(files);

    this.logger.debug("Detected commit details:", {
      type,
      scope,
      originalMessage: message,
    });

    const description = message.trim();
    const formattedMessage = scope
      ? `${type}(${scope}): ${description}`
      : `${type}: ${description}`;

    this.logger.debug("Formatted new conventional commit:", {
      type,
      scope,
      description,
      formattedMessage,
    });

    return formattedMessage;
  }

  public detectCommitType(files: FileChange[]): string {
    const hasFeature = files.some(
      (f) =>
        f.path.includes("/src/") ||
        f.path.includes("/components/") ||
        f.path.includes("/features/"),
    );
    const hasTests = files.some(
      (f) => f.path.includes("/test/") || f.path.includes(".test."),
    );
    const hasDocs = files.some(
      (f) => f.path.includes("/docs/") || f.path.endsWith(".md"),
    );
    const hasConfig = files.some(
      (f) =>
        f.path.includes(".config.") ||
        f.path.includes(".gitignore") ||
        f.path.includes(".env"),
    );

    if (hasFeature) return "feat";
    if (hasTests) return "test";
    if (hasDocs) return "docs";
    if (hasConfig) return "chore";
    return "feat"; // Default to feat
  }

  public detectScope(files: FileChange[]): string | undefined {
    // Check for monorepo package scope
    const monorepoPatterns = this.git.config.monorepoPatterns;

    this.logger.debug("Detecting scope with patterns:", {
      patterns: monorepoPatterns,
      files: files.map((f) => f.path),
    });

    if (monorepoPatterns?.length) {
      const packages = new Set<string>();

      for (const file of files) {
        for (const pattern of monorepoPatterns) {
          const basePattern = pattern
            .replace(/\/$/, "")
            .replace(/\*/g, "([^/]+)");
          const regex = new RegExp(`^${basePattern}`);
          const match = regex.exec(file.path);

          if (match?.[1]) {
            const packageName = match[1];
            packages.add(packageName);
            this.logger.debug("Found package match:", {
              file: file.path,
              pattern,
              packageName,
            });
            break;
          }
        }
      }

      this.logger.debug("Detected packages:", {
        packagesFound: Array.from(packages),
        count: packages.size,
      });

      // If all files are in the same package, use it as scope
      if (packages.size === 1) {
        const scope = Array.from(packages)[0];
        this.logger.debug("Using detected scope:", scope);
        return scope;
      }
    }

    this.logger.debug("No scope detected");
    return undefined;
  }

  public analyzeCommitCohesion(params: {
    files: FileChange[];
    originalMessage: string;
  }): CommitCohesionAnalysis {
    const filesByScope = new Map<string, FileChange[]>();
    const warnings: AnalysisWarning[] = [];

    // Group files by scope (package)
    params.files.forEach((file) => {
      const scope = file.path.startsWith("packages/")
        ? file.path.split("/")[1]
        : "root";

      if (!filesByScope.has(scope)) {
        filesByScope.set(scope, []);
      }
      filesByScope.get(scope)?.push(file);
    });

    // If only one scope, no need to split
    if (filesByScope.size <= 1) {
      return { shouldSplit: false, warnings: [] };
    }

    // Find primary scope (with most changes)
    const primaryScope =
      Array.from(filesByScope.entries()).sort(
        (a, b) => b[1].length - a[1].length,
      )[0]?.[0] || "root";

    warnings.push({
      type: "structure",
      severity: "medium",
      message: `Changes span multiple packages: ${Array.from(filesByScope.keys()).join(", ")}`,
    });

    // Generate split suggestion
    const splitSuggestion: CommitSplitSuggestion = {
      reason:
        "Changes span multiple packages and should be split into separate commits",
      suggestions: Array.from(filesByScope.entries()).map(
        ([scope, files], index) => ({
          message: `${this.detectCommitType(files)}(${scope}): ${params.originalMessage}`,
          files: files.map((f) => f.path),
          order: scope === primaryScope ? 1 : index + 2,
          type: this.detectCommitType(files),
          scope,
        }),
      ),
      commands: this.generateSplitCommands({
        suggestions: Array.from(filesByScope.entries()).map(
          ([scope, files]) => ({
            files: files.map((f) => f.path),
            message: `${this.detectCommitType(files)}(${scope}): ${params.originalMessage}`,
          }),
        ),
      }),
    };

    return {
      shouldSplit: true,
      primaryScope,
      splitSuggestion,
      warnings,
    };
  }

  private generateSplitCommands(params: {
    suggestions: Array<{ files: string[]; message: string }>;
  }): string[] {
    return [
      "# Unstage all files",
      "git reset HEAD .",
      "",
      "# Create commits for each scope",
      ...params.suggestions.map(
        (suggestion) =>
          `git add ${suggestion.files.map((f) => `"${f}"`).join(" ")} && git commit -m "${suggestion.message}"`,
      ),
    ];
  }
}
