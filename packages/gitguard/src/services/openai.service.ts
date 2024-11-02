// packages/gitguard/src/services/openai.service.ts
import { AzureOpenAI, OpenAI } from "openai";
import { BaseService } from "./base.service";
import { AIProvider, CommitSuggestion, PRDescription } from "../types/ai.types";
import { ServiceOptions } from "../types/service.types";
import { FileChange } from "../types/commit.types";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface OpenAIConfig {
  type: "azure" | "openai";
  // Azure specific
  azure?: {
    endpoint: string;
    apiKey: string;
    deployment: string;
    apiVersion: string;
  };
  // OpenAI specific
  openai?: {
    apiKey: string;
    model: string;
    organization?: string;
  };
}

interface OpenAIResponse<T> {
  suggestions?: T[];
  content?: string;
  error?: string;
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

  async generateCommitSuggestions(params: {
    files: FileChange[];
    originalMessage: string;
    diff: string;
  }): Promise<CommitSuggestion[]> {
    try {
      const prompt = this.buildCommitPrompt(params);
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content:
            "You are a git commit message assistant. Generate conventional commit format suggestions.",
        },
        { role: "user", content: prompt },
      ];
      const response = await this.createChatCompletion<CommitSuggestion>({
        messages,
        requireJson: true,
      });

      return (
        response.suggestions || [
          {
            message: params.originalMessage,
            explanation: "Failed to generate suggestions",
            type: "chore",
            scope: null,
            description: params.originalMessage,
          },
        ]
      );
    } catch (error) {
      this.logger.error("Failed to generate commit suggestions:", error);
      return [
        {
          message: params.originalMessage,
          explanation: "Failed to generate suggestions due to API error",
          type: "chore",
          scope: null,
          description: params.originalMessage,
        },
      ];
    }
  }

  async generatePRDescription(params: {
    files: FileChange[];
    commits: string[];
    template?: string;
  }): Promise<PRDescription> {
    try {
      const prompt = this.buildPRPrompt(params);
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content:
            "You are a PR description generator. Create clear, structured PR descriptions.",
        },
        { role: "user", content: prompt },
      ];
      const response = await this.createChatCompletion<never>({
        messages,
        requireJson: false,
      });

      return {
        title: "PR Description",
        description: response.content || "Failed to generate description",
      };
    } catch (error) {
      this.logger.error("Failed to generate PR description:", error);
      return {
        title: "PR Description",
        description: "Failed to generate PR description due to API error",
      };
    }
  }

  private async createChatCompletion<T>(params: {
    messages: ChatCompletionMessageParam[];
    requireJson: boolean;
  }): Promise<OpenAIResponse<T>> {
    try {
      const model =
        this.config.type === "azure" && this.config.azure
          ? this.config.azure.deployment
          : this.config.openai?.model;

      if (!model) {
        throw new Error("Model configuration missing");
      }

      const completion = await this.client.chat.completions.create({
        messages: params.messages,
        model,
        temperature: 0.7,
        max_tokens: params.requireJson ? 1500 : 2000,
        response_format: params.requireJson
          ? { type: "json_object" }
          : undefined,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in response");
      }

      if (params.requireJson) {
        try {
          const parsed = JSON.parse(content) as OpenAIResponse<T>;
          return parsed;
        } catch (e) {
          throw new Error("Failed to parse JSON response");
        }
      }

      return { content };
    } catch (error) {
      this.logger.error("OpenAI API error:", error);
      throw error;
    }
  }

  private buildCommitPrompt(params: {
    files: FileChange[];
    originalMessage: string;
    diff: string;
  }): string {
    return `Analyze the following git changes and suggest a commit message:

Files Changed:
${params.files.map((f) => `- ${f.path} (+${f.additions} -${f.deletions})`).join("\n")}

Original message: "${params.originalMessage}"

Git diff:
\`\`\`diff
${params.diff}
\`\`\`

Please provide 3 conventional commit suggestions in this JSON format:
{
    "suggestions": [
        {
            "message": "complete commit message",
            "explanation": "reasoning",
            "type": "commit type",
            "scope": "scope",
            "description": "title description"
        }
    ]
}`;
  }

  private buildPRPrompt(params: {
    files: FileChange[];
    commits: string[];
    template?: string;
  }): string {
    const templateInstructions = params.template
      ? `Follow this template:\n${params.template}\n`
      : "Create a structured PR description with sections for Context, Changes, and Testing instructions.";

    return `Generate a PR description based on these changes:

Files Changed:
${params.files.map((f) => `- ${f.path} (+${f.additions} -${f.deletions})`).join("\n")}

Commits:
${params.commits.map((c) => `- ${c}`).join("\n")}

${templateInstructions}

The description should:
1. Be clear and concise
2. Highlight important changes
3. Include any breaking changes
4. Provide testing instructions if needed`;
  }
}
