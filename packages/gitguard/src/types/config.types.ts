// types/config.types.ts

import { Severity } from "./security.types.js";
import { ComplexityOptions } from "./analysis.types.js";

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface AnalysisConfig {
  maxCommitSize: number;
  maxFileSize: number;
  checkConventionalCommits: boolean;
  complexity?: Partial<ComplexityOptions>;
}

export interface GitConfig {
  baseBranch: string;
  monorepoPatterns: string[];
  /**
   * Patterns to ignore in all git operations (staging, commits, etc.)
   * These files will be completely ignored by GitGuard
   * Example: build outputs, node_modules, etc.
   */
  ignorePatterns?: string[];
  cwd?: string;
  github?: {
    token?: string;
    enterprise?: {
      url: string;
    };
  };
}

export interface SecurityConfig {
  enabled: boolean;
  rules: {
    secrets: {
      enabled: boolean;
      severity: Severity;
      blockPR?: boolean;
      patterns?: string[];
    };
    files: {
      enabled: boolean;
      severity: Severity;
      patterns?: string[];
    };
  };
}

export interface PRTemplateConfig {
  path: string;
  required: boolean;
  sections: {
    description: boolean;
    breaking: boolean;
    testing: boolean;
    checklist: boolean;
  };
}

export interface AIConfig {
  enabled: boolean;
  provider: "azure" | "openai" | "ollama" | null;
  maxPromptTokens?: number;
  maxPromptCost?: number;
  azure?: {
    endpoint: string;
    deployment: string;
    apiVersion: string;
    apiKey?: string;
  };
  openai?: {
    apiKey?: string;
    model: string;
    organization?: string;
  };
  ollama?: {
    host: string;
    model: string;
  };
  commitDetails?: {
    enabled: boolean;
    complexityThreshold?: number;
    alwaysInclude?: boolean;
  };
}

export interface PRConfig {
  template: PRTemplateConfig;
  maxSize: number;
  requireApprovals: number;
}

// Main config with required fields
export interface Config {
  git: GitConfig;
  analysis: AnalysisConfig;
  debug: boolean;
  security: SecurityConfig;
  ai: AIConfig;
  pr: PRConfig;
}

// Partial config type for user input
export type PartialConfig = DeepPartial<Config>;
