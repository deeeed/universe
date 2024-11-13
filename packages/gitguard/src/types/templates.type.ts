import { BaseAIOptions } from "./ai.types.js";
import { CommitSplitSuggestion, PRStats } from "./analysis.types.js";

import { AIProvider } from "./ai.types.js";
import { CommitInfo, FileChange } from "./git.types.js";

export type PromptType = "commit" | "pr" | "split-commit" | "split-pr";
export type PromptFormat = "api" | "human";

export interface BasePromptTemplate {
  id: string;
  type: PromptType;
  format: PromptFormat; // default to "api" in implementation
  title?: string;
  version?: string;
  ai: BaseAIOptions & {
    provider?: AIProvider;
    model?: string;
  };
  template: string; // The actual template content
}

// Common variables shared across templates
export interface BaseTemplateVariables {
  files: FileChange[];
  diff: string;
}
// Common variables shared across templates
export interface CommitTemplate extends BasePromptTemplate {
  variables: BaseTemplateVariables & {
    commits: CommitInfo[];
    baseBranch: string;
    stats?: PRStats;
    template?: string;
    options?: {
      includeTesting?: boolean;
      includeChecklist?: boolean;
    };
  };
}

export interface CommitSplitTemplate extends BasePromptTemplate {
  variables: BaseTemplateVariables & {
    message: string;
    basicSuggestion?: CommitSplitSuggestion;
  };
}

export interface PRDescriptionTemplate extends BasePromptTemplate {
  variables: BaseTemplateVariables & {
    commits: CommitInfo[];
    baseBranch: string;
    stats?: PRStats;
    template?: string;
    options?: {
      includeTesting?: boolean;
      includeChecklist?: boolean;
    };
  };
}

export interface PRSplitTemplate extends BasePromptTemplate {
  variables: BaseTemplateVariables & {
    commits: CommitInfo[];
    baseBranch: string;
    stats?: PRStats;
  };
}

export type PromptTemplate =
  | CommitTemplate
  | CommitSplitTemplate
  | PRDescriptionTemplate
  | PRSplitTemplate;
