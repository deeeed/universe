// packages/gitguard/src/services/openai.service.ts
import { AzureOpenAI, OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { AIProvider, TokenUsage } from "../types/ai.types";
import { ServiceOptions } from "../types/service.types";
import { BaseService } from "./base.service";

export interface OpenAIConfig {
  type: "azure" | "openai";
  azure?: {
    endpoint: string;
    apiKey: string;
    deployment: string;
    apiVersion: string;
  };
  openai?: {
    apiKey: string;
    model: string;
    organization?: string;
  };
}

export class OpenAIService extends BaseService implements AIProvider {
  private readonly config: OpenAIConfig;
  private client: OpenAI | AzureOpenAI;

  constructor(params: ServiceOptions & { config: OpenAIConfig }) {
    super(params);
    this.config = params.config;
    this.client = this.createClient();
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

    if (!this.config.openai) {
      throw new Error("OpenAI configuration missing");
    }
    return new OpenAI({
      apiKey: this.config.openai.apiKey,
      organization: this.config.openai.organization,
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
          content: params.options?.systemPrompt || "You are an AI assistant.",
        },
        { role: "user", content: params.prompt },
      ];

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
          throw new Error(`Failed to parse JSON response`, { cause: error });
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
    };
  }): TokenUsage {
    return {
      count: Math.ceil(params.prompt.length / 4),
      estimatedCost: "$0.01",
    };
  }

  private getModel(): string {
    if (this.config.type === "azure" && this.config.azure) {
      return this.config.azure.deployment;
    }
    if (this.config.openai?.model) {
      return this.config.openai.model;
    }
    throw new Error("Model configuration missing");
  }
}
