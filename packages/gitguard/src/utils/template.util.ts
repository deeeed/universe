import chalk from "chalk";
import { promises as fs } from "node:fs";
import { LoggerService } from "../services/logger.service.js";
import { TemplateRegistry } from "../services/template/template-registry.js";
import {
  CommitSplitTemplateVariables,
  CommitTemplateVariables,
  PromptTemplate,
  PromptType,
  PRTemplateVariables,
  TemplateVariables,
  WithSource,
} from "../types/templates.type.js";
import { promptYesNo } from "./user-prompt.util.js";

export interface TemplateStatus {
  filename: string;
  version?: string;
  defaultVersion?: string;
  needsUpdate: boolean;
  isNew: boolean;
}

export interface TemplateUpdateResult {
  existingTemplates: TemplateStatus[];
  newTemplates: TemplateStatus[];
}

type LoadedPromptTemplate = PromptTemplate & WithSource;

interface CompareTemplatesParams {
  currentTemplates: LoadedPromptTemplate[];
  defaultTemplates: Map<string, LoadedPromptTemplate>;
}

export function compareTemplateVersions(
  params: CompareTemplatesParams,
): TemplateUpdateResult {
  const { currentTemplates, defaultTemplates } = params;
  const templateStatus = new Map<string, TemplateStatus>();

  currentTemplates.forEach((template) => {
    const defaultTemplate = defaultTemplates.get(template.id);
    if (defaultTemplate) {
      const currentVersion = template.version ?? "0.0.0";
      const defaultVersion = defaultTemplate.version ?? "0.0.0";
      templateStatus.set(template.id, {
        filename: template.id,
        version: currentVersion,
        defaultVersion,
        needsUpdate: defaultVersion > currentVersion,
        isNew: false,
      });
    }
  });

  defaultTemplates.forEach((defaultTemplate, id) => {
    if (!templateStatus.has(id)) {
      templateStatus.set(id, {
        filename: id,
        defaultVersion: defaultTemplate.version ?? "0.0.0",
        needsUpdate: false,
        isNew: true,
      });
    }
  });

  return {
    existingTemplates: Array.from(templateStatus.values()).filter(
      (t) => !t.isNew,
    ),
    newTemplates: Array.from(templateStatus.values()).filter((t) => t.isNew),
  };
}

interface ValidateTemplateParams {
  template: LoadedPromptTemplate;
  registry: TemplateRegistry;
  logger: LoggerService;
  preview?: boolean;
}

function createSampleVariables(type: PromptType): TemplateVariables {
  const baseData = {
    files: [
      {
        path: "test.ts",
        additions: 1,
        deletions: 0,
        isTest: false,
        isConfig: false,
      },
    ],
    diff: "sample diff",
  };

  switch (type) {
    case "commit":
      return {
        ...baseData,
        packages: {},
        originalMessage: "test commit message",
      } as CommitTemplateVariables;

    case "split-commit":
      return {
        ...baseData,
        message: "test commit message",
      } as CommitSplitTemplateVariables;

    case "pr":
    case "split-pr":
      return {
        ...baseData,
        commits: [],
        baseBranch: "main",
      } as PRTemplateVariables;
  }
}

export function validateTemplate(params: ValidateTemplateParams): boolean {
  const { template, registry, logger, preview = true } = params;

  try {
    // Basic field validation
    const requiredFields = {
      id: template.id,
      type: template.type,
      format: template.format,
      template: template.template,
      ai: template.ai,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      logger.error(`❌ Template "${template.id}" missing required fields:`);
      missingFields.forEach((field) => {
        logger.error(`   • ${field}`);
      });
      return false;
    }

    // Type-specific validation
    const typeValidation =
      {
        commit: ["packages", "originalMessage"],
        "split-commit": ["message"],
        pr: ["commits", "baseBranch"],
        "split-pr": ["commits", "baseBranch"],
      }[template.type] ?? [];

    // Display template structure
    logger.info(`\n📋 Template "${template.id}" structure:`);
    logger.info(`   • Type: ${chalk.blue(template.type)}`);
    logger.info(`   • Format: ${chalk.blue(template.format)}`);
    logger.info(
      `   • Version: ${chalk.blue(template.version ?? "not specified")}`,
    );
    logger.info(`   • Title: ${chalk.blue(template.title ?? "not specified")}`);
    logger.info(
      `   • Required Variables: ${chalk.blue(typeValidation.join(", "))}`,
    );

    // AI Configuration
    logger.info(`   • AI Config:`);
    logger.info(
      `     - Provider: ${chalk.blue(template.ai.provider ?? "default")}`,
    );
    logger.info(`     - Model: ${chalk.blue(template.ai.model ?? "default")}`);

    // Only show preview if requested
    if (preview) {
      // Test template rendering with type-specific sample data
      logger.info("\n🧪 Testing template rendering...");
      const sampleData = createSampleVariables(template.type);

      const renderedTemplate = registry.renderTemplate({
        template,
        variables: sampleData,
      });

      logger.info(chalk.green("✓ Template renders successfully"));
      logger.info("\n📝 Sample Output Preview:");
      logger.info(chalk.dim("---"));
      logger.info(
        renderedTemplate.slice(0, 200) +
          (renderedTemplate.length > 200 ? "..." : ""),
      );
      logger.info(chalk.dim("---"));
    }

    return true;
  } catch (error) {
    logger.error(`❌ Template "${template.id}" validation failed:`, error);
    return false;
  }
}

