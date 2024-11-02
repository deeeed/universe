// services/commit.service.ts
import { promises as fs } from "fs";
import readline from "readline";
import { AIProvider } from "../types/ai.types";
import {
  AnalysisWarning,
  CommitAnalysisResult,
  CommitSplitSuggestion,
  CommitStats,
  CommitSuggestion,
} from "../types/analysis.types";
import { Config } from "../types/config.types";
import { FileChange } from "../types/git.types";
import { Logger } from "../types/logger.types";
import { SecurityCheckResult } from "../types/security.types";
import { BaseService } from "./base.service";
import { GitService } from "./git.service";
import { PromptService } from "./prompt.service";
import { SecurityService } from "./security.service";

export class CommitService extends BaseService {
  private readonly git: GitService;
  private readonly security: SecurityService;
  private readonly ai?: AIProvider;
  private readonly prompt: PromptService;
  private readonly rl: readline.Interface;

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
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private async promptUser(question: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.rl.question(`${question} (y/N): `, (answer) => {
        resolve(answer.toLowerCase() === "y");
      });
    });
  }

  async analyze(params: {
    messageFile: string;
    enableAI?: boolean;
    enablePrompts?: boolean;
  }): Promise<CommitAnalysisResult> {
    try {
      const branch = await this.git.getCurrentBranch();
      const baseBranch = this.git.config.baseBranch;
      const files = await this.git.getStagedChanges();
      const diff = await this.git.getStagedDiff();

      if (files.length === 0) {
        return this.createEmptyResult({ branch, baseBranch });
      }

      const originalMessage = await fs.readFile(params.messageFile, "utf-8");

      if (originalMessage.trim().startsWith("Merge")) {
        return this.createEmptyResult({ branch, baseBranch });
      }

      const securityResult = this.security.analyzeSecurity({
        files,
        diff,
      });
      const warnings = this.getWarnings({ securityResult, files });

      // Format the commit message
      const formattedMessage = this.formatCommitMessage({
        message: originalMessage.trim(),
        files,
      });

      this.logger.info("\n⚙️ Using automatic formatting...");
      this.logger.info(`\n✨ Suggested message:\n${formattedMessage}`);

      // Always write the formatted message in test mode (when enablePrompts is false)
      // In interactive mode, ask for confirmation
      if (
        !params.enablePrompts ||
        (await this.promptUser("\nUse suggested message?"))
      ) {
        await fs.writeFile(params.messageFile, formattedMessage);
        this.logger.info("✅ Commit message updated!\n");
      }

      return {
        branch,
        baseBranch,
        originalMessage: originalMessage.trim(),
        formattedMessage,
        stats: this.calculateStats(files),
        warnings,
        suggestions: params.enableAI
          ? await this.getSuggestions({ files, message: originalMessage, diff })
          : undefined,
        splitSuggestion: params.enableAI
          ? await this.getSplitSuggestion({ files, message: originalMessage })
          : undefined,
        shouldPromptUser: params.enablePrompts,
      };
    } catch (error) {
      this.logger.error("Failed to analyze commit", error);
      throw error;
    } finally {
      this.rl.close();
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

    // Add security warnings
    params.securityResult.secretFindings.forEach((finding) => {
      warnings.push({
        type: "file",
        message: `Security issue: ${finding.type}`,
        severity: "error",
      });
    });

    params.securityResult.fileFindings.forEach((finding) => {
      warnings.push({
        type: "file",
        message: `Problematic file: ${finding.type}`,
        severity: "warning",
      });
    });

    // Add size warnings
    if (params.files.length > 10) {
      warnings.push({
        type: "general",
        message:
          "Large number of files changed. Consider splitting the commit.",
        severity: "warning",
      });
    }

    return warnings;
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

  private async getSplitSuggestion(params: {
    files: FileChange[];
    message: string;
  }): Promise<CommitSplitSuggestion | undefined> {
    if (!this.ai) return undefined;

    const prompt = this.prompt.generateSplitSuggestionPrompt({
      files: params.files,
      message: params.message,
    });

    return this.ai.generateCompletion<CommitSplitSuggestion>({
      prompt,
      options: {
        requireJson: true,
        temperature: 0.3,
      },
    });
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
