// packages/gitguard/src/services/git.service.ts
import * as fs from "fs/promises";
import { GitConfig, RuntimeGitConfig } from "../types/config.types.js";
import { CommitInfo, FileChange } from "../types/git.types.js";
import { ServiceOptions } from "../types/service.types.js";
import { CommitParser } from "../utils/commit-parser.util.js";
import { formatDiffForAI } from "../utils/diff.util.js";
import { FileUtil } from "../utils/file.util.js";
import {
  determineDefaultBranch,
  execGit,
  getGitRootSync,
  isGitRepositorySync,
} from "../utils/git.util.js";
import { BaseService } from "./base.service.js";

interface GetDiffParams {
  type: "staged" | "range";
  from?: string;
  to?: string;
}

export class GitService extends BaseService {
  private readonly parser: CommitParser;
  private readonly gitConfig: RuntimeGitConfig;
  private readonly cwd: string;

  constructor(params: ServiceOptions & { gitConfig: RuntimeGitConfig }) {
    super(params);
    this.gitConfig = params.gitConfig;
    this.parser = new CommitParser();
    this.cwd =
      this.gitConfig.cwd ?? getGitRootSync({ cwd: this.gitConfig.cwd });

    // Use sync versions for initialization
    if (!isGitRepositorySync({ cwd: this.gitConfig.cwd })) {
      throw new Error("Not a git repository");
    }

    this.logger.debug("GitService initialized with config:", this.gitConfig);
    this.logger.debug("Working directory:", this.cwd);
  }

  public get config(): GitConfig {
    return this.gitConfig;
  }

