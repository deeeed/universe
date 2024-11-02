// types/ai.types.ts
export interface BaseAIOptions {
  temperature?: number;
  maxTokens?: number;
  customPrompt?: string;
}
export interface TokenUsage {
  count: number;
  estimatedCost: string;
}

// Main AI Provider Interface
export interface AIProvider {
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
    };
  }): TokenUsage;
}
