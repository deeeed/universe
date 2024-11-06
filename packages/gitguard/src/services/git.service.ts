// packages/gitguard/src/services/git.service.ts
import { exec } from "child_process";
import { promises as fs } from "fs";
import { promisify } from "util";
import { GitConfig } from "../types/config.types.js";
import { CommitInfo, FileChange } from "../types/git.types.js";
import { ServiceOptions } from "../types/service.types.js";
import { CommitParser } from "../utils/commit-parser.util.js";
import { FileUtil } from "../utils/file.util.js";
import { BaseService } from "./base.service.js";

interface GetDiffParams {
  type: "staged" | "range";
  from?: string;
  to?: string;
}

const execPromise = promisify(exec);

export class GitService extends BaseService {
  private parser: CommitParser;
  private readonly gitConfig: GitConfig;
  private readonly cwd: string;

  constructor(params: ServiceOptions & { config: GitConfig }) {
    super(params);
    this.gitConfig = params.config;
    this.parser = new CommitParser();
    this.cwd = this.gitConfig.cwd || process.cwd();
    this.logger.debug("GitService initialized with config:", this.gitConfig);
    this.logger.debug("Working directory:", this.cwd);
  }

  public get config(): GitConfig {
    return this.gitConfig;
  }

  async getCurrentBranch(): Promise<string> {
    try {
      this.logger.debug("Getting current branch");
      const result = await this.execGit({
        command: "rev-parse",
        args: ["--abbrev-ref", "HEAD"],
      });
      const branch = result.trim();
      this.logger.debug(`Current branch: ${branch}`);
      return branch;
    } catch (error) {
      this.logger.error("Failed to get current branch:", error);
      throw error;
    }
  }

  async getCommits(params: {
    from: string;
    to: string;
  }): Promise<CommitInfo[]> {
    try {
      this.logger.debug(`Getting commits from ${params.from} to ${params.to}`);
      const output = await this.execGit({
        command: "log",
        args: [
          "--format=%H%n%an%n%aI%n%B%n--END--",
          `${params.from}..${params.to}`,
        ],
      });

      const commits = this.parser.parseCommitLog({ log: output });
      this.logger.debug(`Found ${commits.length} commits`);
      return this.attachFileChanges({ commits });
    } catch (error) {
      this.logger.error("Failed to get commits:", error);
      throw error;
    }
  }

  async getStagedChanges(): Promise<FileChange[]> {
    try {
      this.logger.debug("Getting staged changes");
      const output = await this.execGit({
        command: "diff",
        args: ["--cached", "--numstat"],
      });

      if (!output.trim()) {
        this.logger.debug("No staged changes found");
        return [];
      }

      const files = output
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [additions = "0", deletions = "0", path = ""] =
            line.split(/\s+/);
          return {
            path,
            additions: parseInt(additions, 10) || 0,
            deletions: parseInt(deletions, 10) || 0,
            ...FileUtil.getFileType({ path }),
          };
        });

