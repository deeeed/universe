import { select } from "@inquirer/prompts";
import chalk from "chalk";
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
  description?: string;
}

interface InquirerTemplateChoice {
  name: string;
  value: string;
  description?: string;
  disabled?: boolean | string;
}

export async function selectTemplateChoice(
  params: GetTemplateChoicesParams,
): Promise<string> {
  // Display legend info as a single-line tip
  params.logger.info(
    `💡 Format: ${chalk.bold("Title")} [${chalk.cyan("source")}/` +
      `${chalk.yellow("type")}${chalk.gray(" • cost")}] ` +
      `${chalk.dim("(")}${chalk.cyan("source")}: default|project|global, ` +
      `${chalk.yellow("type")}: api|human${chalk.dim(")")}`,
  );

  const choices = getTemplateBasedChoices(params);

  try {
    const defaultIndex = choices
      .filter((choice) => !choice.disabled)
      .findIndex((c) => c.isDefault);

    const inquirerChoices: InquirerTemplateChoice[] = choices.map((choice) => ({
      name: choice.label,
      value: choice.value,
      description: choice.description,
      disabled: choice.disabled ? (choice.disabledReason ?? true) : false,
    }));

    return await select({
      message: "Choose an action:",
      choices: inquirerChoices,
      default: defaultIndex,
      loop: true,
      pageSize: inquirerChoices.length,
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
  const costInfo = cost ? ` • ${chalk.yellow(cost)}` : "";

  return `${index}. ${prefix}${title} [${scope}/${type}${costInfo}]`;
}

export function getTemplateBasedChoices(
  params: GetTemplateChoicesParams,
): TemplateChoice[] {
  const {
    type,
    canGenerate,
    disabledReason,
    tokenUsage,
    templateRegistry,
    clipboardEnabled = false,
    skipAsDefault = false,
  } = params;

  const choices: TemplateChoice[] = [];
  let displayIndex = 1;

  choices.push({
    label: `${displayIndex++}. Continue without AI assistance`,
    value: "skip",
    isDefault: skipAsDefault,
  });

  const apiTemplates = templateRegistry.getTemplatesForType({
    type,
    format: "api",
  });
  const humanTemplates = templateRegistry.getTemplatesForType({
    type,
    format: "human",
  });

  // Add API template choice if available
  apiTemplates.forEach((template) => {
    choices.push({
      label: formatTemplateLabel({
        index: displayIndex++,
        template,
        title: template.title ?? "API prompt",
        cost: tokenUsage.estimatedCost,
      }),
      disabled: !canGenerate,
      description:
        "Generate using AI API (Note: Actual costs may be higher due to response tokens)",
      isDefault: !skipAsDefault && canGenerate,
      disabledReason,
      value: `generate-${template.id}`,
    });

    if (clipboardEnabled) {
      choices.push({
        label: formatTemplateLabel({
          index: displayIndex++,
          template,
          title: template.title ?? "API prompt",
          isNested: true,
        }),
        value: `copy-api-${template.id}`,
        description:
          "Copy API-formatted prompt to clipboard - useful for manual testing without incurring API costs",
        isDefault: false,
      });
    }
  });

  // Add human template choices
  humanTemplates.forEach((template) => {
    choices.push({
      label: formatTemplateLabel({
        index: displayIndex++,
        template,
        title: template.title ?? "human-friendly prompt",
      }),
      value: `copy-${template.id}`,
      description:
        "Human-readable format suitable for pasting into ChatGPT or similar",
      template,
    });
  });

  return choices;
}
