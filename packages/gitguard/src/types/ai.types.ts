// types/ai.types.ts
import { CommitType, FileChange } from "./commit.types";

export interface BaseAIOptions {
  temperature?: number;
  maxTokens?: number;
  customPrompt?: string;
}

// Commit Suggestions
export interface CommitSuggestion {
  message: string;
  explanation: string;
  type: CommitType;
  scope: string | null;
  description: string;
}

export interface CommitSuggestionOptions extends BaseAIOptions {
  numSuggestions?: number;
  requireExplanation?: boolean;
  conventionalCommits?: boolean;
  preferredTypes?: CommitType[];
}

// Split Analysis
export interface SplitAnalysis {
  shouldSplit: boolean;
  reason?: string;
  suggestedSplits?: Array<{
    files: string[];
    scope?: string;
    type?: CommitType;
    reasoning: string;
  }>;
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

export interface PRDescriptionOptions extends BaseAIOptions {
  format?: "simple" | "detailed";
}

// Main AI Provider Interface
export interface AIProvider {
  // Original commit suggestion method
  generateCommitSuggestions(params: {
    files: FileChange[];
    originalMessage: string;
    diff: string;
    options?: CommitSuggestionOptions;
  }): Promise<CommitSuggestion[]>;

  // New analysis methods
  analyzeCommitChanges?(params: {
    files: FileChange[];
    diff: string;
    originalMessage: string;
    options?: SplitAnalysisOptions;
  }): Promise<SplitAnalysis>;

  analyzePRChanges?(params: {
    files: FileChange[];
    commits: string[];
    options?: SplitAnalysisOptions;
  }): Promise<SplitAnalysis>;

  // PR description generation
  generatePRDescription(params: {
    files: FileChange[];
    commits: string[];
    template?: string;
    options?: PRDescriptionOptions;
  }): Promise<PRDescription>;
}
