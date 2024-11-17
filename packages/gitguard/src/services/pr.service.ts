// services/pr.service.ts
import * as fs from "fs/promises";
import { DEFAULT_TEMPERATURE } from "../constants.js";
import { AIProvider } from "../types/ai.types.js";
import {
  AnalysisWarning,
  GitHubPR,
  PRAnalysisOptions,
  PRAnalysisResult,
  PRDescription,
  PRSplitSuggestion,
  PRStats,
} from "../types/analysis.types.js";
import { Config } from "../types/config.types.js";
import { CommitInfo, FileChange } from "../types/git.types.js";
import { SecurityCheckResult } from "../types/security.types.js";
import { ServiceOptions } from "../types/service.types.js";
import { TemplateResult } from "../utils/shared-ai-controller.util.js";
import { BaseService } from "./base.service.js";
import { GitService } from "./git.service.js";
import { GitHubService } from "./github.service.js";
import { SecurityService } from "./security.service.js";

export interface CreatePRFromBranchParams {
  branch?: string;
  draft?: boolean;
  labels?: string[];
  useAI?: boolean;
  title?: string;
  description?: string;
  base?: string;
}

export class PRService extends BaseService {
  private readonly git: GitService;
  private readonly github: GitHubService;
  private readonly security?: SecurityService;
  private readonly ai?: AIProvider;
  private readonly config: Config;

  constructor(
    params: ServiceOptions & {
      config: Config;
      git: GitService;
      github: GitHubService;
      security?: SecurityService;
      ai?: AIProvider;
    },
  ) {
    super(params);
    this.git = params.git;
    this.github = params.github;
    this.security = params.security;
    this.ai = params.ai;
    this.config = params.config;
  }

  private createEmptyResult(
    branch: string,
    baseBranch: string,
  ): PRAnalysisResult {
    return {
      branch,
      baseBranch,
      commits: [],
      stats: {
        totalCommits: 0,
        filesChanged: 0,
        additions: 0,
        deletions: 0,
        authors: [],
        timeSpan: {
          firstCommit: new Date(),
          lastCommit: new Date(),
        },
      },
      diff: "",
      files: [],
      warnings: [],
      filesByDirectory: {},
    };
  }

  public groupByDirectory(commits: CommitInfo[]): Record<string, string[]> {
    const filesByDir: Record<string, Set<string>> = {};

    commits.forEach((commit) => {
      commit.files.forEach((file) => {
        const dir = file.path.split("/")[0];
        if (!filesByDir[dir]) {
          filesByDir[dir] = new Set();
        }
        filesByDir[dir].add(file.path);
      });
    });

    return Object.fromEntries(
      Object.entries(filesByDir).map(([dir, files]) => [
        dir,
        Array.from(files),
      ]),
    );
  }

  private generateSplitCommands(params: {
    suggestedPRs: PRSplitSuggestion["suggestedPRs"];
    baseBranch: string;
  }): string[] {
    const commands: string[] = [
      `# Save current changes`,
      `git stash save "temp-split-changes"`,
      ``,
      `# Create a backup branch`,
      `git branch backup/$(date +%Y%m%d-%H%M%S)`,
      ``,
    ];

    params.suggestedPRs.forEach((pr, index) => {
      // Generate a clean branch name from title
      const branchName = `split/${index + 1}/${pr.title
        .toLowerCase() // Convert to lowercase first
        .replace(/[^a-z0-9]+/g, "-") // Replace any non-alphanumeric chars with single dash
        .replace(/(-)+/g, "-") // Replace multiple consecutive dashes with single dash
        .replace(/(^-)|(-$)/g, "")}`; // Remove any leading or trailing dashes

      commands.push(
        `# ${index + 1}. Create branch for: ${pr.title}`,
        `git checkout -b ${branchName} ${params.baseBranch}`,
        ``,
        `# Add relevant files`,
        ...pr.files.map((f) => `git checkout HEAD ${f}`),
        `git add .`,
        ``,
        `# Create commit with description`,
        `git commit -m "${pr.title}" -m "${pr.description.replace(/"/g, '\\"')}"`,
        ``,
        `# Push branch (optional)`,
        `git push -u origin ${branchName}`,
        ``,
      );

      // Add dependency warning if present
      if (pr.dependencies?.length) {
        commands.push(
          `# Note: This PR depends on: ${pr.dependencies.join(", ")}`,
          ``,
        );
      }
    });

    commands.push(
      `# Return to original branch`,
      `git checkout -`,
      ``,
      `# Restore changes`,
      `git stash pop`,
      ``,
      `# Cleanup (optional)`,
      `# git branch -D backup/*`,
    );

    return commands;
  }

