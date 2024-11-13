import chalk from "chalk";
import { Command } from "commander";
import { promises as fs } from "fs";
import { join } from "path";
import { GitService } from "../services/git.service.js";
import { LoggerService } from "../services/logger.service.js";
import { TemplateRegistry } from "../services/template/template-registry.js";
import { PromptTemplate } from "../types/templates.type.js";
import { loadConfig } from "../utils/config.util.js";

interface TemplateCommandOptions {
  init?: boolean;
  validate?: boolean;
  list?: boolean;
  path?: string;
  debug?: boolean;
}

const DEFAULT_TEMPLATES = {
  "default-commit.api.yml": "commit-conventional",
  "default-commit.human.yml": "commit-conventional-human",
  "default-pr.api.yml": "pr-description",
  "default-split-commit.api.yml": "commit-split-suggestion",
  "default-split-pr.api.yml": "pr-split-suggestion",
};

async function initializeTemplates(params: {
  logger: LoggerService;
  templatePath: string;
}): Promise<void> {
  const { logger, templatePath } = params;

  try {
    // Create template directory if it doesn't exist
    await fs.mkdir(templatePath, { recursive: true });
    logger.info(`📁 Created template directory: ${templatePath}`);

    // Get the path to the templates directory relative to this file
    const templatesDir = new URL("../templates", import.meta.url).pathname;

    // Copy default templates from package
    for (const [filename, _templateId] of Object.entries(DEFAULT_TEMPLATES)) {
      const sourcePath = join(templatesDir, filename);
      const destPath = join(templatePath, filename.replace("default-", ""));

      try {
        // Check if template already exists
        await fs.access(destPath);
        logger.info(
          `⚠️  Template already exists: ${filename.replace("default-", "")}`,
        );
        continue;
      } catch {
        try {
          // Template doesn't exist, copy it
          const templateContent = await fs.readFile(sourcePath, "utf-8");
          await fs.writeFile(destPath, templateContent);
          logger.success(
            `✨ Created template: ${filename.replace("default-", "")}`,
          );
        } catch (error) {
          logger.error(`Failed to copy template ${filename}:`, error);
          throw error;
        }
      }
    }

    logger.success("✅ Templates initialized successfully!");
  } catch (error) {
    logger.error("Failed to initialize templates:", error);
    throw error;
  }
}

async function validateTemplates(params: {
  logger: LoggerService;
  registry: TemplateRegistry;
}): Promise<boolean> {
  const { logger, registry } = params;
  let isValid = true;

  try {
    // Force reload templates to ensure we're validating the current state
    await registry.loadTemplates();

    const templates = registry.getAllTemplates();
    logger.info(`\n🔍 Validating ${templates.length} templates...`);

    for (const template of templates) {
      try {
        // Basic validation
        if (!template.type || !template.template) {
          logger.error(`❌ Invalid template: ${template.id}`);
          logger.error("   Missing required fields: type or template");
          isValid = false;
          continue;
        }

        // Test template rendering with sample data
        const sampleData = {
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
          commits: [],
          baseBranch: "main",
        };

        // Use registry's renderTemplate method
        registry.renderTemplate({
          template,
          variables: sampleData,
        });

        logger.success(`✅ Template "${template.id}" is valid`);
      } catch (error) {
        logger.error(`❌ Template "${template.id}" validation failed:`, error);
        isValid = false;
      }
    }

    if (isValid) {
      logger.success("\n✨ All templates are valid!");
    } else {
      logger.error("\n⚠️  Some templates failed validation");
    }

    return isValid;
  } catch (error) {
    logger.error("Failed to validate templates:", error);
    return false;
  }
}

function listTemplates(params: {
  logger: LoggerService;
  registry: TemplateRegistry;
}): void {
  const { logger, registry } = params;

  try {
    const templates = registry.getAllTemplates();

    if (templates.length === 0) {
      logger.info("No templates found");
      return;
    }

    logger.info("\n📝 Available Templates:\n");

    // Group templates by type
    const groupedTemplates = templates.reduce(
      (acc, template) => {
        const choices = registry.getTemplateChoices({
          type: template.type,
          format: template.format,
        });
        acc[template.type] = acc[template.type] || [];
        acc[template.type].push({ template, choices });
        return acc;
      },
      {} as Record<
        string,
        Array<{
          template: PromptTemplate;
          choices: Array<{
            label: string;
            value: string;
            description?: string;
          }>;
        }>
      >,
    );

    // Display templates grouped by type
    for (const [type, typeTemplates] of Object.entries(groupedTemplates)) {
      logger.info(chalk.blue(`${type.toUpperCase()}`));

      for (const { template, choices } of typeTemplates) {
        const choice = choices.find((c) => c.value === template.id);
        logger.info(
          `  ${chalk.green(choice?.label ?? template.id)} ${chalk.gray(`(${template.format})`)}` +
            (choice?.description
              ? chalk.yellow(` ${choice.description}`)
              : "") +
            (template.title ? `\n    ${chalk.dim(template.title)}` : ""),
        );
      }
      logger.info("");
    }
  } catch (error) {
    logger.error("Failed to list templates:", error);
    throw error;
  }
}

export function createTemplateCommand(): Command {
  return new Command("template")
    .description("Manage GitGuard templates")
    .option("--init", "Initialize default templates")
    .option("--validate", "Validate existing templates")
    .option("--list", "List available templates")
    .option("--path <path>", "Custom template path")
    .action(async (options: TemplateCommandOptions) => {
      const logger = new LoggerService({ debug: options.debug });
      try {
        const config = await loadConfig();

        const git = new GitService({ logger, gitConfig: config.git });

        const templatePath =
          options.path ?? join(git.getCWD(), ".gitguard/templates");
        const registry = new TemplateRegistry({
          logger,
          gitRoot: git.getCWD(),
        });

        if (options.init) {
          await initializeTemplates({ logger, templatePath });
        }

        if (options.validate) {
          const isValid = await validateTemplates({ logger, registry });
          if (!isValid) {
            process.exit(1);
          }
        }

        if (options.list) {
          await registry.loadTemplates(); // Ensure templates are loaded
          listTemplates({ logger, registry });
        }

        // If no options specified, show help
        if (!options.init && !options.validate && !options.list) {
          logger.info(chalk.yellow("\nNo action specified. Use one of:"));
          logger.info("  --init      Initialize default templates");
          logger.info("  --validate  Validate existing templates");
          logger.info("  --list      List available templates");
        }
      } catch (error) {
        logger.error("Template command failed:", error);
        process.exit(1);
      }
    });
}
