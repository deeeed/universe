import { AIProvider } from "../types/ai.types.js";
import { Logger } from "../types/logger.types.js";
import { TemplateResult } from "./shared-ai-controller.util.js";
import { DEFAULT_TEMPERATURE } from "../constants.js";

interface AIHandlerParams<T> {
  ai?: AIProvider;
  logger: Logger;
  systemPrompt: string | ((params: AIGenerationParams) => string);
  validator?: (response: unknown) => {
    isValid: boolean;
    data: T | undefined;
    error: string | null;
  };
}

export interface AIGenerationParams {
  templateResult?: TemplateResult;
}

export function createAIHandler<T>(
  params: AIHandlerParams<T>,
): (
  params: AIGenerationParams,
  errorMessage: string,
) => Promise<T | undefined> {
  const { ai, logger, systemPrompt, validator } = params;

  return async function handleAIRequest(
    { templateResult }: AIGenerationParams,
    errorMessage: string,
  ): Promise<T | undefined> {
    if (!ai) {
      logger.debug("AI service not configured");
      return undefined;
    }

    const {
      template,
      renderedPrompt,
      renderedSystemPrompt,
      simulatedResponse,
    } = templateResult ?? {};

    if (!renderedPrompt) {
      logger.error("No prompt provided");
      throw new Error("No prompt provided");
    }

    try {
      let response = simulatedResponse;

      if (!response) {
        const finalSystemPrompt =
          typeof systemPrompt === "function"
            ? systemPrompt({ templateResult })
            : systemPrompt;

        logger.debug("Sending AI request with:", {
          promptLength: renderedPrompt.length,
          temperature: template?.ai?.temperature ?? DEFAULT_TEMPERATURE,
          hasSystemPrompt: !!finalSystemPrompt,
        });

        response = await ai.generateCompletion<unknown>({
          prompt: renderedPrompt,
          options: {
            requireJson: true,
            temperature: template?.ai?.temperature ?? DEFAULT_TEMPERATURE,
            systemPrompt: renderedSystemPrompt ?? finalSystemPrompt,
          },
        });
      } else {
        logger.debug("Using simulated response:", response);
      }

      // If validator is provided, use it
      if (validator) {
        const validation = validator(response);
        if (!validation.isValid) {
          logger.warn("Validation failed:", validation.error);
          return undefined;
        }
        return validation.data;
      }

      return response as T;
    } catch (error) {
      logger.error(errorMessage, error);
      return undefined;
    }
  };
}
