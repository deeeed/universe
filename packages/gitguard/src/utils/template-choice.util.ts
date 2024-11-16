import { select } from "@inquirer/prompts";
import { TemplateRegistry } from "../services/template/template-registry.js";
import { Logger } from "../types/logger.types.js";
import { PromptTemplate, PromptType } from "../types/templates.type.js";

interface GetTemplateChoicesParams {
  type: PromptType;
  generateLabel: string;
  canGenerate: boolean;
  disabledReason?: string;
  tokenUsage: {
    estimatedCost: string;
  };
  templateRegistry: TemplateRegistry;
  logger: Logger;
  useKeyboard?: boolean;
  skipAsDefault?: boolean;
  clipboardEnabled?: boolean;
}

interface TemplateChoice {
  label: string;
  value: string;
  isDefault?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  template?: PromptTemplate;
}

interface InquirerTemplateChoice {
  name: string;
  value: string;
  disabled?: boolean | string;
}

export async function selectTemplateChoice(
  params: GetTemplateChoicesParams,
): Promise<string> {
  const choices = getTemplateBasedChoices(params);

  const inquirerChoices: InquirerTemplateChoice[] = choices.map((choice) => ({
    name: choice.label,
    value: choice.value,
    disabled: choice.disabled ? (choice.disabledReason ?? true) : false,
  }));

  try {
    return await select({
      message: "Choose an action:",
      choices: inquirerChoices,
      default: choices.findIndex((c) => c.isDefault),
    });
  } catch (error) {
    params.logger.error("Failed to prompt for choice:", error);
    // Return the default choice as fallback
    return choices.find((c) => c.isDefault)?.value ?? "skip";
  }
}

export function getTemplateBasedChoices(
  params: GetTemplateChoicesParams,
): TemplateChoice[] {
  const {
    type,
    generateLabel,
    canGenerate,
    disabledReason,
    tokenUsage,
    templateRegistry,
    logger,
    skipAsDefault = false,
    clipboardEnabled = false,
  } = params;

  // Get available templates for both formats
  const apiTemplates = templateRegistry.getTemplatesForType({
    type,
    format: "api",
  });
  const humanTemplates = templateRegistry.getTemplatesForType({
    type,
    format: "human",
  });

  logger.debug("Available templates:", {
    api: apiTemplates.length,
    human: humanTemplates.length,
  });

  const choices: TemplateChoice[] = [
    {
      label: `1. Continue without AI assistance`,
      value: "skip",
      isDefault: skipAsDefault,
    },
  ];

  let choiceIndex = 2; // Start from 2 since we already used 1

  // Add API template choice if available
  if (apiTemplates.length > 0) {
    const defaultTemplate = templateRegistry.getDefaultTemplate({
      type,
      format: "api",
    });

    // Add main generate choice
    choices.push({
      label: `${choiceIndex++}. ${generateLabel}${!canGenerate ? ` (${disabledReason})` : ` (estimated cost: ${tokenUsage.estimatedCost})`}`,
      value: `generate-${defaultTemplate?.id}`,
      isDefault: !skipAsDefault && canGenerate,
      disabled: !canGenerate,
      disabledReason,
      template: defaultTemplate,
    });

    // Add API clipboard option when enabled via params
    if (clipboardEnabled && defaultTemplate) {
      choices.push({
        label: `${choiceIndex++}. └─> Copy ${defaultTemplate.title ?? "API"} prompt to clipboard`,
        value: `copy-api-${defaultTemplate.id}`,
        isDefault: false,
      });
    }
  }

  // Add human template choices
  humanTemplates.forEach((template) => {
    choices.push({
      label: `${choiceIndex++}. Copy ${template.title ?? "human-friendly"} prompt`,
      value: `copy-${template.id}`,
      template,
    });
  });

  // Add fallback choices if no templates
  if (apiTemplates.length === 0 && humanTemplates.length === 0) {
    choices.push(
      {
        label: `${choiceIndex++}. ${generateLabel}${!canGenerate ? ` (${disabledReason})` : ` (estimated cost: ${tokenUsage.estimatedCost})`}`,
        value: "generate-default",
        disabled: !canGenerate,
        disabledReason,
      },
      {
        label: `${choiceIndex++}. Copy API prompt to clipboard`,
        value: "copy-api",
      },
      {
        label: `${choiceIndex++}. Copy human-friendly prompt to clipboard`,
        value: "copy-manual",
      },
    );
  }

  return choices;
}
