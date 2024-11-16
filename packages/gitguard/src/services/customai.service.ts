import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { AIProvider, TokenUsage } from "../types/ai.types.js";
import { ServiceOptions } from "../types/service.types.js";
import { BaseService } from "./base.service.js";
import { DEFAULT_MAX_PROMPT_TOKENS } from "../constants.js";

export interface CustomAIConfig {
  type: "custom";
  custom: {
    host: string;
    model: string;
    maxTokens?: number;
  };
}

export class CustomAIService extends BaseService implements AIProvider {
  private readonly config: CustomAIConfig;
  private readonly client: OpenAI;

  constructor(params: ServiceOptions & { config: CustomAIConfig }) {
    super(params);
    this.config = params.config;
    this.client = this.createClient();
  }

  public getName(): string {
    return `Custom AI [ ${this.getModel()} ]`;
  }

  private createClient(): OpenAI {
    return new OpenAI({
      baseURL: this.config.custom.host,
      apiKey: "dummy", // Required by OpenAI client but not used
    });
  }

  async generateCompletion<T>(params: {
    prompt: string;
    options?: {
      requireJson?: boolean;
      temperature?: number;
      systemPrompt?: string;
    };
  }): Promise<T> {
    try {
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: params.options?.systemPrompt ?? "You are an AI assistant.",
        },
        { role: "user", content: params.prompt },
      ];

      // Calculate and log token usage for input
      const fullPrompt = messages.map((m) => m.content).join("\n");
      const inputTokens = this.calculateTokenUsage({ prompt: fullPrompt });
      this.logger.debug("Completion request details:", {
        model: this.getModel(),
        temperature: params.options?.temperature ?? 0.7,
        requireJson: params.options?.requireJson,
        inputTokens: inputTokens.count,
      });

      const completion = await this.client.chat.completions.create({
        messages,
        model: this.getModel(),
        temperature: params.options?.temperature ?? 0.7,
        max_tokens: 2000,
        response_format: params.options?.requireJson
          ? { type: "json_object" }
          : undefined,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in response");
      }

      if (params.options?.requireJson) {
        try {
          return JSON.parse(content) as T;
        } catch (error) {
          throw new Error("Failed to parse JSON response", { cause: error });
        }
      }

      return { content } as T;
    } catch (error) {
      this.logger.error("Custom AI API error:", error);
      throw error;
    }
  }

  calculateTokenUsage(params: {
    prompt: string;
    options?: {
      model?: string;
      isClipboardAction?: boolean;
    };
  }): TokenUsage {
    const maxApiTokens =
      this.config.custom.maxTokens ?? DEFAULT_MAX_PROMPT_TOKENS;
    const maxClipboardTokens = 16000; // Higher limit for clipboard

    // Simple token estimation (4 characters per token)
    const count = Math.ceil(params.prompt.length / 4);

    return {
      count,
      estimatedCost: "$0.00 FREE", // Custom models may not have associated costs
      isWithinApiLimits: count <= maxApiTokens,
      isWithinClipboardLimits: count <= maxClipboardTokens,
    };
  }

  private getModel(): string {
    if (this.config.custom?.model) {
      return this.config.custom.model;
    }
    throw new Error("Model configuration missing");
  }
}
