import { encodingForModel, Tiktoken, TiktokenModel } from "js-tiktoken";
import { AzureOpenAI, OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  AIProvider,
  OpenAIConfig,
  TokenUsage,
  AzureConfig,
} from "../types/ai.types.js";
import { ServiceOptions } from "../types/service.types.js";
import { BaseService } from "./base.service.js";
import { DEFAULT_MAX_PROMPT_TOKENS } from "../constants.js";

interface ModelPricing {
  input: number;
  output: number;
}

const GPT_MODELS = {
  GPT4_OPUS: "gpt-4-0125-preview",
  GPT4_VISION: "gpt-4-vision-preview",
  GPT4_TURBO: "gpt-4-1106-preview",
  GPT4_32K: "gpt-4-32k",
  GPT4: "gpt-4",
  GPT35_TURBO_1106: "gpt-3.5-turbo-1106",
  GPT35_TURBO_16K: "gpt-3.5-turbo-16k",
  GPT35_TURBO: "gpt-3.5-turbo",
} as const;

// Type guard for tiktoken model names
const isTiktokenModel = (model: string): model is TiktokenModel => {
  const supportedModels = new Set<string>(["gpt-4", "gpt-3.5-turbo"]);
  return supportedModels.has(model);
};

export class OpenAIService extends BaseService implements AIProvider {
  private readonly config: OpenAIConfig | AzureConfig;
  private readonly client: OpenAI | AzureOpenAI;

  constructor(params: ServiceOptions & { config: OpenAIConfig | AzureConfig }) {
    super(params);
    this.config = params.config;
    this.client = this.createClient();
  }

  public getName(): string {
    return `OpenAI / Azure OpenAI [ ${this.getModel()} ]`;
  }

  private createClient(): OpenAI | AzureOpenAI {
    if (this.config.type === "azure") {
      if (!this.config.azure) {
        throw new Error("Azure configuration missing");
      }
      return new AzureOpenAI({
        apiKey: this.config.azure.apiKey,
        endpoint: this.config.azure.endpoint,
        apiVersion: this.config.azure.apiVersion,
        deployment: this.config.azure.deployment,
      });
    }

    if (this.config.type === "openai") {
      if (!this.config.openai) {
        throw new Error("OpenAI configuration missing");
      }
      return new OpenAI({
        apiKey: this.config.openai.apiKey,
        organization: this.config.openai.organization,
      });
    }

    throw new Error("Invalid configuration type");
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
        max_tokens: DEFAULT_MAX_PROMPT_TOKENS,
        response_format: params.options?.requireJson
          ? { type: "json_object" }
          : undefined,
      });

      // Log completion costs and token usage
      const outputTokens = completion.usage?.completion_tokens ?? 0;
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
      this.logger.error("OpenAI API error:", error);
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
    const modelName = this.getModel();
    const encoder = this.getTokenEncoder(modelName);
    const maxApiTokens = this.getMaxTokens();
    const maxClipboardTokens = 16000; // Higher limit for clipboard

    if (!encoder) {
      const count = Math.ceil(params.prompt.length / 4);
      return {
        count,
        estimatedCost: "unknown",
        isWithinApiLimits: count <= maxApiTokens,
        isWithinClipboardLimits: count <= maxClipboardTokens,
      };
    }

    try {
      const encoded = encoder.encode(params.prompt) as unknown as number[];
      const tokenCount = encoded.length;
      const pricing = this.getModelPricing(modelName);
      const estimatedCost = (tokenCount / 1000) * pricing.input;

      return {
        count: tokenCount,
        estimatedCost: `$${estimatedCost.toFixed(4)}`,
        isWithinApiLimits: tokenCount <= maxApiTokens,
        isWithinClipboardLimits: tokenCount <= maxClipboardTokens,
      };
    } catch (error) {
      this.logger.error("Token calculation error:", error);
      return {
        count: Math.ceil(params.prompt.length / 4),
        estimatedCost: "unknown",
        isWithinApiLimits: false,
        isWithinClipboardLimits: false,
      };
    }
  }

  private getModelPricing(model: string): ModelPricing {
    const normalizedModel = model.toLowerCase();

    if (normalizedModel.includes(GPT_MODELS.GPT4_OPUS)) {
      return { input: 0.015, output: 0.075 }; // $0.015/1K tokens input, $0.075/1K tokens output
    }

    if (normalizedModel.includes(GPT_MODELS.GPT4_VISION)) {
      return { input: 0.01, output: 0.03 };
    }

    if (
      normalizedModel.includes(GPT_MODELS.GPT4_TURBO) ||
      normalizedModel.includes("gpt-4-turbo")
    ) {
      return { input: 0.01, output: 0.03 };
    }

    if (normalizedModel.includes(GPT_MODELS.GPT4_32K)) {
      return { input: 0.06, output: 0.12 };
    }

    if (normalizedModel.includes(GPT_MODELS.GPT4)) {
      return { input: 0.03, output: 0.06 };
    }

    if (normalizedModel.includes(GPT_MODELS.GPT35_TURBO_1106)) {
      return { input: 0.001, output: 0.002 };
    }

    if (normalizedModel.includes(GPT_MODELS.GPT35_TURBO_16K)) {
      return { input: 0.003, output: 0.004 };
    }

    if (normalizedModel.includes(GPT_MODELS.GPT35_TURBO)) {
      return { input: 0.0005, output: 0.0015 };
    }

    return { input: 0.0005, output: 0.0015 }; // Default to GPT-3.5 pricing
  }

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  private getTokenEncoder(model: string): Tiktoken | null {
    try {
      const normalizedModel = model.toLowerCase();
      const baseModel = normalizedModel.startsWith("gpt-4")
        ? GPT_MODELS.GPT4
        : GPT_MODELS.GPT35_TURBO;

      if (!isTiktokenModel(baseModel)) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        this.logger.warn(`Unsupported model for tokenization: ${baseModel}`);
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return encodingForModel(baseModel);
    } catch (error) {
      this.logger.error("Failed to get token encoder:", error);
      return null;
    }
  }

  private getMaxTokens(): number {
    if (this.config.type === "openai" && this.config.openai) {
      return this.config.maxTokens ?? DEFAULT_MAX_PROMPT_TOKENS;
    }
    return DEFAULT_MAX_PROMPT_TOKENS;
  }

  private getModel(): string {
    if (this.config.type === "azure" && this.config.azure) {
      return this.config.azure.deployment;
    }
    if (this.config.type === "openai" && this.config.openai) {
      return this.config.openai.model;
    }
    throw new Error("Model configuration missing");
  }
}