interface FormatTemplateDisplayParams {
  template: LoadedPromptTemplate;
  choice?: {
    label: string;
    value: string;
    description?: string;
  };
}

export function formatTemplateDisplay(
  params: FormatTemplateDisplayParams,
): string {
  const { template, choice } = params;
  const sourceIndicator =
    template.source === "global"
      ? chalk.yellow(" [global]")
      : chalk.blue(" [project]");

  return (
    `${chalk.green(choice?.label ?? template.id)}${sourceIndicator} ${chalk.gray(`(${template.format})`)}` +
    (choice?.description ? chalk.yellow(` ${choice.description}`) : "") +
    (template.title ? `\n    ${chalk.dim(template.title)}` : "")
  );
}

interface GroupTemplatesByTypeParams {
  templates: LoadedPromptTemplate[];
  registry: TemplateRegistry;
}

export interface GroupedTemplate {
  template: LoadedPromptTemplate;
  choices: Array<{
    label: string;
    value: string;
    description?: string;
  }>;
}

export function groupTemplatesByType(
  params: GroupTemplatesByTypeParams,
): Record<string, GroupedTemplate[]> {
  const { templates, registry } = params;

  return templates.reduce(
    (acc, template) => {
      const choices = registry.getTemplateChoices({
        type: template.type,
        format: template.format,
      });
      acc[template.type] = acc[template.type] || [];
      acc[template.type].push({ template, choices });
      return acc;
    },
    {} as Record<string, GroupedTemplate[]>,
  );
}

export interface DisplayTemplateStatusParams {
  template: TemplateStatus;
  logger: LoggerService;
}

export function displayTemplateStatus(
  params: DisplayTemplateStatusParams,
): void {
  const { template, logger } = params;
  const status = template.needsUpdate
    ? chalk.yellow(`(update available: ${template.defaultVersion})`)
    : chalk.green("(up to date)");
  logger.info(`  • ${template.filename} ${status}`);
}

interface HandleExistingTemplatesParams {
  templates: TemplateStatus[];
  defaultTemplates: Map<string, LoadedPromptTemplate>;
  force?: boolean;
  logger: LoggerService;
  registry: TemplateRegistry;
  templatePath: string;
}

export async function handleExistingTemplates(
  params: HandleExistingTemplatesParams,
): Promise<void> {
  const { templates, defaultTemplates, force, logger, registry, templatePath } =
    params;

  if (templates.length === 0) return;

  logger.info("\n📝 Existing templates:");
  templates.forEach((template) => {
    displayTemplateStatus({ template, logger });
  });

  // If force is true, update all templates without prompting
  if (force) {
    logger.info("\n🔄 Force updating all existing templates...");
    await updateTemplates({
      templates,
      defaultTemplates,
      registry,
      templatePath,
      logger,
    });
    return;
  }

  // Otherwise, only prompt for outdated templates
  const outdatedTemplates = templates.filter((t) => t.needsUpdate);
  if (outdatedTemplates.length > 0) {
    const shouldUpdate = await promptYesNo({
      message: "Would you like to update outdated templates?",
      defaultValue: true,
      logger,
    });

    if (shouldUpdate) {
      await updateTemplates({
        templates: outdatedTemplates,
        defaultTemplates,
        registry,
        templatePath,
        logger,
      });
    }
  }
}

