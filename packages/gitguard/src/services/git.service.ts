import { BaseService } from "./base.service";
import { GitConfig, GitCommandParams } from "../types/git.types";
import { CommitInfo, FileChange } from "../types/commit.types";
import { CommitParser } from "../utils/commit-parser.util";
import { ServiceOptions } from "../types/service.types";

export class GitService extends BaseService {
  private parser: CommitParser;
  private readonly gitConfig: GitConfig;

  constructor(params: ServiceOptions & { config: GitConfig }) {
    super(params);
    this.gitConfig = params.config;
    this.parser = new CommitParser();
    this.logger.debug("GitService initialized with config:", this.gitConfig);
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

  private async attachFileChanges(params: {
    commits: Omit<CommitInfo, "files">[];
  }): Promise<CommitInfo[]> {
    try {
      this.logger.debug(
        `Attaching file changes for ${params.commits.length} commits`,
      );
      return Promise.all(
        params.commits.map(async (commit) => ({
          ...commit,
          files: await this.getFileChanges({ commit: commit.hash }),
        })),
      );
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

      return this.parser.parseFileChanges({ numstat: output });
    } catch (error) {
      this.logger.error(
        `Failed to get file changes for commit ${params.commit}:`,
        error,
      );
      throw error;
    }
  }

  private async execGit(params: GitCommandParams): Promise<string> {
    const command = `git ${params.command} ${params.args.join(" ")}`;
    this.logger.debug(`Executing git command: ${command}`);

    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        this.logger.warning("Git command produced stderr:", stderr);
      }

      return stdout;
    } catch (error) {
      this.logger.error(`Git command failed: ${command}`, error);
      throw error;
    }
  }
}
