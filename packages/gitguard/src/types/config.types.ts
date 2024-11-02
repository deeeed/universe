// types/config.types.ts
import { GitConfig } from "./git.types";

export interface PRTemplateConfig {
  path?: string;
  required?: boolean;
  sections?: {
    description: boolean;
    breaking: boolean;
    testing: boolean;
    checklist: boolean;
  };
}

export interface Config {
  git: GitConfig;
  analysis: {
    maxCommitSize: number;
    maxFileSize: number;
    checkConventionalCommits: boolean;
  };
  debug?: boolean;
  ai?: {
    enabled?: boolean;
    provider?: "azure" | "openai" | "ollama";
    azure?: {
      endpoint: string;
      deployment: string;
      apiVersion: string;
      apiKey?: string;
    };
    openai?: {
      model: string;
      apiKey?: string;
      organization?: string;
    };
    ollama?: {
      host: string;
      model: string;
    };
  };
  pr?: {
    template?: PRTemplateConfig;
    maxSize?: number;
    requireApprovals?: number;
  };
}