interface UpdateTemplatesParams {
  templates: TemplateStatus[];
  defaultTemplates: Map<string, LoadedPromptTemplate>;
  registry: TemplateRegistry;
  templatePath: string;
  logger: LoggerService;
}

export async function updateTemplates(
  params: UpdateTemplatesParams,
): Promise<void> {
  const { templates, defaultTemplates, registry, templatePath, logger } =
    params;

  for (const template of templates) {
    const defaultTemplate = defaultTemplates.get(template.filename);
    if (defaultTemplate) {
      await registry.saveTemplate({
        template: defaultTemplate,
        path: templatePath,
      });
      logger.success(`✨ Updated template: ${template.filename}`);
    }
  }
}

interface InstallNewTemplatesParams {
  templates: TemplateStatus[];
  defaultTemplates: Map<string, LoadedPromptTemplate>;
  registry: TemplateRegistry;
  templatePath: string;
  logger: LoggerService;
}

export async function installNewTemplates(
  params: InstallNewTemplatesParams,
): Promise<void> {
  const { templates, logger } = params;

  if (templates.length === 0) return;

  logger.info("\n📦 Installing new templates:");
  await updateTemplates(params);
}

interface ValidateTemplatesParams {
  logger: LoggerService;
  registry: TemplateRegistry;
  preview?: boolean;
  filter?: string;
}

