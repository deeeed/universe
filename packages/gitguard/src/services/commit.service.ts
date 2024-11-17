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
import { DEFAULT_TEMPERATURE } from "../constants.js";
import { TemplateResult } from "../utils/shared-ai-controller.util.js";
import {
  validateCommitSuggestion,
  validateSplitSuggestion,
} from "../utils/ai-response-validator.util.js";

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
    needsDetailedMessage?: boolean;
    templateResult?: TemplateResult;
  }): Promise<CommitSuggestion[] | undefined> {
    const { templateResult } = params;
    this.logger.debug("Generating AI suggestions with params:", {
      needsDetailedMessage: params.needsDetailedMessage,
      hasTemplateResult: !!templateResult,
      hasSimulatedResponse: !!templateResult?.simulatedResponse,
    });

    if (!this.ai) {
      this.logger.debug("AI service not configured");
      return undefined;
    }

    const { template, renderedPrompt } = templateResult ?? {};
    if (!renderedPrompt) {
      this.logger.error("No prompt provided");
      throw new Error("No prompt provided");
    }

    try {
      let response = templateResult?.simulatedResponse;

      // Handle AI request if no simulated response
      if (!response) {
        this.logger.debug("Sending AI request with:", {
          promptLength: renderedPrompt.length,
          temperature: template?.ai?.temperature ?? DEFAULT_TEMPERATURE,
          hasSystemPrompt: !!template?.systemPrompt,
        });

        response = await this.ai.generateCompletion<unknown>({
          prompt: renderedPrompt,
          options: {
            requireJson: true,
            temperature: template?.ai?.temperature ?? DEFAULT_TEMPERATURE,
            systemPrompt:
              template?.systemPrompt ??
              CommitService.SUGGESTION_SYSTEM_PROMPT(
                params.needsDetailedMessage ?? false,
              ),
          },
        });
      } else {
        this.logger.debug("Using simulated response:", response);
      }

      const validation = validateCommitSuggestion({
        response,
        logger: this.logger,
      });

      if (!validation.isValid) {
        this.logger.warn("Suggestions validation failed:", validation.error);
        return undefined;
      }

      this.logger.debug("Returning validated suggestions:", validation.data);
      return validation.data;
    } catch (error) {
      this.logger.error("Failed to generate AI suggestions:", error);
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

  public async generateAISplitSuggestion(params: {
    templateResult: TemplateResult;
  }): Promise<CommitSplitSuggestion | undefined> {
    this.logger.debug("Generating AI split suggestion with params:", {
      hasTemplateResult: !!params.templateResult,
      hasSimulatedResponse: !!params.templateResult?.simulatedResponse,
    });

    if (!this.ai) {
      this.logger.debug("AI service not configured");
      return undefined;
    }

    const { templateResult } = params;
    const {
      template,
      renderedPrompt,
      renderedSystemPrompt,
      simulatedResponse,
    } = templateResult ?? {};

    if (!renderedPrompt) {
      this.logger.error("No prompt provided");
      throw new Error("No prompt provided");
    }

    try {
      let response = simulatedResponse;

      // Handle AI request if no simulated response
      if (!response) {
        this.logger.debug("Sending AI request with:", {
          promptLength: renderedPrompt.length,
          temperature: template?.ai?.temperature ?? DEFAULT_TEMPERATURE,
          hasSystemPrompt: !!renderedSystemPrompt,
        });

        response = await this.ai.generateCompletion<unknown>({
          prompt: renderedPrompt,
          options: {
            requireJson: true,
            temperature: template?.ai?.temperature ?? DEFAULT_TEMPERATURE,
            systemPrompt:
              renderedSystemPrompt ?? CommitService.COMMIT_SPLIT_SYSTEM_PROMPT,
          },
        });
      } else {
        this.logger.debug("Using simulated response:", response);
      }

      const validation = validateSplitSuggestion({
        response,
        logger: this.logger,
      });

      if (!validation.isValid) {
        this.logger.warn(
          "Split suggestion validation failed:",
          validation.error,
        );
        return undefined;
      }

      this.logger.debug(
        "Returning validated split suggestion:",
        validation.data,
      );
      return validation.data;
    } catch (error) {
      this.logger.error("Failed to generate AI split suggestion:", error);
      return undefined;
    }
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

  private static readonly SUGGESTION_SYSTEM_PROMPT = (
    needsDetailedMessage: boolean,
  ): string => `You are a git commit message assistant. Generate conventional commit format suggestions based on the changes.

Expected response format:
{
  "suggestions": [
    {
      "title": string, // Description without type/scope
      "message": string | null, // ${needsDetailedMessage ? "Required detailed explanation" : "Optional explanation"}
      "type": string // One of: ${CommitService.CONVENTIONAL_COMMIT_PATTERN.types.join("|")}
    }
  ]
}

Guidelines:
1. Use clear, concise language
2. Explain what and why, not how
3. Follow conventional commit types strictly
4. Keep titles under 72 characters
5. Include breaking change marker (!) when needed
6. ${needsDetailedMessage ? "Include detailed message for all changes" : "Add detailed message only for complex changes"}
7. Focus on the impact of the change`;

  private static readonly COMMIT_SPLIT_SYSTEM_PROMPT = `You are a git commit organization assistant specializing in atomic commits and conventional commit format.

Expected response format:
{
  "reason": string, // Clear explanation why the split is needed (max 100 chars)
  "suggestions": [
    {
      "message": string, // Descriptive message without type/scope
      "files": string[], // Array of related file paths
      "order": number, // Logical order (1-based)
      "type": string, // One of: ${CommitService.CONVENTIONAL_COMMIT_PATTERN.types.join("|")}
      "scope": string // Package or component name
    }
  ]
}

Key principles:
1. Prefer fewer, meaningful commits over many granular ones
2. Group related changes by feature or purpose, not just by file type
3. Keep changes that implement a single feature or fix together
4. Split only when changes serve distinctly different purposes
5. Respect package boundaries only when changes are truly independent
6. Include all dependent files (tests, types, stories) with their primary changes

Common grouping patterns:
- Feature changes: Group all files implementing a single feature
- Package changes: Group package changes only if truly independent
- Cross-cutting changes: Prefer grouping by purpose over location
- Infrastructure changes: Group related config changes together

Guidelines for consolidation:
- Keep component changes with their tests, types, and stories
- Group related refactoring across multiple files
- Combine small related changes into meaningful units
- Split only when changes have different semantic purposes`;
}
