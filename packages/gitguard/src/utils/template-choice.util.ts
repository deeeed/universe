import { select } from "@inquirer/prompts";
import { TemplateRegistry } from "../services/template/template-registry.js";
import { Logger } from "../types/logger.types.js";
import {
  LoadedPromptTemplate,
  PromptTemplate,
  PromptType,
} from "../types/templates.type.js";

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
  let choices = getTemplateBasedChoices(params);

  // If no templates are available, ensure defaults are loaded
  if (choices.length <= 1) {
    // Only has skip option
    await params.templateRegistry.loadTemplates({ includeDefaults: true });
    // Regenerate choices after loading defaults
    choices = getTemplateBasedChoices(params);
  }

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
    return choices.find((c) => c.isDefault)?.value ?? "skip";
  }
}

function formatTemplateLabel(params: {
  index: number;
  template?: LoadedPromptTemplate;
  title: string;
  source?: "default" | "project" | "global";
  format?: "api" | "human";
  cost?: string;
  isNested?: boolean;
}): string {
  const { index, template, title, source, format, cost, isNested } = params;
  const prefix = isNested ? "└─> " : "";
  const scope = template?.source ?? source ?? "default";
  const type = template?.format ?? format ?? "api";
  const costInfo = cost ? ` • ${cost}` : "";

  return `${index}. ${prefix}${title} [${scope}/${type}${costInfo}]`;
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
    clipboardEnabled = false,
    skipAsDefault = false,
  } = params;

  let choiceIndex = 1;
  const choices: TemplateChoice[] = [
    {
      label: "Format: Title [source/type • cost]",
      value: "legend",
      disabled: true,
      disabledReason: "source: default|project|global, type: api|human",
    },
    {
      label: `${choiceIndex++}. Continue without AI assistance`,
      value: "skip",
      isDefault: false,
    },
  ];

  const apiTemplates = templateRegistry.getTemplatesForType({
    type,
    format: "api",
  });
  const humanTemplates = templateRegistry.getTemplatesForType({
    type,
    format: "human",
  });

  // Add API template choice if available
  if (apiTemplates.length > 0) {
    const defaultTemplate = templateRegistry.getDefaultTemplate({
      type,
      format: "api",
    });

    // Add main generate choice
    choices.push({
      label: formatTemplateLabel({
        index: choiceIndex++,
        template: defaultTemplate,
        title: generateLabel,
        cost: tokenUsage.estimatedCost,
      }),
      value: `generate-${defaultTemplate?.id}`,
      isDefault: !skipAsDefault && canGenerate,
      disabled: !canGenerate,
      disabledReason,
      template: defaultTemplate,
    });

    // Add API clipboard option when enabled
    if (clipboardEnabled && defaultTemplate) {
      choices.push({
        label: formatTemplateLabel({
          index: choiceIndex++,
          template: defaultTemplate,
          title: defaultTemplate.title ?? "API prompt",
          isNested: true,
        }),
        value: `copy-api-${defaultTemplate.id}`,
        isDefault: false,
      });
    }
  }

  // Add human template choices
  humanTemplates.forEach((template) => {
    choices.push({
      label: formatTemplateLabel({
        index: choiceIndex++,
        template,
        title: template.title ?? "human-friendly prompt",
      }),
      value: `copy-${template.id}`,
      template,
    });
  });

  return choices;
}
