import { Anthropic } from "@anthropic-ai/sdk";
import { DEFAULT_MAX_PROMPT_TOKENS } from "../constants.js";
import { AIProvider, TokenUsage } from "../types/ai.types.js";
import { ServiceOptions } from "../types/service.types.js";
import { BaseService } from "./base.service.js";

export interface AnthropicConfig {
  type: "anthropic";
  anthropic: {
    apiKey: string;
    model: string;
    maxTokens?: number;
  };
}

const ANTHROPIC_MODELS = {
  CLAUDE_3_OPUS: "claude-3-opus-20240229",
  CLAUDE_3_SONNET: "claude-3-sonnet-20240229",
  CLAUDE_3_HAIKU: "claude-3-haiku-20240229",
  CLAUDE_2_1: "claude-2.1",
  CLAUDE_2: "claude-2",
} as const;

interface ModelPricing {
  input: number;
  output: number;
}

export class AnthropicService extends BaseService implements AIProvider {
  private readonly config: AnthropicConfig;
  private readonly client: Anthropic;

  constructor(params: ServiceOptions & { config: AnthropicConfig }) {
    super(params);
    this.config = params.config;
    this.client = new Anthropic({
      apiKey: this.config.anthropic.apiKey,
    });
  }

  public getName(): string {
    return `Anthropic [ ${this.getModel()} ]`;
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
      // Calculate and log token usage for input
      const inputTokens = this.calculateTokenUsage({ prompt: params.prompt });
      this.logger.debug("Completion request details:", {
        model: this.getModel(),
        temperature: params.options?.temperature ?? 0.7,
        requireJson: params.options?.requireJson,
        inputTokens: inputTokens.count,
      });

      const message = await this.client.messages.create({
        model: this.getModel(),
        max_tokens: this.config.anthropic.maxTokens ?? 2000,
        temperature: params.options?.temperature ?? 0.7,
        system: params.options?.systemPrompt,
        messages: [
          {
            role: "user",
            content: params.prompt,
          },
        ],
      });

      const contentBlock = message.content[0];
      if (!("text" in contentBlock)) {
        throw new Error("Unexpected response format from Anthropic API");
      }
      const content = contentBlock.text;

      // Log completion costs and token usage
      const outputTokens = message.usage?.output_tokens ?? 0;
      const pricing = this.getModelPricing(this.getModel());
      const inputCost = (inputTokens.count / 1000) * pricing.input;
      const outputCost = (outputTokens / 1000) * pricing.output;
      const totalCost = inputCost + outputCost;

      this.logger.info("Completion costs:", {
        inputTokens: inputTokens.count,
        outputTokens,
        inputCost: `$${inputCost.toFixed(4)}`,
        outputCost: `$${outputCost.toFixed(4)}`,
        totalCost: `$${totalCost.toFixed(4)}`,
      });

      if (params.options?.requireJson) {
        try {
          const parsedContent = JSON.parse(content) as T;
          return parsedContent;
        } catch (error) {
          throw new Error("Failed to parse JSON response", { cause: error });
        }
      }

      return { content } as T;
    } catch (error) {
      this.logger.error("Anthropic API error:", error);
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
      this.config.anthropic.maxTokens ?? DEFAULT_MAX_PROMPT_TOKENS;
    const maxClipboardTokens = 16000;

    // Simple token estimation (4 characters per token)
    const count = Math.ceil(params.prompt.length / 4);
    const pricing = this.getModelPricing(this.getModel());
    const estimatedCost = (count / 1000) * pricing.input;

    return {
      count,
      estimatedCost: `$${estimatedCost.toFixed(4)}`,
      isWithinApiLimits: count <= maxApiTokens,
      isWithinClipboardLimits: count <= maxClipboardTokens,
    };
  }

  private getModelPricing(model: string): ModelPricing {
    const normalizedModel = model.toLowerCase();

    if (normalizedModel.includes(ANTHROPIC_MODELS.CLAUDE_3_OPUS)) {
      return { input: 0.015, output: 0.075 }; // $0.015/1K input, $0.075/1K output
    }

    if (normalizedModel.includes(ANTHROPIC_MODELS.CLAUDE_3_SONNET)) {
      return { input: 0.003, output: 0.015 }; // $0.003/1K input, $0.015/1K output
    }

    if (normalizedModel.includes(ANTHROPIC_MODELS.CLAUDE_3_HAIKU)) {
      return { input: 0.0006, output: 0.003 }; // $0.0006/1K input, $0.003/1K output
    }

    if (
      normalizedModel.includes(ANTHROPIC_MODELS.CLAUDE_2_1) ||
      normalizedModel.includes(ANTHROPIC_MODELS.CLAUDE_2)
    ) {
      return { input: 0.008, output: 0.024 }; // $0.008/1K input, $0.024/1K output
    }

    // Default to Claude-3-Opus pricing
    return { input: 0.015, output: 0.075 };
  }

  private getModel(): string {
    return this.config.anthropic.model ?? ANTHROPIC_MODELS.CLAUDE_3_OPUS;
  }
}