  private generatePRTitle(commits: CommitInfo[], files: string[]): string {
    // If single commit, use its message
    if (commits.length === 1) {
      return commits[0].message;
    }

    // Otherwise, detect type based on files
    const type = this.detectPRType(files);
    return `${type}: Combined changes for ${commits.length} commits`;
  }

  private detectPRType(files: string[]): string {
    const hasFeature = files.some(
      (path) =>
        path.includes("/src/") ||
        path.includes("/components/") ||
        path.includes("/features/"),
    );
    const hasTests = files.some(
      (path) => path.includes("/test/") || path.includes(".test."),
    );
    const hasDocs = files.some(
      (path) => path.includes("/docs/") || path.endsWith(".md"),
    );
    const hasConfig = files.some(
      (path) =>
        path.includes(".config.") ||
        path.includes(".gitignore") ||
        path.includes(".env"),
    );

    if (hasFeature) return "feat";
    if (hasTests) return "test";
    if (hasDocs) return "docs";
    if (hasConfig) return "chore";
    return "feat"; // Default to feat
  }

  private shouldSplitPR(params: {
    stats: PRStats;
    warnings: AnalysisWarning[];
  }): boolean {
    // Split if:
    // 1. Too many files changed
    if (params.stats.filesChanged > this.config.analysis.maxFileSize)
      return true;

    // 2. Changes span multiple packages
    const hasMultiPackageWarning = params.warnings.some((w) =>
      w.message.includes("multiple packages"),
    );
    if (hasMultiPackageWarning) return true;

    // 3. Too many commits
    if (params.stats.totalCommits > 10) return true;

    // 4. Changes span a long time period
    const timeSpanDays =
      (params.stats.timeSpan.lastCommit.getTime() -
        params.stats.timeSpan.firstCommit.getTime()) /
      (1000 * 60 * 60 * 24);
    if (timeSpanDays > 7) return true;

    return false;
  }

  public async loadPRTemplate(): Promise<string | undefined> {
    const templatePath =
      this.config.pr?.template?.path || ".github/pull_request_template.md";
    try {
      return await fs.readFile(templatePath, "utf-8");
    } catch {
      return undefined;
    }
  }

