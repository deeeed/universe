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
}

interface TemplateChoice {
  label: string;
  value: string;
  isDefault?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  template?: PromptTemplate;
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
      label: "Continue without AI assistance",
      value: "skip",
      isDefault: true,
    },
  ];

  // Add API template choice if available
  if (apiTemplates.length > 0) {
    const defaultTemplate = templateRegistry.getDefaultTemplate({
      type,
      format: "api",
    });
    choices.push({
      label: `${generateLabel}${!canGenerate ? ` (${disabledReason})` : ` (estimated cost: ${tokenUsage.estimatedCost})`}`,
      value: "generate",
      disabled: !canGenerate,
      disabledReason,
      template: defaultTemplate,
    });
  }

  // Add human template choices
  humanTemplates.forEach((template) => {
    choices.push({
      label: `Copy ${template.title ?? "human-friendly"} prompt`,
      value: `copy-${template.id}`,
      template,
    });
  });

  // Add fallback choices if no templates
  if (apiTemplates.length === 0 && humanTemplates.length === 0) {
    choices.push(
      {
        label: `${generateLabel}${!canGenerate ? ` (${disabledReason})` : ` (estimated cost: ${tokenUsage.estimatedCost})`}`,
        value: "generate",
        disabled: !canGenerate,
        disabledReason,
      },
      { label: "Copy API prompt to clipboard", value: "copy-api" },
      {
        label: "Copy human-friendly prompt to clipboard",
        value: "copy-manual",
      },
    );
  }

  return choices;
}
