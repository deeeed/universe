import { CommitComplexity, FilesByType } from "./analysis.types.js";

// types/ai.types.ts
export interface BaseAIOptions {
  temperature?: number; // e.g., 0.7
  maxTokens?: number; // e.g., 4000
  systemPrompt: string; // e.g., "You are a git commit message assistant..."
  userPrompt?: string; // e.g., "Focus on security implications..."
}

// Add new interface
export interface TokenLimits {
  api: number;
  clipboard: number;
}

export interface TokenUsage {
  count: number;
  estimatedCost: string;
  isWithinApiLimits: boolean;
  isWithinClipboardLimits: boolean;
}

// Main AI Provider Interface
export interface AIProvider {
  getName(): string;
  generateCompletion<T>(params: {
    prompt: string;
    options?: {
      requireJson?: boolean;
      temperature?: number;
      systemPrompt?: string;
    };
  }): Promise<T>;

  calculateTokenUsage(params: {
    prompt: string;
    options?: {
      model?: string;
      isClipboardAction?: boolean;
    };
  }): TokenUsage;
}

export interface CommitPromptOptions {
  complexity: CommitComplexity;
  filesByType: FilesByType;
  tokenBudget?: number;
  style?: "concise" | "detailed";
}
