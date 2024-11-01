import { CommitInfo, ParsedCommit, FileChange } from "../types/commit.types";

export class CommitParser {
  parseCommitLog(_params: { log: string }): Omit<CommitInfo, "files">[] {
    // Implementation
    return [];
  }

  parseFileChanges(_params: { numstat: string }): FileChange[] {
    // Implementation
    return [];
  }

  private parseCommitMessage(_params: { message: string }): ParsedCommit {
    // Implementation
    return {
      type: "feat",
      scope: null,
      description: "",
      body: null,
      breaking: false,
    };
  }
}
