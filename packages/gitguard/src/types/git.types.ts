export interface GitCommandParams {
  command: string;
  args: string[];
}

export type CommitType =
  | "feat"
  | "fix"
  | "docs"
  | "style"
  | "refactor"
  | "test"
  | "chore"
  | "build"
  | "ci"
  | "perf"
  | "revert";

export interface ParsedCommit {
  type: CommitType;
  scope: string | null;
  description: string;
  body: string | null;
  breaking: boolean;
}

export interface CommitInfo {
  hash: string;
  author: string;
  date: Date;
  message: string;
  parsed: ParsedCommit;
  files: FileChange[];
}

export interface FileChange {
  path: string;
  additions: number;
  deletions: number;
  status?: "added" | "deleted" | "modified" | "untracked" | "renamed";
  isTest: boolean;
  isConfig: boolean;
}
