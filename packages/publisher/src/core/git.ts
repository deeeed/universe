import path from "path";
import simpleGit, {
  DefaultLogFields,
  ListLogLine,
  SimpleGit,
  SimpleGitOptions,
} from "simple-git";
import type { GitConfig, PackageContext } from "../types/config";

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

  constructor(config: GitConfig, rootDir: string) {
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
  }

  async validateStatus(): Promise<void> {
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

    if (this.config.requireUpToDate) {
      await this.git.fetch(this.config.remote);
      const currentBranch = status.current || "";
      const tracking = status.tracking;

      if (!currentBranch) {
        throw new Error("Not currently on any branch");
      }

      if (!tracking) {
        throw new Error(
          `Branch ${currentBranch} is not tracking a remote branch. ` +
            `To fix this, run: git branch --set-upstream-to=${this.config.remote}/${currentBranch} ${currentBranch}`,
        );
      }

      if (status.behind > 0) {
        throw new Error(
          `Branch ${currentBranch} is behind ${tracking} by ${status.behind} commits`,
        );
      }
    }

    if (this.config.allowedBranches?.length > 0) {
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

  async createTag(context: PackageContext): Promise<string> {
    if (!context.newVersion) {
      throw new Error("New version is required to create a tag");
    }

    const tagName = `${context.name}@${context.newVersion}`;
    const message =
      this.config.tagMessage ?? `Release ${context.name}@${context.newVersion}`;
    await this.git.addAnnotatedTag(tagName, message);
    return tagName;
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

  async push(): Promise<void> {
    await this.git.push(this.config.remote, undefined, ["--follow-tags"]);
  }
}
