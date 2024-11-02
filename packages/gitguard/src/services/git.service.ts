// packages/gitguard/src/services/git.service.ts
import execa from "execa";
import {
  CommitInfo,
  FileChange,
  GitCommandParams,
  GitConfig,
} from "../types/git.types";
import { ServiceOptions } from "../types/service.types";
import { CommitParser } from "../utils/commit-parser.util";
import { BaseService } from "./base.service";

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
      const { stdout } = await execa("git", ["diff", "--cached", "--numstat"], {
        cwd: this.cwd,
      });

      if (!stdout.trim()) {
        this.logger.debug("No staged changes found");
        return [];
      }

      const files = stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [additions = "0", deletions = "0", path = ""] =
            line.split(/\s+/);
          return {
            path,
            additions: parseInt(additions, 10) || 0,
            deletions: parseInt(deletions, 10) || 0,
            isTest: this.isTestFile(path),
            isConfig: this.isConfigFile(path),
          };
        });

      this.logger.debug("Staged files:", files);
      return files;
    } catch (error) {
      this.logger.error("Failed to get staged changes:", error);
      return [];
    }
  }

  private isTestFile(path: string): boolean {
    return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(path);
  }

  private isConfigFile(path: string): boolean {
    return /\.(json|ya?ml|env|config)\.(ts|js)?$/.test(path);
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
      const result = await this.execGit({
        command: "ls-files",
        args: [`${root}/packages`],
      });
      return result.trim().length > 0;
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
      await this.execGit({
        command: "reset",
        args: ["HEAD", ...params.files],
      });
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

  async getDiff(params: { from: string; to: string }): Promise<string> {
    try {
      this.logger.debug(`Getting diff between ${params.from} and ${params.to}`);
      return await this.execGit({
        command: "diff",
        args: [params.from, params.to],
      });
    } catch (error) {
      this.logger.error("Failed to get diff:", error);
      throw error;
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

  private async execGit(params: GitCommandParams): Promise<string> {
    const { command, args } = params;
    this.logger.debug(
      `Executing git command: git ${command} ${args.join(" ")} in ${this.cwd}`,
    );

    try {
      const { stdout, stderr } = await execa("git", [command, ...args], {
        cwd: this.cwd,
      });

      if (stderr) {
        this.logger.warning("Git command produced stderr:", stderr);
      }

      return stdout;
    } catch (error) {
      this.logger.error(
        `Git command failed: git ${command} ${args.join(" ")}`,
        error,
      );
      throw error;
    }
  }
}