      this.logger.debug("Staged files:", files);
      return files;
    } catch (error) {
      this.logger.error("Failed to get staged changes:", error);
      return [];
    }
  }

  async getStagedDiff(): Promise<string> {
    try {
      this.logger.debug("Getting staged diff");
      return await this.execGit({
        command: "diff",
        args: ["--cached"],
      });
    } catch (error) {
      this.logger.error("Failed to get staged diff:", error);
      throw error;
    }
  }

  async getRepositoryRoot(): Promise<string> {
    try {
      this.logger.debug("Getting repository root");
      const result = await this.execGit({
        command: "rev-parse",
        args: ["--show-toplevel"],
      });
      return result.trim();
    } catch (error) {
      this.logger.error("Failed to get repository root:", error);
      throw error;
    }
  }

  async isMonorepo(): Promise<boolean> {
    try {
      const root = await this.getRepositoryRoot();
      const patterns = this.gitConfig.monorepoPatterns || [
        "packages/",
        "apps/",
        "libs/",
      ];

      const results = await Promise.all(
        patterns.map((pattern) =>
          this.execGit({
            command: "ls-files",
            args: [`${root}/${pattern}`],
          }),
        ),
      );

      return results.some((result) => result.trim().length > 0);
    } catch {
      return false;
    }
  }

  async getPRTemplate(): Promise<string | null> {
    try {
      const templatePaths = [
        ".github/pull_request_template.md",
        ".github/PULL_REQUEST_TEMPLATE.md",
        "docs/pull_request_template.md",
        "PULL_REQUEST_TEMPLATE.md",
      ];

      for (const path of templatePaths) {
        try {
          const content = await this.execGit({
            command: "show",
            args: [`HEAD:${path}`],
          });
          if (content) {
            return content;
          }
        } catch {
          continue;
        }
      }
      return null;
    } catch (error) {
      this.logger.debug("Failed to get PR template:", error);
      return null;
    }
  }

  async unstageFiles(params: { files: string[] }): Promise<void> {
    try {
      if (!params.files.length) return;

      this.logger.debug(`Unstaging files: ${params.files.join(", ")}`);

      // Get repository root for correct path resolution
      const repoRoot = await this.getRepositoryRoot();
      this.logger.debug(`Repository root: ${repoRoot}`);

      // Log initial staged files for verification
      const initialStaged = await this.getStagedChanges();
      this.logger.debug(
        "Initially staged files:",
        initialStaged.map((f) => f.path),
      );

      for (const file of params.files) {
        this.logger.debug(`Executing git reset for: ${file}`);
        const result = await this.execGit({
          command: "reset",
          args: ["HEAD", "--", file],
          cwd: repoRoot, // Use repository root as working directory
        });
        this.logger.debug(`Reset result for ${file}:`, result);
      }

      // Verify files were actually unstaged
      const remainingStaged = await this.getStagedChanges();
      this.logger.debug(
        "Remaining staged files:",
        remainingStaged.map((f) => f.path),
      );

      // Validate unstaging worked
      const failedToUnstage = params.files.filter((file) =>
        remainingStaged.some((staged) => staged.path === file),
      );

      if (failedToUnstage.length > 0) {
        this.logger.error("Failed to unstage files:", failedToUnstage);
        throw new Error(
          `Failed to unstage files: ${failedToUnstage.join(", ")}`,
        );
      }
    } catch (error) {
      this.logger.error("Failed to unstage files:", error);
      throw error;
    }
  }

  async getDiffStats(params: { from: string; to: string }): Promise<{
    additions: number;
    deletions: number;
    files: number;
  }> {
    try {
      const output = await this.execGit({
        command: "diff",
        args: ["--numstat", params.from, params.to],
      });

      const changes: FileChange[] = this.parser.parseFileChanges({
        numstat: output,
      });
      return {
        additions: changes.reduce(
          (sum: number, file: FileChange) => sum + file.additions,
          0,
        ),
        deletions: changes.reduce(
          (sum: number, file: FileChange) => sum + file.deletions,
          0,
        ),
        files: changes.length,
      };
    } catch (error) {
      this.logger.error("Failed to get diff stats:", error);
      throw error;
    }
  }

  async getDiff(params: GetDiffParams): Promise<string> {
    try {
      if (params.type === "staged") {
        return await this.execGit({
          command: "diff",
          args: ["--cached"],
        });
      }

      if (params.type === "range" && params.from && params.to) {
        return await this.execGit({
          command: "diff",
          args: [params.from, params.to],
        });
      }

      throw new Error("Invalid diff parameters");
    } catch (error) {
      this.logger.error("Failed to get diff:", error);
      throw error;
    }
  }

  async getNewFiles(): Promise<FileChange[]> {
    try {
      const output = await this.execGit({
        command: "diff",
        args: ["--cached", "--name-status"],
      });

      return output
        .split("\n")
        .filter((line) => line.startsWith("A"))
        .map((line) => {
          const [, path] = line.split(/\s+/);
          return {
            path,
            additions: 0,
            deletions: 0,
            ...FileUtil.getFileType({ path }),
          };
        });
    } catch (error) {
      this.logger.error("Failed to get new files:", error);
      return [];
    }
  }

  private async attachFileChanges(params: {
    commits: Omit<CommitInfo, "files">[];
  }): Promise<CommitInfo[]> {
    try {
      this.logger.debug(
        `Attaching file changes for ${params.commits.length} commits`,
      );
      const commitsWithFiles: Promise<CommitInfo>[] = params.commits.map(
        async (commit) => ({
          ...commit,
          files: await this.getFileChanges({ commit: commit.hash }),
        }),
      );
      return Promise.all(commitsWithFiles);
    } catch (error) {
      this.logger.error("Failed to attach file changes:", error);
      throw error;
    }
  }

  private async getFileChanges(params: {
    commit: string;
  }): Promise<FileChange[]> {
    try {
      const output = await this.execGit({
        command: "show",
        args: ["--numstat", "--format=", params.commit],
      });

      const changes: FileChange[] = this.parser.parseFileChanges({
        numstat: output,
      });
      return changes;
    } catch (error) {
      this.logger.error(
        `Failed to get file changes for commit ${params.commit}:`,
        error,
      );
      throw error;
    }
  }

  async execGit(params: {
    command: string;
    args: string[];
    cwd?: string; // Add optional cwd parameter
  }): Promise<string> {
    try {
      if (!params.cwd && !this.cwd) {
        throw new Error("Git working directory not set");
      }

      const workingDir = params.cwd || this.cwd;

      // Escape special characters in args
      const escapedArgs = params.args.map((arg) => {
        if (
          arg.includes(" ") ||
          arg.includes("(") ||
          arg.includes(")") ||
          arg.includes(":")
        ) {
          return `"${arg.replace(/"/g, '\\"')}"`;
        }
        return arg;
      });

      this.logger.debug(`Executing git command in ${workingDir}:`, {
        command: params.command,
        args: escapedArgs,
      });

      const { stdout } = await execPromise(
        `git ${params.command} ${escapedArgs.join(" ")}`,
        {
          cwd: workingDir,
        },
      );
      return stdout;
    } catch (error) {
      this.logger.error(`Git command failed: ${params.command}`, error);
      throw error;
    }
  }

  async updateCommitMessage(params: {
    file: string;
    message: string;
  }): Promise<void> {
    try {
      this.logger.debug(`Updating commit message in ${params.file}`);
      await fs.writeFile(params.file, params.message, "utf-8");
      this.logger.debug("Commit message updated successfully");
    } catch (error) {
      this.logger.error("Failed to update commit message:", error);
      throw error;
    }
  }

  async getHooksPath(): Promise<string> {
    try {
      this.logger.debug("Getting git hooks path");
      const result = await this.execGit({
        command: "rev-parse",
        args: ["--git-path", "hooks"],
      });
      return result.trim();
    } catch (error) {
      this.logger.error("Failed to get hooks path:", error);
      throw error;
    }
  }

  async getUnstagedChanges(): Promise<FileChange[]> {
    try {
      this.logger.debug("Getting unstaged changes");
      const output = await this.execGit({
        command: "diff",
        args: ["--numstat"],
      });

      if (!output.trim()) {
        this.logger.debug("No unstaged changes found");
        return [];
      }

      const files = output
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [additions = "0", deletions = "0", path = ""] =
            line.split(/\s+/);
          return {
            path,
            additions: parseInt(additions, 10) || 0,
            deletions: parseInt(deletions, 10) || 0,
            ...FileUtil.getFileType({ path }),
          };
        });

      this.logger.debug("Unstaged files:", files);
      return files;
    } catch (error) {
      this.logger.error("Failed to get unstaged changes:", error);
      return [];
    }
  }

  async getUnstagedDiff(): Promise<string> {
    try {
      this.logger.debug("Getting unstaged diff");
      return await this.execGit({
        command: "diff",
        args: [],
      });
    } catch (error) {
      this.logger.error("Failed to get unstaged diff:", error);
      throw error;
    }
  }

  async getStagedDiffForAI(): Promise<string> {
    try {
      this.logger.debug("Getting staged diff for AI analysis");
      const stagedFiles = await this.getStagedChanges();
      const gitRoot = await this.getRepositoryRoot();

      this.logger.debug("Git directories:", {
        gitRoot: gitRoot.trim(),
        currentCwd: this.cwd,
      });

      // Get individual diffs and combine
      const diffs = await Promise.all(
        stagedFiles.map(async (file) => {
          try {
            const fileDiff = await this.execGit({
              command: "diff",
              args: ["--cached", "--", file.path],
            });

            this.logger.debug(`Diff result for ${file.path}:`, {
              length: fileDiff.length,
              preview: fileDiff.slice(0, 100) + "...",
            });

            return { path: file.path, diff: fileDiff };
          } catch (error) {
            this.logger.error(
              `Failed to get diff for file ${file.path}:`,
              error,
            );
            return { path: file.path, diff: "" };
          }
        }),
      );

      // Filter out empty diffs and combine
      const combinedDiff = diffs
        .filter((d) => d.diff.length > 0)
        .sort((a, b) => b.diff.length - a.diff.length)
        .slice(0, 10) // Limit to 10 most significant files
        .map((d) => d.diff)
        .join("\n");

      this.logger.debug("Final diff statistics:", {
        totalFiles: diffs.length,
        filesWithDiff: diffs.filter((d) => d.diff.length > 0).length,
        totalLength: combinedDiff.length,
        fileStats: diffs.map((d) => ({
          path: d.path,
          length: d.diff.length,
          hasContent: d.diff.length > 0,
        })),
      });

      return combinedDiff;
    } catch (error) {
      this.logger.error("Failed to get staged diff for AI:", error);
      throw error;
    }
  }

  async createCommit(params: { message: string }): Promise<void> {
    try {
      this.logger.debug("Creating commit with message:", params.message);
      await this.execGit({
        command: "commit",
        args: ["-m", params.message],
      });
      this.logger.debug("Commit created successfully");
    } catch (error) {
      this.logger.error("Failed to create commit:", error);
      throw error;
    }
  }

  async getDiffForBranch(params: { branch: string }): Promise<string> {
    try {
      this.logger.debug(`Getting diff for branch ${params.branch}`);
      const baseBranch = this.gitConfig.baseBranch || "main";

      const output = await this.execGit({
        command: "diff",
        args: [`${baseBranch}...${params.branch}`],
      });

      return output;
    } catch (error) {
      this.logger.error("Failed to get branch diff:", error);
      throw error;
    }
  }

  async renameBranch(params: { from: string; to: string }): Promise<void> {
    try {
      const { from, to } = params;
      this.logger.debug(`Renaming branch from "${from}" to "${to}"`);

      // Check if target branch name already exists
      const branches = await this.execGit({
        command: "branch",
        args: ["--list", to],
      });

      if (branches.trim()) {
        throw new Error(`Branch "${to}" already exists`);
      }

      // Rename the branch
      await this.execGit({
        command: "branch",
        args: ["-m", from, to],
      });

      // Check if the old branch was tracked remotely
      const remoteInfo = await this.execGit({
        command: "config",
        args: ["--get", `branch.${from}.remote`],
      }).catch(() => "");

      if (remoteInfo.trim()) {
        this.logger.debug("Branch was tracked remotely, updating remote...");

        // Delete the old branch from remote if it exists
        await this.execGit({
          command: "push",
          args: ["origin", "--delete", from],
        }).catch((error) => {
          this.logger.debug("Failed to delete old remote branch:", error);
        });

        // Push the new branch and set upstream
        await this.execGit({
          command: "push",
          args: ["-u", "origin", to],
        });

        this.logger.debug("Remote branch updated successfully");
      }

      this.logger.debug("Branch renamed successfully");
    } catch (error) {
      this.logger.error("Failed to rename branch:", error);
      throw new Error(
        `Failed to rename branch from "${params.from}" to "${params.to}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getBranchExists(params: { branch: string }): Promise<boolean> {
    try {
      const result = await this.execGit({
        command: "branch",
        args: ["--list", params.branch],
      });
      return Boolean(result.trim());
    } catch (error) {
      this.logger.error("Failed to check branch existence:", error);
      return false;
    }
  }
}
