// types/config.types.ts

import { ComplexityOptions } from "./analysis.types.js";
import { Severity } from "./security.types.js";

/**
 * Utility type for making all properties of an object optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Configuration for code analysis features
 */
export interface AnalysisConfig {
  /** Enable/disable multi-package detection */
  multiPackageDetection: boolean;
  /** Enable/disable complexity analysis */
  complexityDetection: boolean; // Not implemented yet - currently always enabled
  /** Maximum number of lines changed in a single commit */
  maxCommitSize: number;
  /** Maximum number of lines in a single file */
  maxFileSize: number;
  /** Whether to validate commits against conventional commits specification */
  checkConventionalCommits: boolean;
  /** Configuration for complexity analysis */
  complexity: ComplexityOptions;
}

/**
 * Git-related configuration settings
 */
export interface GitConfig {
  /** Base branch for PRs and computing diffs (e.g., 'main', 'master') */
  baseBranch: string;
  /** Patterns to identify monorepo package directories */
  monorepoPatterns: string[];
  /**
   * Patterns to ignore in all git operations
   * These files will be completely ignored by GitGuard
   * Example: build outputs, node_modules, etc.
   */
  ignorePatterns?: string[];
  /** GitHub-specific configuration */
  github?: {
    /** GitHub personal access token */
    token?: string;
    /** GitHub Enterprise configuration */
    enterprise?: {
      /** GitHub Enterprise URL */
      url: string;
    };
  };
}

/**
 * Extended Git configuration with runtime options
 */
export interface RuntimeGitConfig extends GitConfig {
  /** Current working directory for git operations */
  cwd?: string;
}

/**
 * Security scanning configuration
 */
export interface SecurityConfig {
  /** Enable/disable security scanning features */
  enabled: boolean;
  /** Security rule configurations */
  rules: {
    /** Secret scanning configuration */
    secrets: {
      /** Enable/disable secret scanning */
      enabled: boolean;
      /** Severity level for secret findings */
      severity: Severity;
      /** Whether to block PR on findings */
      blockPR?: boolean;
      /** Custom patterns for secret detection */
      patterns?: string[];
    };
    /** Sensitive file scanning configuration */
    files: {
      /** Enable/disable sensitive file scanning */
      enabled: boolean;
      /** Severity level for sensitive file findings */
      severity: Severity;
      /** Custom patterns for sensitive files */
      patterns?: string[];
    };
  };
}

/**
 * Pull Request template configuration
 */
export interface PRTemplateConfig {
  /** Path to PR template file */
  path: string;
  /** Whether the template is required */
  required: boolean;
  /** Required sections in PR template */
  sections: {
    /** Require description section */
    description: boolean;
    /** Require breaking changes section */
    breaking: boolean;
    /** Require testing section */
    testing: boolean;
    /** Require checklist section */
    checklist: boolean;
  };
}

/**
 * AI integration configuration
 */
export interface AIConfig {
  /** Enable/disable AI features */
  enabled: boolean;
  /** AI service provider */
  provider: "azure" | "openai" | "anthropic" | "custom" | null;
  /** Maximum tokens allowed in prompts */
  maxPromptTokens?: number;
  /** Maximum cost allowed per prompt */
  maxPromptCost?: number;
  /** Maximum tokens allowed in clipboard */
  maxClipboardTokens?: number;
  /** Enable clipboard option for API flows */
  apiClipboard?: boolean;
  /** Azure OpenAI configuration */
  azure?: {
    /** Azure OpenAI endpoint URL */
    endpoint: string;
    /** Model deployment name */
    deployment: string;
    /** API version */
    apiVersion: string;
    /** Azure OpenAI API key */
    apiKey?: string;
  };
  /** OpenAI configuration */
  openai?: {
    /** OpenAI API key */
    apiKey?: string;
    /** Model identifier */
    model: string;
    /** OpenAI organization ID */
    organization?: string;
  };
  /** Anthropic configuration */
  anthropic?: {
    /** Anthropic API key */
    apiKey?: string;
    /** Model identifier */
    model: string;
  };
  /** Custom AI provider configuration */
  custom?: {
    /** Custom API endpoint */
    host: string;
    /** Model identifier */
    model: string;
  };
  /** Commit analysis configuration */
  commitDetails?: {
    /** Enable/disable commit analysis */
    enabled: boolean;
    /** Complexity threshold for detailed analysis */
    complexityThreshold?: number;
    /** Always include commit details regardless of complexity */
    alwaysInclude?: boolean;
  };
}

/**
 * Pull Request configuration
 */
export interface PRConfig {
  /** PR template configuration */
  template: PRTemplateConfig;
  /** Maximum size of PR in lines */
  maxSize: number;
  /** Number of required approvals */
  requireApprovals: number;
}

/**
 * Main configuration interface
 */
export interface Config {
  /** Git configuration */
  git: GitConfig;
  /** Analysis configuration */
  analysis: AnalysisConfig;
  /** Enable debug logging */
  debug: boolean;
  /** Enable colored output */
  colors: boolean;
  /** Security configuration */
  security: SecurityConfig;
  /** AI integration configuration */
  ai: AIConfig;
  /** Pull Request configuration */
  pr: PRConfig;
}

/**
 * Partial configuration type for user input
 */
export type PartialConfig = DeepPartial<Config>;
