import { AIProvider, BaseAIOptions } from "./ai.types.js";
import {
  CommitComplexity,
  CommitSplitSuggestion,
  PRStats,
} from "./analysis.types.js";
import { CommitInfo, FileChange } from "./git.types.js";

export type PromptType = "commit" | "pr" | "split-commit" | "split-pr";
export type PromptFormat = "api" | "human";

// Base template interfaces
export interface BasePromptTemplate {
  id: string;
  type: PromptType;
  format: PromptFormat;
  title?: string;
  version?: string;
  active?: boolean;
  systemPrompt?: string;
  ai: BaseAIOptions & {
    provider?: AIProvider; // not implemented
    model?: string; // not implemented
  };
  template: string;
}

// Template Variables
export interface BaseTemplateVariables {
  files: FileChange[];
  diff: string;
}

export interface CommitTemplateVariables extends BaseTemplateVariables {
  packages: Record<string, FileChange[]>;
  originalMessage: string;
  scope?: string;
  complexity?: CommitComplexity;
  includeDetails?: boolean;
}

export interface CommitSplitTemplateVariables extends BaseTemplateVariables {
  message: string;
  basicSuggestion?: CommitSplitSuggestion;
}

export interface PRTemplateVariables extends BaseTemplateVariables {
  commits: CommitInfo[];
  baseBranch: string;
  stats?: PRStats;
  template?: string;
  options?: {
    includeTesting?: boolean;
    includeChecklist?: boolean;
  };
}

// Template Types with their specific variables
export interface CommitTemplate extends BasePromptTemplate {
  variables?: CommitTemplateVariables;
}

export interface CommitSplitTemplate extends BasePromptTemplate {
  variables?: CommitSplitTemplateVariables;
}

export interface PRDescriptionTemplate extends BasePromptTemplate {
  variables?: PRTemplateVariables;
}

export interface PRSplitTemplate extends BasePromptTemplate {
  variables?: PRTemplateVariables;
}

// Union types for template variables and templates
export type TemplateVariables =
  | CommitTemplateVariables
  | CommitSplitTemplateVariables
  | PRTemplateVariables;

export type PromptTemplate =
  | CommitTemplate
  | CommitSplitTemplate
  | PRDescriptionTemplate
  | PRSplitTemplate;

// Add source information to the base template
export type WithSource = {
  source: "project" | "global" | "default";
  path: string;
};

// Modify the existing PromptTemplate type to include source information
export type LoadedPromptTemplate = PromptTemplate & WithSource;
