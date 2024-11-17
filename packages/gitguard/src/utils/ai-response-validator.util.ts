/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { z } from "zod";
import {
  CommitSplitSuggestion,
  CommitSuggestion,
} from "../types/analysis.types.js";
import { Logger } from "../types/logger.types.js";

interface ValidationResult<T> {
  isValid: boolean;
  data: T | undefined;
  error: string | null;
}

interface ValidateParams {
  response: unknown;
  logger: Logger;
}

// Define the schemas
const commitSuggestionSchema: z.ZodType<CommitSuggestion> = z.object({
  title: z.string(),
  type: z.string(),
  scope: z.string().optional(),
  message: z.string().optional(),
});

// New schema for array of suggestions
const commitSuggestionsResponseSchema = z.object({
  suggestions: z.array(commitSuggestionSchema),
});

const splitSuggestionSchema: z.ZodType<CommitSplitSuggestion> = z.object({
  reason: z.string(),
  suggestions: z.array(
    z.object({
      files: z.array(z.string()),
      message: z.string(),
      type: z.string(),
      order: z.number(),
      scope: z.string().optional(),
    }),
  ),
});

const schemas = {
  commitSuggestions: commitSuggestionsResponseSchema,
  splitSuggestion: splitSuggestionSchema,
} as const;

function validateResponse<T>(
  params: ValidateParams & { schema: z.ZodType<T> },
): ValidationResult<T> {
  const { response, schema, logger } = params;

  try {
    // If response is already an object, use it directly
    const dataToValidate =
      typeof response === "string"
        ? (JSON.parse(response) as unknown)
        : response;

    const result = schema.safeParse(dataToValidate);

    if (result.success) {
      return {
        isValid: true,
        data: result.data,
        error: null,
      };
    }

    logger.error("Validation failed:", result.error);
    return {
      isValid: false,
      data: undefined,
      error: result.error.message,
    };
  } catch (error) {
    logger.error("Failed to parse or validate response:", error);
    return {
      isValid: false,
      data: undefined,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function validateCommitSuggestion(
  params: ValidateParams,
): ValidationResult<CommitSuggestion[]> {
  const result = validateResponse<{ suggestions: CommitSuggestion[] }>({
    ...params,
    schema: schemas.commitSuggestions,
  });

  return {
    isValid: result.isValid,
    data: result.data?.suggestions,
    error: result.error,
  };
}

export function validateSplitSuggestion(
  params: ValidateParams,
): ValidationResult<CommitSplitSuggestion> {
  return validateResponse<CommitSplitSuggestion>({
    ...params,
    schema: schemas.splitSuggestion,
  });
}
