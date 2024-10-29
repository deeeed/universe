import path from "path";
import simpleGit, {
  DefaultLogFields,
  ListLogLine,
  SimpleGit,
  SimpleGitOptions,
} from "simple-git";
import type { GitConfig, PackageContext } from "../types/config";
import { Logger } from "../utils/logger";

export interface GitCommit {
  hash: string;
  date: string;
  message: string;
  body: string | null;
  files: string[];
}

export class GitService {
  private git: SimpleGit;
  private rootDir: string;
  private config: GitConfig;
  private logger: Logger;

  constructor(config: GitConfig, rootDir: string, logger?: Logger) {
    const gitOptions: SimpleGitOptions = {
      baseDir: rootDir,
      binary: "git",
      maxConcurrentProcesses: 6,
      config: [],
      trimmed: false,
    };

    this.git = simpleGit(gitOptions);
    this.rootDir = rootDir;
    this.config = config;
    this.logger = logger || new Logger();
  }

  async validateStatus(options?: {
    skipUpstreamTracking?: boolean;
    force?: boolean;
  }): Promise<void> {
    const status = await this.git.status();

    if (this.config.requireCleanWorkingDirectory && !status.isClean()) {
      const files = status.files.map((f) => f.path).join("\n- ");
      throw new Error(
        `Working directory is not clean. The following files have changes:\n- ${files}\n\n` +
          `To proceed anyway, you can:\n` +
          `1. Commit or stash your changes\n` +
          `2. Run with --no-git-check to skip this check`,
      );
    }

    if (
      !status.tracking &&
      (options?.skipUpstreamTracking || !this.config.requireUpToDate)
    ) {
      this.logger.debug("Skipping remote checks for untracked branch");
      return;
    }

    if (this.config.requireUpToDate) {
      await this.git.fetch(this.config.remote);
      const currentBranch = status.current || "";

      if (!currentBranch) {
        throw new Error("Not currently on any branch");
      }

      if (status.tracking && status.behind > 0 && !options?.force) {
        throw new Error(
          `Branch ${currentBranch} is behind ${status.tracking} by ${status.behind} commits.\n` +
            `Please run 'git pull' to update your local branch or use --force to override.`,
        );
      }
    }

    if (this.config.allowedBranches?.length && !options?.force) {
      const currentBranch = status.current || "";
      if (!this.config.allowedBranches.includes(currentBranch)) {
        throw new Error(
          `Current branch ${currentBranch} is not in allowed branches: ${this.config.allowedBranches.join(", ")}`,
        );
      }
    }
  }

  async hasChanges(packagePath: string): Promise<boolean> {
    const relativePath = path.relative(this.rootDir, packagePath);
    const status = await this.git.status();

    const hasUncommittedChanges = status.files.some((file) =>
      file.path.startsWith(relativePath),
    );

    if (hasUncommittedChanges) {
      return true;
    }

    const lastTag = await this.getLastTag(path.basename(packagePath));
    const commits = await this.getCommitsSinceTag(lastTag);

    return commits.some((commit) =>
      commit.files.some((file) => file.startsWith(relativePath)),
    );
  }

  async getLastTag(packageName: string): Promise<string> {
    const tags = await this.git.tags();
    const packageTags = tags.all.filter(
      (tag) => tag.includes(packageName) || tag.startsWith("v"),
    );

    return packageTags.length > 0 ? packageTags[packageTags.length - 1] : "";
  }

  async getCommitsSinceTag(tag: string): Promise<GitCommit[]> {
    if (!tag) {
      const log = await this.git.log();
      return this.parseCommits([...log.all]);
    }

    const log = await this.git.log({ from: tag });
    return this.parseCommits([...log.all]);
  }

  private async parseCommits(
    commits: Array<DefaultLogFields & ListLogLine>,
  ): Promise<GitCommit[]> {
    return Promise.all(
      commits.map(async (commit) => {
        const show = await this.git.show([
          commit.hash,
          "--name-only",
          "--format=%H%n%ai%n%B",
        ]);
        const [hash, date, ...rest] = show.split("\n");
        const messageEnd = rest.findIndex((line) => line === "");
        const message = rest.slice(0, messageEnd).join("\n");
        const body = rest.slice(messageEnd + 1, -1).join("\n") || null;
        const files = rest.slice(-1);

        return {
          hash,
          date,
          message,
          body,
          files,
        };
      }),
    );
  }