  public async generateAIDescription(params: {
    templateResult?: TemplateResult;
  }): Promise<PRDescription | undefined> {
    this.logger.debug("Generating AI description with params:", {
      hasTemplateResult: !!params.templateResult,
      hasSimulatedResponse: !!params.templateResult?.simulatedResponse,
    });

    if (!this.ai) {
      this.logger.debug("AI service not configured");
      return undefined;
    }

    const {
      template,
      renderedPrompt,
      renderedSystemPrompt,
      simulatedResponse,
    } = params.templateResult ?? {};

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
              renderedSystemPrompt ?? PRService.PR_DESCRIPTION_SYSTEM_PROMPT,
          },
        });
      } else {
        this.logger.debug("Using simulated response:", response);
      }

      // TODO: Add validation function similar to commit service
      return response as PRDescription;
    } catch (error) {
      this.logger.error("Failed to generate PR description:", error);
      return undefined;
    }
  }

  public async generateSplitSuggestion(params: {
    templateResult?: TemplateResult;
  }): Promise<PRSplitSuggestion | undefined> {
    this.logger.debug("Generating AI split suggestion with params:", {
      hasTemplateResult: !!params.templateResult,
      hasSimulatedResponse: !!params.templateResult?.simulatedResponse,
    });

    if (!this.ai) {
      this.logger.debug("AI service not configured");
      return undefined;
    }

    const {
      template,
      renderedPrompt,
      renderedSystemPrompt,
      simulatedResponse,
    } = params.templateResult ?? {};

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
              renderedSystemPrompt ?? PRService.PR_SPLIT_SYSTEM_PROMPT,
          },
        });
      } else {
        this.logger.debug("Using simulated response:", response);
      }

      // TODO: Add validation function similar to commit service
      return response as PRSplitSuggestion;
    } catch (error) {
      this.logger.error("Failed to generate split suggestion:", error);
      return undefined;
    }
  }

  // Add system prompts as static class properties
  private static readonly PR_DESCRIPTION_SYSTEM_PROMPT = `You are a PR description assistant specializing in clear, comprehensive documentation of changes.

Expected response format:
{
  "title": string, // Clear, concise PR title following conventional commit format
  "description": string, // Detailed description of changes
  "type": string, // Type of change (feat, fix, etc.)
  "scope"?: string, // Optional scope of changes
  "breaking": boolean // Whether changes are breaking
}

Guidelines:
1. Write clear, actionable titles that describe the change
2. Use appropriate section emojis for visual organization
3. Include context and reasoning in descriptions
4. Highlight breaking changes and migration steps
5. Document testing considerations
6. Include deployment notes when relevant

Section Emojis (use when applicable):
📝 Description/Overview
🎯 Purpose/Goal
🔄 Changes Made
✨ New Features
🐛 Bug Fixes
🧪 Testing Instructions
📸 Screenshots/Recordings
⚠️ Warnings/Notes
🏷️ Labels/Type
👥 Reviewers
📋 Checklist
🔍 Review Points
📚 Documentation Updates
🔗 Related Issues/PRs
⚡ Performance Updates
🔒 Security Changes
🎨 UI/Style Changes
🧹 Code Cleanup
⚙️ Configuration Changes
📦 Dependencies

Example format:
📝 Description
[Overview of changes]

🎯 Purpose
[Why these changes are needed]

🔄 Changes
- Change 1
- Change 2

🧪 Testing
[Testing instructions]

⚠️ Notes
[Any important considerations]`;

  private static readonly PR_SPLIT_SYSTEM_PROMPT = `You are a PR organization assistant specializing in atomic changes and clear documentation.

Expected response format:
{
  "reason": string, // Clear explanation why the split is needed (or why no split is needed)
  "suggestedPRs": [
    {
      "title": string, // Clear PR title
      "description": string, // Detailed description
      "files": { path: string }[], // Related files
      "order": number, // Logical order (1-based)
      "dependencies"?: string[], // Optional dependent PRs
      "baseBranch": string // Base branch for the PR
    }
  ] | [], // Empty array if no split needed
  "commands": string[] // Git commands to execute the split (empty array if no split needed)
}

Important: Return empty suggestedPRs array if changes are cohesive and shouldn't be split!

Key principles:
1. Focus on main feature groups - aim for 2-3 PRs maximum
2. Keep all related changes together (features, tests, types, styles)
3. Only split when changes serve completely different business purposes
4. Consider deployment impact and dependencies
5. Prefer fewer, well-organized PRs over many granular ones

When to keep as single PR:
1. Changes implement a single feature or fix
2. Related refactoring across multiple files/packages
3. Changes are tightly coupled or interdependent
4. Small to medium-sized changes across related areas
5. Infrastructure changes that need to be deployed together

Guidelines for grouping:
1. Primary Features: Group all files implementing a main feature together
2. Supporting Changes: Include tests, types, and styles with their feature
3. Infrastructure: Group all related config/setup changes together
4. Cross-package Changes: Keep changes together if they implement a single feature
5. Documentation: Include with the feature it documents

When to avoid splitting:
1. Don't split by technical type (tests, types, styles)
2. Don't split by package if changes are part of the same feature
3. Don't create separate PRs for small related changes
4. Don't split refactoring that affects multiple files/packages

Remember: The goal is to maintain logical coherence while minimizing the number of PRs. If changes are cohesive, return an empty suggestion rather than forcing a split.`;

  public checkSize(params: { stats: PRStats }): AnalysisWarning[] {
    const warnings: AnalysisWarning[] = [];

    // Check total files changed
    if (params.stats.filesChanged > this.config.analysis.maxFileSize) {
      warnings.push({
        type: "size",
        severity: "medium",
        message: `PR changes too many files (${params.stats.filesChanged} > ${this.config.analysis.maxFileSize})`,
      });
    }

    // Check total changes
    const totalChanges = params.stats.additions + params.stats.deletions;
    if (totalChanges > this.config.analysis.maxFileSize * 100) {
      warnings.push({
        type: "size",
        severity: "medium",
        message: `PR has too many changes (${totalChanges} lines)`,
      });
    }

    // Check number of commits
    if (params.stats.totalCommits > 10) {
      warnings.push({
        type: "size",
        severity: "medium",
        message: `PR has too many commits (${params.stats.totalCommits} > 10)`,
      });
    }

    return warnings;
  }

  private checkBranchSecurity(params: {
    files: FileChange[];
    diff: string;
  }): SecurityCheckResult | undefined {
    if (!this.security) return undefined;

    const securityResult = this.security.analyzeSecurity({
      files: params.files,
      diff: params.diff,
    });

    if (securityResult.shouldBlock) {
      this.logger.warn("\n⚠️ Security issues detected!");
      securityResult.secretFindings.forEach((finding) => {
        this.logger.warn(`  • ${finding.path}: ${finding.suggestion}`);
      });
    }

    return securityResult;
  }

  async analyze(params: PRAnalysisOptions): Promise<PRAnalysisResult> {
    try {
      const branch = params.branch || (await this.git.getCurrentBranch());
      const baseBranch = this.git.config.baseBranch;

      // Get all commits and changes
      const commits = await this.git.getCommits({
        from: baseBranch,
        to: branch,
      });

      // Exit early if no commits
      if (commits.length === 0) {
        return this.createEmptyResult(branch, baseBranch);
      }

      // Get diff once and reuse it
      const diff = await this.git.getDiff({
        from: baseBranch,
        to: branch,
        type: "range",
      });

      // Calculate stats
      const stats = this.calculateStats({ commits });

      // Collect warnings
      const warnings: AnalysisWarning[] = [];

      // Add size warnings using the dedicated method
      warnings.push(...this.checkSize({ stats }));

      // Group files by directory for better analysis
      const filesByDirectory = this.groupByDirectory(commits);

      // Add directory-based warnings
      if (Object.keys(filesByDirectory).length > 3) {
        warnings.push({
          type: "structure",
          severity: "medium",
          message: `PR spans too many directories (${Object.keys(filesByDirectory).length} > 3)`,
        });
      }

      // Security checks - only if security service is available
      const securityResult = this.checkBranchSecurity({
        files: commits.flatMap((c) => c.files),
        diff,
      });

      // Add security warnings to result
      if (securityResult?.secretFindings.length) {
        warnings.push(
          ...securityResult.secretFindings.map(
            (finding): AnalysisWarning => ({
              type: "security",
              severity: finding.severity,
              message: `Security issue in ${finding.path}: ${finding.suggestion}`,
            }),
          ),
        );
      }

      let description: PRDescription | undefined;
      let splitSuggestion: PRSplitSuggestion | undefined;

      // Always check if PR should be split
      const shouldSplit = this.shouldSplitPR({ stats, warnings });

      // Always provide split suggestion if needed
      if (shouldSplit) {
        splitSuggestion = this.createBasicSplitSuggestion({
          commits,
          baseBranch,
        });
      }

      return {
        branch,
        baseBranch,
        commits,
        stats,
        warnings,
        description,
        splitSuggestion,
        filesByDirectory,
        securityResult,
        files: commits.flatMap((c) => c.files),
        diff,
      };
    } catch (error) {
      this.logger.error("PR validation failed:", error);
      throw error;
    }
  }

  private calculateStats(params: { commits: CommitInfo[] }): PRStats {
    const files = new Set<string>();
    let additions = 0;
    let deletions = 0;
    const authors = new Set<string>();
    let firstCommit = params.commits[0].date;
    let lastCommit = params.commits[0].date;

    params.commits.forEach((commit) => {
      authors.add(commit.author);
      firstCommit = new Date(
        Math.min(firstCommit.getTime(), commit.date.getTime()),
      );
      lastCommit = new Date(
        Math.max(lastCommit.getTime(), commit.date.getTime()),
      );

      commit.files.forEach((file) => {
        files.add(file.path);
        additions += file.additions;
        deletions += file.deletions;
      });
    });

    return {
      totalCommits: params.commits.length,
      filesChanged: files.size,
      additions,
      deletions,
      authors: Array.from(authors),
      timeSpan: {
        firstCommit,
        lastCommit,
      },
    };
  }

  private createBasicSplitSuggestion(params: {
    commits: CommitInfo[];
    baseBranch: string;
  }): PRSplitSuggestion {
    const files = params.commits.flatMap((c) => c.files.map((f) => f.path));

    // Group files by scope
    const filesByScope = files.reduce(
      (acc, file) => {
        let scope = "root";
        const patterns = this.git.config.monorepoPatterns;

        for (const pattern of patterns) {
          if (file.startsWith(pattern)) {
            const parts = file.split("/");
            if (parts.length >= 2) {
              const scopeType = pattern.replace("/", "");
              scope = `${scopeType}/${parts[1]}`;
            }
            break;
          }
        }

        if (!acc[scope]) {
          acc[scope] = {
            files: [],
            commits: new Set<string>(),
          };
        }
        acc[scope].files.push(file);
        params.commits
          .filter((c) => c.files.some((f) => f.path === file))
          .forEach((c) => acc[scope].commits.add(c.hash));
        return acc;
      },
      {} as Record<string, { files: string[]; commits: Set<string> }>,
    );

    // Create split suggestions
    const suggestedPRs = Object.entries(filesByScope).map(
      ([scope, data], index) => ({
        title: `${scope}: ${this.generatePRTitle(
          params.commits.filter((c) => data.commits.has(c.hash)),
          data.files,
        )}`,
        description: `Changes related to ${scope} package`,
        files: data.files,
        order: index + 1,
        baseBranch: params.baseBranch,
        dependencies: [], // Will be filled based on commit history
      }),
    );

    // Generate git commands for splitting
    const commands = this.generateSplitCommands({
      suggestedPRs,
      baseBranch: params.baseBranch,
    });

    return {
      reason:
        "Changes span multiple packages and should be split into separate PRs",
      suggestedPRs,
      commands,
    };
  }

  public async createPRFromBranch(
    params: CreatePRFromBranchParams,
  ): Promise<GitHubPR | null> {
    try {
      // Check GitHub availability
      if (!this.github.isGitHubEnabled()) {
        return null;
      }

      const branch = params.branch ?? (await this.git.getCurrentBranch());

      // If title and description are provided, use them directly
      if (params.title && params.description) {
        return this.github.createPRFromBranch({
          branch,
          title: params.title,
          description: params.description,
          draft: params.draft,
          labels: params.labels,
          base: params.base,
        });
      }

      // Get branch analysis
      const analysis = await this.analyze({
        branch,
        enableAI: params.useAI,
        enablePrompts: false, // No prompts in service
      });

      // Generate PR content
      let title = params.title;
      let description = params.description;

      if (!title || !description) {
        if (params.useAI && analysis.description) {
          title = title ?? analysis.description.title;
          description = description ?? analysis.description.description;
        } else {
          // Generate basic PR content from commits
          title =
            title ??
            this.generatePRTitle(
              analysis.commits,
              analysis.files.map((f) => f.path),
            );
          description =
            description ??
            this.generateBasicDescription({
              commits: analysis.commits,
              stats: analysis.stats,
              template: await this.loadPRTemplate(),
            });
        }
      }

      // Create PR
      return this.github.createPRFromBranch({
        branch,
        title,
        description,
        draft: params.draft,
        labels: params.labels,
        base: params.base,
      });
    } catch (error) {
      this.logger.error("Failed to create PR from branch:", error);
      throw error;
    }
  }

  private generateBasicDescription(params: {
    commits: CommitInfo[];
    stats: PRStats;
    template?: string;
  }): string {
    const sections: string[] = [];

    // Add template if available
    if (params.template) {
      sections.push(params.template);
    }

    // Add commit list
    sections.push("## Commits\n");
    params.commits.forEach((commit) => {
      sections.push(`- ${commit.message} (${commit.hash.slice(0, 7)})`);
    });

    // Add stats
    sections.push("\n## Changes\n");
    sections.push(`- Files changed: ${params.stats.filesChanged}`);
    sections.push(`- Additions: +${params.stats.additions}`);
    sections.push(`- Deletions: -${params.stats.deletions}`);
    sections.push(`- Total commits: ${params.stats.totalCommits}`);

    return sections.join("\n");
  }
}
