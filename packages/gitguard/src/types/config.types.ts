// types/config.types.ts

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface GitConfig {
  baseBranch: string;
  ignorePatterns: string[];
  cwd: string;
}

export interface AnalysisConfig {
  maxCommitSize: number;
  maxFileSize: number;
  checkConventionalCommits: boolean;
}

export interface SecurityConfig {
  enabled: boolean;
  checkSecrets: boolean;
  checkFiles: boolean;
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