  async getCurrentBranch(): Promise<string> {
    try {
      this.logger.debug("Getting current branch");

      // First check if there are any commits
      const hasCommits = await this.execGit({
        command: "rev-parse",
        args: ["--verify", "HEAD"],
        cwd: this.cwd,
      }).catch(() => false);

      if (!hasCommits) {
        // Use determineDefaultBranch with cwd
        const defaultBranch = await determineDefaultBranch({
          command: "rev-parse",
          args: ["--abbrev-ref", "HEAD"],
          cwd: this.cwd,
          logger: this.logger,
        });
        this.logger.debug(
          `No commits yet, returning default branch: ${defaultBranch}`,
        );
        return defaultBranch;
      }

      const result = await this.execGit({
        command: "rev-parse",
        args: ["--abbrev-ref", "HEAD"],
        cwd: this.cwd,
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
        cwd: this.cwd,
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

      // First get status to identify renamed files
      const statusOutput = await this.execGit({
        command: "status",
        args: ["--porcelain"],
        cwd: this.cwd,
      });

      // Parse status to identify renamed files
      const renamedFiles = new Map<
        string,
        { oldPath: string; newPath: string }
      >();
      statusOutput.split("\n").forEach((line) => {
        if (line.startsWith("R")) {
          const parts = line
            .slice(3)
            .split(/->|\s+/)
            .map((p) => p.trim())
            .filter(Boolean);
          if (parts.length >= 2) {
            const [oldPath, newPath] = parts;
            renamedFiles.set(newPath, { oldPath, newPath });
          }
        }
      });

      // Get numstat for all changes
      const numstatOutput = await this.execGit({
        command: "diff",
        args: ["--cached", "--numstat"],
        cwd: this.cwd,
      });

      const files = numstatOutput
        .split("\n")
        .filter(Boolean)
        .flatMap((line) => {
          const [additions = "0", deletions = "0", rawPath = ""] =
            line.split(/\t/);

          // Handle the "old => new" format in numstat output
          if (rawPath.includes("=>")) {
            let [oldPathShort, newPathShort] = rawPath
              .split(/\s*=>\s*/)
              .map((p) => p.trim());

            oldPathShort = oldPathShort.replace("{", "");
            newPathShort = newPathShort.replace("}", "");
            // Find the full paths from renamedFiles using the new path
            const rename = Array.from(renamedFiles.values()).find(
              (r) =>
                r.newPath.endsWith(newPathShort) ||
                r.oldPath.endsWith(oldPathShort),
            );

            const oldPath = rename?.oldPath ?? oldPathShort;
            const newPath = rename?.newPath ?? newPathShort;

            return [
              {
                path: oldPath,
                status: "deleted",
                additions: 0,
                deletions: 1,
                ...FileUtil.getFileType({ path: oldPath }),
              },
              {
                path: newPath,
                status: "added",
                additions: 1,
                deletions: 0,
                ...FileUtil.getFileType({ path: newPath }),
              },
            ];
          }

          // Handle normal files
          return [
            {
              path: rawPath,
              additions: parseInt(additions, 10) || 0,
              deletions: parseInt(deletions, 10) || 0,
              ...FileUtil.getFileType({ path: rawPath }),
            },
          ];
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
        cwd: this.cwd,
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

  public getCWD(): string {
    return this.cwd;
  }

  async isMonorepo(): Promise<boolean> {
    try {
      // Check if we're in a git repo first
      if (!isGitRepositorySync({ cwd: this.cwd })) {
        return false;
      }

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
            cwd: this.cwd,
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
            cwd: this.cwd,
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
        cwd: this.cwd,
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
          cwd: this.cwd,
        });
      }

      if (params.type === "range" && params.from && params.to) {
        return await this.execGit({
          command: "diff",
          args: [params.from, params.to],
          cwd: this.cwd,
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
        cwd: this.cwd,
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

      // Get all commit hashes
      const hashes = params.commits.map((commit) => commit.hash);

      // Get file changes for all commits in a single command
      const output = await this.execGit({
        command: "show",
        args: [
          "--numstat",
          "--format=%H", // Include commit hash as delimiter
          ...hashes,
        ],
        cwd: this.cwd,
      });

      // Split output by commit hash and parse changes
      const changesByCommit = new Map<string, FileChange[]>();
      let currentHash = "";
      let currentChanges: string[] = [];

      output.split("\n").forEach((line) => {
        if (/^[0-9a-f]{40}$/.exec(line)) {
          // This is a commit hash line
          if (currentHash && currentChanges.length) {
            changesByCommit.set(
              currentHash,
              this.parser.parseFileChanges({
                numstat: currentChanges.join("\n"),
              }),
            );
          }
          currentHash = line;
          currentChanges = [];
        } else if (line.trim()) {
          currentChanges.push(line);
        }
      });

      // Handle last commit
      if (currentHash && currentChanges.length) {
        changesByCommit.set(
          currentHash,
          this.parser.parseFileChanges({
            numstat: currentChanges.join("\n"),
          }),
        );
      }

      // Map the changes back to commits
      return params.commits.map((commit) => ({
        ...commit,
        files: changesByCommit.get(commit.hash) ?? [],
      }));
    } catch (error) {
      this.logger.error("Failed to attach file changes:", error);
      throw error;
    }
  }

  async execGit(params: {
    command: string;
    args: string[];
    cwd?: string;
  }): Promise<string> {
    return execGit({
      ...params,
      logger: this.logger,
      cwd: params.cwd ?? this.cwd,
    });
  }

  async updateCommitMessage(params: {
    message: string;
    messageFile?: string;
  }): Promise<void> {
    try {
      this.logger.debug("Updating commit message:", params.message);

      if (params.messageFile) {
        // If message file is provided, write to it
        await fs.writeFile(params.messageFile, params.message, "utf-8");
        await this.execGit({
          command: "commit",
          args: ["-F", params.messageFile],
          cwd: this.cwd,
        });
      } else {
        // For direct message, properly escape and quote
        await this.execGit({
          command: "commit",
          args: ["-m", params.message], // execGit will handle escaping
          cwd: this.cwd,
        });
      }
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
        cwd: this.cwd,
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

      // First get status to identify renamed files
      const statusOutput = await this.execGit({
        command: "status",
        args: ["--porcelain"],
        cwd: this.cwd,
      });

      // Parse status to identify renamed files
      const renamedFiles = new Map<
        string,
        { oldPath: string; newPath: string }
      >();
      statusOutput.split("\n").forEach((line) => {
        if (line.startsWith(" R")) {
          // Space R indicates unstaged rename
          const parts = line
            .slice(3)
            .split(/->|\s+/)
            .map((p) => p.trim())
            .filter(Boolean);
          if (parts.length >= 2) {
            const [oldPath, newPath] = parts;
            renamedFiles.set(newPath, { oldPath, newPath });
          }
        }
      });

      // Get numstat for all changes
      const numstatOutput = await this.execGit({
        command: "diff",
        args: ["--numstat"],
        cwd: this.cwd,
      });

      const files = numstatOutput
        .split("\n")
        .filter(Boolean)
        .flatMap((line): FileChange[] => {
          const [additions = "0", deletions = "0", rawPath = ""] =
            line.split(/\t/);

          // Handle the "old => new" format in numstat output
          if (rawPath.includes("=>")) {
            let [oldPathShort, newPathShort] = rawPath
              .split(/\s*=>\s*/)
              .map((p) => p.trim());

            oldPathShort = oldPathShort.replace("{", "");
            newPathShort = newPathShort.replace("}", "");
            // Find the full paths from renamedFiles using the new path
            const rename = Array.from(renamedFiles.values()).find(
              (r) =>
                r.newPath.endsWith(newPathShort) ||
                r.oldPath.endsWith(oldPathShort),
            );

            const oldPath = rename?.oldPath ?? oldPathShort;
            const newPath = rename?.newPath ?? newPathShort;

            return [
              {
                path: oldPath,
                status: "deleted" as const,
                additions: 0,
                deletions: 1,
                ...FileUtil.getFileType({ path: oldPath }),
              },
              {
                path: newPath,
                status: "added" as const,
                additions: 1,
                deletions: 0,
                ...FileUtil.getFileType({ path: newPath }),
              },
            ];
          }

          // Handle normal files
          return [
            {
              path: rawPath,
              status: "modified" as const,
              additions: parseInt(additions, 10) || 0,
              deletions: parseInt(deletions, 10) || 0,
              ...FileUtil.getFileType({ path: rawPath }),
            },
          ];
        });

      // Get untracked files
      const untrackedOutput = await this.execGit({
        command: "ls-files",
        args: ["--others", "--exclude-standard"],
        cwd: this.cwd,
      });

      // Add untracked files to the result
      if (untrackedOutput.trim()) {
        const untrackedFiles = untrackedOutput
          .split("\n")
          .filter(Boolean)
          .map((path) => ({
            path: path.trim(),
            additions: 0,
            deletions: 0,
            status: "untracked" as const,
            ...FileUtil.getFileType({ path }),
          }));
        files.push(...untrackedFiles);
      }

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
        cwd: this.cwd,
      });
    } catch (error) {
      this.logger.error("Failed to get unstaged diff:", error);
      throw error;
    }
  }

  async getStagedDiffForAI(): Promise<string> {
    try {
      this.logger.debug("Getting staged diff for AI analysis");

      // Get diff in a single command instead of per file
      const diff = await this.execGit({
        command: "diff",
        args: ["--cached", "--no-color"],
        cwd: this.cwd,
      });

      if (!diff) {
        this.logger.debug("No staged changes found");
        return "";
      }

      const files = await this.getStagedChanges();

      return formatDiffForAI({
        files,
        diff,
        maxLength: 8000,
        logger: this.logger,
      });
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
        cwd: this.cwd,
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
        cwd: this.cwd,
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
        cwd: this.cwd,
      });

      if (branches.trim()) {
        throw new Error(`Branch "${to}" already exists`);
      }

      // Rename the branch
      await this.execGit({
        command: "branch",
        args: ["-m", from, to],
        cwd: this.cwd,
      });

      // Check if the old branch was tracked remotely
      const remoteInfo = await this.execGit({
        command: "config",
        args: ["--get", `branch.${from}.remote`],
        cwd: this.cwd,
      }).catch(() => "");

      if (remoteInfo.trim()) {
        this.logger.debug("Branch was tracked remotely, updating remote...");

        // Delete the old branch from remote if it exists
        await this.execGit({
          command: "push",
          args: ["origin", "--delete", from],
          cwd: this.cwd,
        }).catch((error) => {
          this.logger.debug("Failed to delete old remote branch:", error);
        });

        // Push the new branch and set upstream
        await this.execGit({
          command: "push",
          args: ["-u", "origin", to],
          cwd: this.cwd,
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
        cwd: this.cwd,
      });
      return Boolean(result.trim());
    } catch (error) {
      this.logger.error("Failed to check branch existence:", error);
      return false;
    }
  }

  async getLocalBranches(): Promise<string[]> {
    try {
      this.logger.debug("Getting local branches");
      const output = await this.execGit({
        command: "branch",
        args: ["--format=%(refname:short)"],
        cwd: this.cwd,
      });

      const branches = output.split("\n").filter(Boolean);
      this.logger.debug(`Found ${branches.length} local branches`);
      return branches;
    } catch (error) {
      this.logger.error("Failed to get local branches:", error);
      throw error;
    }
  }
}
