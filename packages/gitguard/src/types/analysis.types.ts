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
  complexity: CommitComplexity;
}

export interface CommitStats {
  filesChanged: number;
  additions: number;
  deletions: number;
}

export interface CommitComplexity {
  score: number;
  reasons: string[];
  needsStructure: boolean;
}

export interface FilesByType {
  [key: string]: string[];
}

export interface CommitSplitOption {
  id: string;
  title: string;
  explanation: string;
  commits: Array<{
    message: string;
    files: string[];
    order: number;
    type: string;
    scope?: string;
  }>;
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
  enhancedOptions?: CommitSplitOption[];
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
  securityResult?: SecurityCheckResult;
  aiSuggestions?: Array<{
    title: string;
    description?: string;
    type?: string;
    scope?: string;
    explanation: string;
  }>;
  suggestedTitle?: string;
  files: FileChange[];
  diff: string;
  existingPR?: GitHubPR | null;
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
  title: string; // Short descriptive title without scope or type
  type: string; // Commit type (feat|fix|docs|style|refactor|test|chore)
  scope?: string; // Optional scope (detected from files)
  message?: string; // Optional detailed explanation for complex changes
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
  explanation?: string;
}

export interface PRDescriptionOptions extends BaseAIOptions {}

import type { Octokit } from "@octokit/rest";
import type { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";

export type PullsListResponse =
  RestEndpointMethodTypes["pulls"]["list"]["response"];
export type PullsCreateResponse =
  RestEndpointMethodTypes["pulls"]["create"]["response"];
export type PullsUpdateResponse =
  RestEndpointMethodTypes["pulls"]["update"]["response"];

export interface GitHubPR {
  url: string;
  number: number;
  title: string;
  description: string;
}

export type OctokitInstance = InstanceType<typeof Octokit>;

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
  branch: string;
  enableAI?: boolean;
  enablePrompts?: boolean;
  aiMode?: "pr" | "branch" | "review";
  existingPR?: GitHubPR | null;
}

// Shared only where absolutely necessary
export interface AnalysisWarning {
  type: "size" | "security" | "structure" | "file";
  severity: "high" | "medium" | "low";
  message: string;
}

export interface CommitCohesionAnalysis {
  shouldSplit: boolean;
  primaryScope?: string;
  splitSuggestion?: CommitSplitSuggestion;
  warnings: AnalysisWarning[];
}

export interface ComplexityOptions {
  thresholds: {
    largeFile: number;
    veryLargeFile: number;
    hugeFile: number;
    multipleFiles: number;
    manyFiles: number;
  };
  scoring: {
    baseFileScore: number;
    largeFileScore: number;
    veryLargeFileScore: number;
    hugeFileScore: number;
    sourceFileScore: number;
    testFileScore: number;
    configFileScore: number;
    apiFileScore: number;
    migrationFileScore: number;
    componentFileScore: number;
    hookFileScore: number;
    utilityFileScore: number;
    criticalFileScore: number;
  };
  patterns: {
    sourceFiles: string[];
    apiFiles: string[];
    migrationFiles: string[];
    componentFiles: string[];
    hookFiles: string[];
    utilityFiles: string[];
    criticalFiles: string[];
  };
  structureThresholds: {
    scoreThreshold: number;
    reasonsThreshold: number;
  };
}
