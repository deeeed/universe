import {
  CommitInfo,
  CommitType,
  FileChange,
  ParsedCommit,
} from "../types/git.types.js";

export class CommitParser {
  parseCommitLog(params: { log: string }): Omit<CommitInfo, "files">[] {
    const commits: Omit<CommitInfo, "files">[] = [];
    const entries = params.log.split("--END--").filter((entry) => entry.trim());

    for (const entry of entries) {
      const [hash, author, dateStr, ...messageLines] = entry.trim().split("\n");
      const message = messageLines.join("\n").trim();

      if (hash && author && dateStr && message) {
        commits.push({
          hash,
          author,
          date: new Date(dateStr),
          message,
          parsed: this.parseCommitMessage({ message }),
        });
      }
    }

    return commits;
  }

  parseFileChanges(params: { numstat: string }): FileChange[] {
    const changes: FileChange[] = [];
    const lines = params.numstat
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    for (const line of lines) {
      const [additions, deletions, path] = line.trim().split(/\s+/);

      if (path) {
        changes.push({
          path,
          additions: parseInt(additions, 10) || 0,
          deletions: parseInt(deletions, 10) || 0,
          isTest: this.isTestFile(path),
          isConfig: this.isConfigFile(path),
        });
      }
    }

    return changes;
  }

  private parseCommitMessage(params: { message: string }): ParsedCommit {
    const pattern =
      /^(?<type>feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?: (?<description>.+)(?:\n\n(?<body>[\s\S]+))?$/;

    const match = params.message.match(pattern);

    if (!match?.groups) {
      return {
        type: "chore",
        scope: null,
        description: params.message,
        body: null,
        breaking: false,
      };
    }

    const { type, scope, breaking, description, body } = match.groups;

    return {
      type: type as CommitType,
      scope: scope || null,
      description: description.trim(),
      body: body?.trim() || null,
      breaking: Boolean(breaking),
    };
  }

  private isTestFile(path: string): boolean {
    return /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(path);
  }

  private isConfigFile(path: string): boolean {
    return (
      /\.(json|ya?ml|config\.(js|ts))$/.test(path) ||
      path.includes("tsconfig") ||
      path.includes(".eslintrc") ||
      path.includes(".prettierrc")
    );
  }
}