export async function validateTemplates(
  params: ValidateTemplatesParams,
): Promise<boolean> {
  const { logger, registry, preview, filter } = params;
  let isValid = true;

  try {
    // Load both custom and default templates
    await registry.loadTemplates({ includeDefaults: true });
    let templates = registry.getAllTemplates();

    // Apply filter if provided
    if (filter) {
      const searchTerm = filter.toLowerCase();
      templates = templates.filter((template) => {
        const searchableText = [
          template.id,
          template.title,
          template.type,
          template.format,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchableText.includes(searchTerm);
      });

      if (templates.length === 0) {
        logger.info(`No templates found matching filter: "${filter}"`);
        return true;
      }
    }

    // Check if we only have default templates
    const customTemplates = templates.filter((t) => t.source !== "default");
    const defaultTemplatesCount = templates.length - customTemplates.length;

    if (customTemplates.length === 0) {
      logger.warn(
        "\n⚠️  No custom templates found. Using default templates only.\n" +
          "💡 To customize templates, you can:\n" +
          "   • Initialize project templates:  gitguard template --init\n" +
          "   • Initialize global templates:   gitguard template --init --global\n" +
          "📂 Search locations:\n" +
          "   • Project: .gitguard/templates/\n" +
          "   • Global:  ~/.gitguard/templates/\n",
      );
    }

    logger.info(
      `\n🔍 Found ${templates.length} template${templates.length === 1 ? "" : "s"}` +
        (defaultTemplatesCount > 0
          ? ` (including ${defaultTemplatesCount} default${defaultTemplatesCount === 1 ? "" : "s"})`
          : "") +
        (filter ? ` matching "${filter}"` : "") +
        " to validate\n",
    );

    // Determine if we should show preview based on context
    const shouldShowPreview = preview ?? templates.length === 1;

    for (const template of templates) {
      logger.info(chalk.blue(`\n━━━ Validating "${template.id}" ━━━`));
      const templateIsValid = validateTemplate({
        template,
        registry,
        logger,
        preview: shouldShowPreview,
      });
      if (!templateIsValid) {
        isValid = false;
        logger.error(
          chalk.red(`✖ Template "${template.id}" failed validation\n`),
        );
      }
    }

    if (isValid) {
      logger.success("\n✨ All templates passed validation!");

      // Add pro tips for template validation
      logger.info("\n💡 Pro Tips:");
      logger.info("• To preview a specific template's output:");
      logger.info(
        chalk.dim("  $ gitguard template --validate --filter <template-name>"),
      );
      logger.info("• To validate a custom template with preview:");
      logger.info(
        chalk.dim(
          "  $ gitguard template --validate --filter <your-template> --preview",
        ),
      );
      logger.info("• To create your own templates:");
      logger.info(
        chalk.dim("  $ gitguard template --init            # project level"),
      );
      logger.info(
        chalk.dim("  $ gitguard template --init --global   # global level"),
      );
      logger.info(
        "• Templates are stored in .gitguard/templates/ and can be edited or added manually",
      );
    } else {
      logger.error("\n⚠️  Some templates failed validation");
    }

    return isValid;
  } catch (error) {
    logger.error("Failed to validate templates:", error);
    return false;
  }
}

interface ListTemplatesParams {
  logger: LoggerService;
  registry: TemplateRegistry;
}

export function listTemplates(params: ListTemplatesParams): void {
  const { logger, registry } = params;
  const templates = registry.getAllTemplates();

  if (templates.length === 0) {
    logger.info(chalk.yellow("\nNo templates found."));
    return;
  }

  logger.info("\n📝 Available Templates:\n");

  // Group templates by type
  const groupedTemplates = templates.reduce(
    (acc, template) => {
      if (!acc[template.type]) {
        acc[template.type] = [];
      }
      acc[template.type].push(template);
      return acc;
    },
    {} as Record<PromptType, LoadedPromptTemplate[]>,
  );

  // Display templates by type
  Object.entries(groupedTemplates).forEach(([type, typeTemplates]) => {
    // Format type header
    logger.info(chalk.bold.blue(`━━━ ${type} Templates ━━━`));

    typeTemplates.forEach((template) => {
      const sourceLabel = {
        project: chalk.green("[custom]"),
        global: chalk.yellow("[global]"),
        default: chalk.dim("[default]"),
      }[template.source];

      // Format main template info
      logger.info(
        `${chalk.bold(template.title ?? template.id)} ${sourceLabel}` +
          chalk.dim(` (${template.format})`) +
          (template.version ? chalk.dim(` v${template.version}`) : ""),
      );

      // Only show ID if different from title
      if (template.title && template.id !== template.title) {
        logger.info(chalk.dim(`    ID: ${template.id}`));
      }
    });
    logger.info(""); // Add spacing between groups
  });

  // Add helpful footer with expanded tips
  logger.info(chalk.dim("💡 Tips:"));
  logger.info(chalk.dim("• [custom] templates are in .gitguard/templates/"));
  logger.info(chalk.dim("• [global] templates are in ~/.gitguard/templates/"));
  logger.info(chalk.dim("\nCommon Commands:"));
  logger.info(chalk.dim("• Initialize:  gitguard template --init"));
  logger.info(
    chalk.dim("• Validate:    gitguard template --validate --preview"),
  );
  logger.info(
    chalk.dim("• Filter:      gitguard template --validate --filter commit"),
  );
  logger.info(
    chalk.dim(
      "• Quick Check: gitguard template --validate --preview --filter pr.api",
    ),
  );
}

interface DisplayProTipsParams {
  logger: LoggerService;
}

export function displayProTips(params: DisplayProTipsParams): void {
  const { logger } = params;
  logger.info("\n💡 Pro Tips:");
  logger.info(
    "• Use 'gitguard template --list' to see all available templates",
  );
  logger.info("• Templates can be customized by editing the YAML files");
  logger.info(
    "• To revert to defaults, delete the template and run --init again",
  );
}

interface InitializeTemplatesParams {
  logger: LoggerService;
  templatePath: string;
  force?: boolean;
  registry: TemplateRegistry;
}

export async function initializeTemplates(
  params: InitializeTemplatesParams,
): Promise<void> {
  const { logger, templatePath, force, registry } = params;

  try {
    await fs.mkdir(templatePath, { recursive: true });
    logger.info(`📁 Created template directory: ${templatePath}`);

    // Load only custom templates first
    await registry.loadTemplates();
    // Then load defaults separately for comparison
    const defaultTemplates = await registry.loadDefaultTemplates();

    // Compare templates and determine status
    const { existingTemplates, newTemplates } = compareTemplateVersions({
      currentTemplates: registry.getAllTemplates(),
      defaultTemplates,
    });

    // Handle existing templates
    await handleExistingTemplates({
      templates: existingTemplates,
      defaultTemplates,
      force,
      logger,
      registry,
      templatePath,
    });

    // Install new templates
    await installNewTemplates({
      templates: newTemplates,
      defaultTemplates,
      registry,
      templatePath,
      logger,
    });

    if (existingTemplates.length === 0 && newTemplates.length === 0) {
      logger.info("No new templates to install");
    }

    displayProTips({ logger });
  } catch (error) {
    logger.error("Failed to initialize templates:", error);
    throw error;
  }
}
