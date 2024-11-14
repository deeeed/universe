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
import { CommitParser } from "../utils/commit-parser.util.js";
import { formatDiffForAI } from "../utils/diff.util.js";
import { shouldIgnoreFile } from "../utils/ignore-pattern.util.js";
import { BaseService } from "./base.service.js";
import { GitService } from "./git.service.js";
import { SecurityService } from "./security.service.js";

export class CommitService extends BaseService {
  private readonly git: GitService;
  private readonly security?: SecurityService;
  private readonly ai?: AIProvider;
  private readonly config: Config;
  constructor(params: {
    config: Config;
    git: GitService;
    security?: SecurityService;
    ai?: AIProvider;
    logger: Logger;
  }) {
    super({ logger: params.logger });
    this.config = params.config;
    this.git = params.git;
    this.security = params.security;
    this.ai = params.ai;
  }

  async analyze(params: CommitAnalysisOptions): Promise<CommitAnalysisResult> {
    try {
      const branch = await this.git.getCurrentBranch();
      const baseBranch = this.git.config.baseBranch;

      // Read message file if provided
      let originalMessage = "";
      if (params.messageFile) {
        originalMessage = await fs.readFile(params.messageFile, "utf-8");
      } else if (params.message) {
        originalMessage = params.message;
      }

      // Get files and filter ignored ones using shouldIgnoreFile
      const allFiles = params.files ?? (await this.git.getStagedChanges());
      this.logger.debug(
        "All files before filtering:",
        allFiles.map((f) => f.path),
      );

      const files = allFiles.filter(
        (file) =>
          !shouldIgnoreFile({
            path: file.path,
            patterns: this.git.config.ignorePatterns ?? [],
            logger: this.logger,
          }),
      );
      this.logger.debug(
        "Files after ignore patterns:",
        files.map((f) => f.path),
      );
      const stats = this.calculateStats(files);

      if (files.length === 0) {
        return this.createEmptyResult({ branch, baseBranch });
      }

      // Run security checks if enabled
      const securityResult =
        params.securityResult ??
        (this.security && this.config.security.enabled
          ? this.security.analyzeSecurity({
              files,
              diff: params.diff ?? "",
            })
          : undefined);

      // Initialize warnings array
      const warnings: AnalysisWarning[] = [];

      // Add security warnings
      if (securityResult?.secretFindings?.length) {
        warnings.push(
          ...securityResult.secretFindings.map((finding) => ({
            type: "security" as const,
            severity: finding.severity,
            message: finding.suggestion,
          })),
        );
      }

      // Use existing methods for commit analysis
      const cohesionAnalysis = this.analyzeCommitCohesion({
        files,
        originalMessage: params.message ?? "",
      });

      warnings.push(...cohesionAnalysis.warnings);

      // Format message using existing method
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
        formattedMessage,
        stats,
        warnings,
        suggestions: undefined,
        splitSuggestion: cohesionAnalysis.splitSuggestion,
        shouldPromptUser: cohesionAnalysis.shouldSplit,
        complexity: new CommitParser().analyzeCommitComplexity({ files }),
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

  public async generateAISuggestions(params: {
    files: FileChange[];
    message: string;
    diff: string;
    prompt: string;
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

      const suggestions = await this.ai.generateCompletion<{
        suggestions: CommitSuggestion[];
      }>({
        prompt: params.prompt,
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
    const scopes = this.detectScope(params.files);

    if (!scopes) return undefined;

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
    /**
     * Regex for parsing conventional commits with ReDoS protection:
     * - ^: Start of string
     * - (feat|fix|...): Capturing group for valid commit types
     * - (?:\(([^\n()]{1,50})\))?: Optional scope limited to 50 chars, no newlines/nested parens
     * - (!)?: Optional breaking change indicator
     * - :\s+: Required separator
     * - (.{1,200}): Description limited to 200 chars
     * - $: End of string
     */
    full: /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(?:\(([^\n()]{1,50})\))?(!)?\s*:\s*(.{1,200})$/,
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

  public parseConventionalCommit(message: string): {
    type: string;
    scope?: string;
    breaking: boolean;
    description: string;
  } | null {
    const match = CommitService.CONVENTIONAL_COMMIT_PATTERN.full.exec(message);
    if (!match) {
      const simpleMatch =
        /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert):\s+(.+)$/i.exec(
          message,
        );
      if (simpleMatch) {
        return {
          type: simpleMatch[1].toLowerCase(),
          breaking: false,
          description: simpleMatch[2],
        };
      }
      return null;
    }

    const [, type, scope, breaking, description] = match;
    return {
      type: type.toLowerCase(),
      scope: scope || undefined,
      breaking: breaking === "!",
      description,
    };
  }

  public formatCommitMessage(params: {
    message: string;
    files: FileChange[];
  }): string {
    const { message, files } = params;

    this.logger.debug("Formatting message input:", {
      message,
      fileCount: files.length,
    });

    const parsed = this.parseConventionalCommit(message);
    this.logger.debug("Parsed conventional commit:", parsed);

    if (parsed) {
      const scope = parsed.scope ?? this.detectScope(files);
      return scope
        ? `${parsed.type}(${scope}): ${parsed.description}`
        : `${parsed.type}: ${parsed.description}`;
    }

    const type = this.detectCommitType(files);
    const scope = this.detectScope(files);
    const description = message.trim();

    this.logger.debug("New conventional commit:", { type, scope, description });

    return scope
      ? `${type}(${scope}): ${description}`
      : `${type}: ${description}`;
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
