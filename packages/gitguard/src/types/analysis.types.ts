import { BaseAIOptions } from "./ai.types.js";
import { CommitInfo, CommitType, FileChange } from "./git.types.js";
import { SecurityCheckResult } from "./security.types.js";

export interface CommitAnalysisResult {
  branch: string;
  baseBranch: string;
  originalMessage: string;
  formattedMessage: string;
  stats: CommitStats;
  warnings: AnalysisWarning[];
  suggestions?: CommitSuggestion[];
  splitSuggestion?: CommitSplitSuggestion;
  shouldPromptUser?: boolean;
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
    files: string[];
    order: number;
    type: string;
    scope?: string;
  }>;
  commands: string[];
}

export interface CommitAnalysisOptions {
  messageFile?: string;
  message?: string;
  enableAI?: boolean;
  enablePrompts?: boolean;
  securityResult?: SecurityCheckResult;
  files?: FileChange[];
}

export interface PRAnalysisResult {
  branch: string;
  baseBranch: string;
  commits: CommitInfo[];
  stats: PRStats;
  warnings: AnalysisWarning[];
  description?: PRDescription;
  splitSuggestion?: PRSplitSuggestion;
  filesByDirectory: Record<string, string[]>;
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

export interface CommitSuggestion {
  message: string;
  explanation: string;
  type: string;
  scope?: string;
  description: string;
}

export interface CommitSuggestionOptions extends BaseAIOptions {
  numSuggestions?: number;
  requireExplanation?: boolean;
  conventionalCommits?: boolean;
  preferredTypes?: CommitType[];
}

export interface SplitAnalysisOptions extends BaseAIOptions {
  strategy?: "module" | "feature" | "auto";
  maxSuggestions?: number;
}

// PR Description
export interface PRDescription {
  title: string;
  description: string;
}

export interface PRDescriptionOptions extends BaseAIOptions {}

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
  securityResult?: SecurityCheckResult;
  enableAI?: boolean;
  enablePrompts?: boolean;
}

// Shared only where absolutely necessary
export interface AnalysisWarning {
  type: "size" | "security" | "structure" | "file";
  severity: "error" | "warning";
  message: string;
}

export interface CommitCohesionAnalysis {
  shouldSplit: boolean;
  primaryScope?: string;
  splitSuggestion?: CommitSplitSuggestion;
  warnings: AnalysisWarning[];
}
