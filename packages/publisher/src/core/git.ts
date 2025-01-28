import path from "path";
import simpleGit, { SimpleGit, SimpleGitOptions, DiffResult } from "simple-git";
import type { GitConfig, PackageContext } from "../types/config";
import { Logger } from "../utils/logger";
import { formatGitTag } from "../utils/format-tag";

export interface GitCommit {
  hash: string;
  date: string;
  message: string;
  body: string | null;
  files: string[];
}

export interface GetCommitsOptions {
  packageName?: string;
  packagePath?: string;
  filterByPath?: boolean;
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
    this.logger = logger ?? new Logger();
  }

  async validateStatus(options?: {
    skipUpstreamTracking?: boolean;
    force?: boolean;
    allowBranch?: boolean;
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
      (options?.skipUpstreamTracking ?? !this.config.requireUpToDate)
    ) {
      this.logger.debug("Skipping remote checks for untracked branch");
      return;
    }

    if (this.config.requireUpToDate) {
      await this.git.fetch(this.config.remote);
      const currentBranch = status.current ?? "";

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

    if (
      this.config.allowedBranches?.length &&
      !options?.force &&
      !options?.allowBranch
    ) {
      const currentBranch = status.current ?? "";
      if (!this.config.allowedBranches.includes(currentBranch)) {
        throw new Error(
          `Current branch ${currentBranch} is not in allowed branches: ${this.config.allowedBranches.join(", ")}.\n\n` +
            `To proceed anyway, you can:\n` +
            `1. Switch to an allowed branch\n` +
            `2. Run with --allow-branch to bypass branch restrictions`,
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
    const commits = await this.getCommitsSinceTag(lastTag, {
      packagePath,
    });

    return commits.length > 0;
  }

  async getLastTag(packageName: string): Promise<string> {
    const tags = await this.git.tags();
    const packageTags = tags.all
      .filter((tag) => tag.startsWith(`${packageName}@`))
      .sort((a, b) => {
        const versionA = a.split("@").pop() ?? "";
        const versionB = b.split("@").pop() ?? "";
        return this.compareVersions(versionB, versionA);
      });

    return packageTags.length > 0 ? packageTags[0] : "";
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split(".").map(Number);
    const partsB = b.split(".").map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA !== numB) {
        return numA - numB;
      }
    }
    return 0;
  }

  public extractFilePaths(diff: DiffResult | undefined): string[] {
    if (!diff?.files) return [];

    return diff.files
      .map((file) => {
        if (typeof file === "string") return file;

        // Type guard for objects with path or file property
        if (typeof file === "object" && file !== null) {
          if ("path" in file && typeof file.path === "string") {
            return file.path;
          }
          if ("file" in file && typeof file.file === "string") {
            return file.file;
          }
        }

        // Fallback for unexpected formats
        return "";
      })
      .filter(Boolean); // Remove empty strings
  }

  async getCommitsSinceTag(
    tag: string,
    options?: GetCommitsOptions,
  ): Promise<GitCommit[]> {
    try {
      if (!tag) {
        this.logger.info("No previous tag found. Getting all commits instead.");
        return this.getAllCommits();
      }

      // First verify we can get commits with a simple command
      const verifyCommand = ["log", "-1", "--oneline"];
      const verifyResult = await this.git.raw(verifyCommand);
      this.logger.debug("Verify git command result:", {
        command: verifyCommand.join(" "),
        result: verifyResult,
      });

      // Then try our actual command with modified format
      const logOptions = [
        "log",
        `--format=COMMIT%n%H%n%aI%n%s%n%b%nFILES`,
        "--name-only",
        `${tag}..HEAD`,
      ];

      this.logger.debug("Getting commits with command:", {
        command: logOptions.join(" "),
        tag,
        options,
        fullCommand: logOptions.join(" "),
      });

      const result = await this.git.raw(logOptions);

      this.logger.debug("Git log result:", {
        resultLength: result?.length || 0,
        firstLines: result?.split("\n").slice(0, 5),
        isEmpty: !result,
      });

      if (!result) return [];

      // Split by COMMIT marker first
      const commits: GitCommit[] = [];
      const commitChunks = result.split("\nCOMMIT\n").filter(Boolean);

      for (const chunk of commitChunks) {
        // Split each chunk into commit data and files
        const [commitData, filesList] = chunk.split("\nFILES\n");
        const lines = commitData.split("\n").filter(Boolean);

        this.logger.debug("Processing chunk:", {
          commitLines: lines,
          files: filesList?.split("\n").filter(Boolean) || [],
        });

        // Skip the COMMIT marker if it's in the lines
        const startIndex = lines[0] === "COMMIT" ? 1 : 0;
        if (lines.length < startIndex + 3) continue;

        const hash = lines[startIndex];
        const date = lines[startIndex + 1];
        const message = lines[startIndex + 2];
        const bodyLines = lines.slice(startIndex + 3);
        const files = filesList?.split("\n").filter(Boolean) || [];

        const commit = {
          hash,
          date,
          message,
          body: bodyLines.length > 0 ? bodyLines.join("\n") : null,
          files,
        };

        this.logger.debug("Parsed commit:", commit);
        commits.push(commit);
      }

      this.logger.debug("All parsed commits before filtering:", {
        totalCommits: commits.length,
        commits: commits.map((c) => ({
          hash: c.hash.slice(0, 7),
          message: c.message,
          filesCount: c.files.length,
        })),
      });

      // Apply filters with OR logic
      if (options) {
        let filteredCommits = commits;
        const matchedByPath = new Set<string>();
        const matchedByName = new Set<string>();

        // Always check path if packagePath is provided
        if (options.packagePath) {
          const relativePath = path.relative(this.rootDir, options.packagePath);
          this.logger.debug("Filtering by path:", {
            relativePath,
            originalCount: filteredCommits.length,
          });

          filteredCommits.forEach((commit) => {
            const hasMatchingFiles = commit.files.some((file) =>
              file.startsWith(relativePath),
            );
            this.logger.debug("Path filter check:", {
              hash: commit.hash.slice(0, 7),
              hasMatchingFiles,
              matchingFiles: commit.files.filter((f) =>
                f.startsWith(relativePath),
              ),
            });
            if (hasMatchingFiles) {
              matchedByPath.add(commit.hash);
            }
          });
        }

        // Check package name if provided
        if (options.packageName) {
          this.logger.debug("Filtering by package name:", {
            packageName: options.packageName,
            originalCount: filteredCommits.length,
          });

          filteredCommits.forEach((commit) => {
            const messageIncludes = commit.message.includes(
              `(${options.packageName})`,
            );
            const bodyIncludes = commit.body?.includes(
              `(${options.packageName})`,
            );
            const matches = messageIncludes || bodyIncludes;

            this.logger.debug("Package name filter check:", {
              hash: commit.hash.slice(0, 7),
              message: commit.message,
              matches,
              messageIncludes,
              bodyIncludes,
            });

            if (matches) {
              matchedByName.add(commit.hash);
            }
          });
        }

        // Filter commits that match either condition
        filteredCommits = filteredCommits.filter(
          (commit) =>
            matchedByPath.has(commit.hash) || matchedByName.has(commit.hash),
        );

        this.logger.debug("Commits after filtering:", {
          originalCount: commits.length,
          filteredCount: filteredCommits.length,
          matchedByPath: Array.from(matchedByPath).length,
          matchedByName: Array.from(matchedByName).length,
          commits: filteredCommits.map((c) => ({
            hash: c.hash.slice(0, 7),
            message: c.message,
            filesCount: c.files.length,
            matchedBy: [
              matchedByPath.has(c.hash) ? "path" : null,
              matchedByName.has(c.hash) ? "name" : null,
            ]
              .filter(Boolean)
              .join(", "),
          })),
        });

        return filteredCommits;
      }

      return commits;
    } catch (error) {
      this.logger.error(`Failed to get commits since tag ${tag}:`, error);
      return [];
    }
  }

  getTagName(packageName: string, version: string): string {
    return formatGitTag({
      packageName,
      version,
      tagPrefix: this.config.tagPrefix,
    });
  }

  async createTag(context: PackageContext, force?: boolean): Promise<string> {
    if (!context.newVersion) {
      throw new Error("Version is required to create a tag");
    }

    const tagName = this.getTagName(context.name, context.newVersion);
    const tagMessage = this.config.tagMessage ?? `Release ${tagName}`;

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

  async commitChanges(
    context: PackageContext,
    changelogPath: string,
  ): Promise<void> {
    if (!context.newVersion) {
      throw new Error("New version is required to create a commit message");
    }

    const relativePackagePath = path.relative(this.rootDir, context.path);
    const relativeChangelogPath = path.relative(this.rootDir, changelogPath);

    const filesToAdd = [
      path.join(relativePackagePath, "package.json"),
      relativeChangelogPath,
    ].filter(Boolean);

    try {
      // Add files
      await this.git.add(filesToAdd);

      // Create commit with the configured message
      const commitMessage = this.config.commitMessage
        .replace("${packageName}", context.name)
        .replace("${version}", context.newVersion);

      await this.git.commit(commitMessage);
    } catch (error) {
      throw new Error(
        `Failed to commit changes: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
    return status.current ?? "";
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

  async getAllCommits(): Promise<GitCommit[]> {
    try {
      const logOptions = [
        "log",
        `--format=COMMIT%n%H%n%aI%n%s%n%b%nFILES`, // Use same format as getCommitsSinceTag
        "--name-only", // Correct flag for showing changed files
      ];

      this.logger.debug("Getting all commits with command:", {
        command: logOptions.join(" "),
      });

      const result = await this.git.raw(logOptions);

      if (!result) {
        this.logger.info("No commits found in repository");
        return [];
      }

      // Use the same parsing logic as getCommitsSinceTag
      const commits: GitCommit[] = [];
      const commitChunks = result.split("\nCOMMIT\n").filter(Boolean);

      for (const chunk of commitChunks) {
        const [commitData, filesList] = chunk.split("\nFILES\n");
        const lines = commitData.split("\n").filter(Boolean);

        const startIndex = lines[0] === "COMMIT" ? 1 : 0;
        if (lines.length < startIndex + 3) continue;

        const hash = lines[startIndex];
        const date = lines[startIndex + 1];
        const message = lines[startIndex + 2];
        const bodyLines = lines.slice(startIndex + 3);
        const files = filesList?.split("\n").filter(Boolean) || [];

        commits.push({
          hash,
          date,
          message,
          body: bodyLines.length > 0 ? bodyLines.join("\n") : null,
          files,
        });
      }

      this.logger.debug("Successfully parsed all commits:", {
        totalCommits: commits.length,
      });

      return commits;
    } catch (error) {
      this.logger.error("Failed to get all commits:", error);
      return [];
    }
  }
}