  async createTag(context: PackageContext, force?: boolean): Promise<string> {
    if (!context.newVersion) {
      throw new Error("Version is required to create a tag");
    }

    const tagName = `${context.name}@${context.newVersion}`;
    const tagMessage = `Release ${tagName}`;

    try {
      const tagExists = await this.checkTagExists(tagName);

      if (tagExists) {
        if (force) {
          await this.deleteTag(tagName, true);
        } else {
          throw new Error(
            `Tag ${tagName} already exists. Use --force to overwrite or manually delete the tag with:\n\n` +
              `  git tag -d ${tagName}\n` +
              `  git push ${this.config.remote} :refs/tags/${tagName}`,
          );
        }
      }

      await this.git.addAnnotatedTag(tagName, tagMessage);
      return tagName;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("already exists")) {
        throw new Error(
          `Tag ${tagName} already exists. Use --force to overwrite or manually delete the tag with:\n\n` +
            `  git tag -d ${tagName}\n` +
            `  git push ${this.config.remote} :refs/tags/${tagName}`,
        );
      }
      throw error;
    }
  }

  async commitChanges(context: PackageContext): Promise<string> {
    if (!context.newVersion) {
      throw new Error("New version is required to create a commit message");
    }

    const message = this.config.commitMessage
      .replace("${packageName}", context.name)
      .replace("${version}", context.newVersion);

    await this.git.add(path.relative(this.rootDir, context.path));
    const result = await this.git.commit(message);
    return result.commit;
  }

  async push(force?: boolean): Promise<void> {
    try {
      const status = await this.git.status();
      const currentBranch = status.current;

      if (!currentBranch) {
        throw new Error("Not currently on any branch");
      }

      // Prepare options
      const options = ["--follow-tags"];
      if (force) {
        options.push("--force");
      }

      // Set upstream if branch is not tracking
      if (!status.tracking) {
        this.logger.debug(
          `Setting upstream for untracked branch ${currentBranch}`,
        );
        options.push("--set-upstream");
      }

      // Push to remote with the correct arguments
      await this.git.push(this.config.remote, currentBranch, options);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Push failed. Your branch is out of sync with remote.\n` +
          `To force push, run with --force flag or manually:\n` +
          `  git push --force ${this.config.remote} ${await this.getCurrentBranch()}\n\n` +
          `Original error: ${errorMessage}`,
      );
    }
  }

  private async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current || "";
  }

  async checkTagExists(tagName: string): Promise<boolean> {
    try {
      await this.git.raw(["rev-parse", `refs/tags/${tagName}`]);
      return true;
    } catch {
      return false;
    }
  }

  async deleteTag(tagName: string, remote?: boolean): Promise<void> {
    // First check if local tag exists before trying to delete
    const localTagExists = await this.checkTagExists(tagName);

    try {
      // Only try to delete local tag if it exists
      if (localTagExists) {
        await this.git.raw(["tag", "-d", tagName]);
      }

      // For remote tags, we can try to delete even if local doesn't exist
      // as there might be only a remote tag
      if (remote && this.config.remote) {
        try {
          await this.git.raw([
            "push",
            this.config.remote,
            ":refs/tags/" + tagName,
          ]);
        } catch (error) {
          // Ignore errors from remote tag deletion as it might not exist
          // and that's okay
        }
      }
    } catch (error) {
      // Only throw if we tried to delete a local tag that existed
      if (localTagExists) {
        throw new Error(
          `Failed to delete tag ${tagName}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async runGitCommand(args: string[]): Promise<string> {
    try {
      const result = await this.git.raw(args);
      return result.trim();
    } catch (error) {
      throw new Error(
        `Git command failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getCurrentCommitHash(): Promise<string> {
    const result: string = await this.runGitCommand(["rev-parse", "HEAD"]);
    return result;
  }

  async resetToCommit(commitHash: string): Promise<void> {
    await this.runGitCommand(["reset", "--hard", commitHash]);
  }
}
