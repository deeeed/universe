// services/commit.service.ts
import { promises as fs } from "fs";
import { AIProvider } from "../types/ai.types.js";
import {
  AnalysisWarning,
  CommitAnalysisResult,
  CommitSplitSuggestion,
  CommitStats,
  CommitSuggestion,
} from "../types/analysis.types.js";
import { Config } from "../types/config.types.js";
import { FileChange } from "../types/git.types.js";
import { Logger } from "../types/logger.types.js";
import { SecurityCheckResult } from "../types/security.types.js";
import { BaseService } from "./base.service.js";
import { GitService } from "./git.service.js";
import { PromptService } from "./prompt.service.js";
import { SecurityService } from "./security.service.js";

export class CommitService extends BaseService {
  private readonly git: GitService;
  private readonly security: SecurityService;
  private readonly ai?: AIProvider;
  private readonly prompt: PromptService;

  constructor(params: {
    config: Config;
    git: GitService;
    security: SecurityService;
    prompt: PromptService;
    ai?: AIProvider;
    logger: Logger;
  }) {
    super({ logger: params.logger });
    this.git = params.git;
    this.security = params.security;
    this.prompt = params.prompt;
    this.ai = params.ai;
  }

  async analyze(params: {
    messageFile: string;
    enableAI?: boolean;
    enablePrompts?: boolean;
    securityResult?: SecurityCheckResult;
  }): Promise<CommitAnalysisResult> {
    try {
      const branch = await this.git.getCurrentBranch();
      const baseBranch = this.git.config.baseBranch;
      const files = await this.git.getStagedChanges();
      const diff = await this.git.getStagedDiff();

      this.logger.debug("Getting staged changes");

      if (files.length === 0) {
        return this.createEmptyResult({ branch, baseBranch });
      }

      const originalMessage = await fs.readFile(params.messageFile, "utf-8");

      if (!originalMessage || originalMessage.trim().startsWith("Merge")) {
        return this.createEmptyResult({ branch, baseBranch });
      }

      const securityResult =
        params.securityResult ||
        this.security.analyzeSecurity({
          files,
          diff,
        });

      const warnings = this.getWarnings({ securityResult, files });
      const formattedMessage = this.formatCommitMessage({
        message: originalMessage.trim(),
        files,
      });

      let suggestions: CommitSuggestion[] | undefined;
      let splitSuggestion: CommitSplitSuggestion | undefined;

      if (params.enableAI && this.ai) {
        [suggestions, splitSuggestion] = await Promise.all([
          this.getSuggestions({ files, message: originalMessage, diff }),
          this.getSplitSuggestion({ files, message: originalMessage }),
        ]);
      }

      return {
        branch,
        baseBranch,
        originalMessage: originalMessage.trim(),
        formattedMessage,
        stats: this.calculateStats(files),
        warnings,
        suggestions,
        splitSuggestion,
        shouldPromptUser: Boolean(params.enablePrompts),
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
    securityResult: SecurityCheckResult;
    files: FileChange[];
  }): AnalysisWarning[] {
    const warnings: AnalysisWarning[] = [];
    const scopes = this.detectScopes(params.files);

    // Add size warnings
    if (params.files.length > 10) {
      warnings.push({
        type: "file",
        message:
          "Large number of files changed. Consider splitting the commit.",
        severity: "warning",
      });
    }

    // Add multi-scope warning
    if (scopes.length > 1) {
      warnings.push({
        type: "file",
        message:
          "Changes span multiple packages. Consider splitting the commit by package.",
        severity: "warning",
      });
    }

    return warnings;
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

  private async getSuggestions(params: {
    files: FileChange[];
    message: string;
    diff: string;
  }): Promise<CommitSuggestion[] | undefined> {
    if (!this.ai) return undefined;

    const prompt = this.prompt.generateCommitSuggestionPrompt({
      files: params.files,
      message: params.message,
    });

    return this.ai.generateCompletion<CommitSuggestion[]>({
      prompt,
      options: {
        requireJson: true,
        temperature: 0.7,
      },
    });
  }

  private getSplitSuggestion(params: {
    files: FileChange[];
    message: string;
  }): CommitSplitSuggestion | undefined {
    const scopes = this.detectScopes(params.files);

    // Only suggest split if multiple scopes detected
    if (scopes.length <= 1) return undefined;

    // Group files by scope
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

    // Create split suggestion
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

    // Generate git commands for splitting
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
    };
  }

  private formatCommitMessage(params: {
    message: string;
    files: FileChange[];
  }): string {
    const { message, files } = params;

    if (this.isConventionalCommit(message)) {
      return message;
    }

    const type = this.detectCommitType(files);
    const scope = this.detectScope(files);
    const description = message.trim();

    return scope
      ? `${type}(${scope}): ${description}`
      : `${type}: ${description}`;
  }

  private isConventionalCommit(message: string): boolean {
    const conventionalPattern =
      /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: .+/;
    return conventionalPattern.test(message);
  }

  private detectCommitType(files: FileChange[]): string {
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

  private detectScope(files: FileChange[]): string | undefined {
    const isMonorepo = files.some((f) => f.path.startsWith("packages/"));

    if (!isMonorepo) {
      return undefined;
    }

    const packages = new Set<string>();
    for (const file of files) {
      if (file.path.startsWith("packages/")) {
        const parts = file.path.split("/");
        if (parts.length >= 2) {
          packages.add(parts[1]);
        }
      }
    }

    const packageNames = Array.from(packages);
    return packageNames.length === 1 ? packageNames[0] : packageNames.join(",");
  }
}