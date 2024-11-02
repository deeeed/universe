// types/analysis.types.ts
import { CommitInfo, CommitType, FileChange } from "./commit.types";

// Commit Analysis Types
export interface CommitAnalysisResult {
  branch: string;
  baseBranch: string;
  originalMessage: string;
  stats: CommitStats;
  warnings: AnalysisWarning[];
  suggestions?: CommitSuggestion[];
  splitSuggestion?: CommitSplitSuggestion;
}

export interface CommitStats {
  filesChanged: number;
  additions: number;
  deletions: number;
}

export interface CommitSplitSuggestion {
  reason: string;
  suggestions: Array<{
    message: string;
    files: FileChange[];
    order: number;
    type: CommitType;
    scope?: string;
  }>;
  commands: string[];
}

export interface CommitAnalysisOptions {
  messageFile: string;
  splitStrategy?: "module" | "feature" | "auto";
  ignorePatterns?: string[];
}

// PR Analysis Types
export interface PRAnalysisResult {
  branch: string;
  baseBranch: string;
  commits: CommitInfo[];
  stats: PRStats;
  warnings: AnalysisWarning[];
  description?: PRDescription;
  splitSuggestion?: PRSplitSuggestion;
}

export interface PRStats {
  totalCommits: number;
  filesChanged: number;
  additions: number;
  deletions: number;
  authors: string[]; // PR specific
  timeSpan: {
    // PR specific
    firstCommit: Date;
    lastCommit: Date;
  };
}

export interface PRSplitSuggestion {
  reason: string;
  suggestedPRs: Array<{
    title: string;
    description: string;
    files: FileChange[];
    order: number;
    baseBranch: string;
    dependencies?: string[];
  }>;
  commands: string[];
}

export interface PRAnalysisOptions {
  branch?: string;
  includeDrafts?: boolean;
  template?: string;
  splitStrategy?: "module" | "feature" | "auto";
}

// Shared only where absolutely necessary
export interface AnalysisWarning {
  type: "commit" | "file" | "general";
  message: string;
  severity: "info" | "warning" | "error";
}

// Move these to ai.types.ts since they're AI-specific
export interface CommitSuggestion {
  message: string;
  explanation: string;
  type: CommitType;
  scope: string | null;
  description: string;
}

export interface PRDescription {
  title: string;
  description: string;
}
