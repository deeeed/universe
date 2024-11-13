import Handlebars from "handlebars";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { homedir } from "os";
import { parse as parseYaml } from "yaml";
import { Logger } from "../../types/logger.types.js";

import {
  BasePromptTemplate,
  PromptFormat,
  PromptTemplate,
  PromptType,
} from "../../types/templates.type.js";

interface TemplateRegistryOptions {
  logger: Logger;
  gitRoot: string;
}

export class TemplateRegistry {
  private readonly templates: Map<string, PromptTemplate> = new Map();
  private readonly gitRoot: string;
  private readonly logger: Logger;
  private readonly handlebars: typeof Handlebars;

  constructor({ logger, gitRoot }: TemplateRegistryOptions) {
    this.logger = logger;
    this.gitRoot = gitRoot;
    this.handlebars = Handlebars.create();
    this.registerHelpers();

    this.logger.debug("Initializing TemplateRegistry", {
      gitRoot: this.gitRoot,
    });
  }

  private generateTemplateId(
    file: string,
    template: Partial<PromptTemplate>,
  ): string {
    const type = template.type ?? file.split(".")[0];
    const format = template.format ?? file.split(".")[1] ?? "api";
    return `${type}.${format}.${file.replace(/\.(ya?ml)$/, "")}`;
  }

  private async loadTemplatesFromDirectory(directory: string): Promise<void> {
    try {
      const files = await fs.readdir(directory);
      const yamlFiles = files.filter(
        (f) => f.endsWith(".yml") || f.endsWith(".yaml"),
      );

      for (const file of yamlFiles) {
        try {
          const content = await fs.readFile(join(directory, file), "utf-8");
          const template = parseYaml(content) as BasePromptTemplate;

          if (!template.type || !template.template) {
            this.logger.warn(
              `⚠️  Invalid template in ${file}: missing required fields (type or template)`,
            );
            continue;
          }

          const templateId =
            template.id ?? this.generateTemplateId(file, template);

          const completeTemplate: PromptTemplate = {
            ...template,
            id: templateId,
            variables: {
              files: [],
              diff: "",
              commits: [],
              baseBranch: "main",
            },
          } as PromptTemplate;

          this.templates.set(templateId, completeTemplate);

          this.logger.debug(
            `📝 Loaded template "${template.title ?? templateId}"`,
            {
              id: templateId,
              type: template.type,
              format: template.format,
              version: template.version,
            },
          );
        } catch (error) {
          this.logger.warn(`❌ Failed to load template ${file}:`, error);
        }
      }
    } catch (error) {
      this.logger.debug(`📁 Template directory not found: ${directory}`);
    }
  }

  public async loadTemplates(): Promise<void> {
    const templatePaths = [
      join(this.gitRoot, ".gitguard/templates"),
      join(homedir(), ".gitguard/templates"),
    ];

    this.logger.debug("🔍 Searching for templates in:", templatePaths);

    let templatesFound = false;
    let totalYamlFiles = 0;
    const foundPaths: string[] = [];

    // First pass: check which directories have template files
    for (const path of templatePaths) {
      try {
        const files = await fs.readdir(path);
        const yamlFiles = files.filter(
          (file) => file.endsWith(".yml") || file.endsWith(".yaml"),
        );

        if (yamlFiles.length > 0) {
          templatesFound = true;
          totalYamlFiles += yamlFiles.length;
          foundPaths.push(path);
          this.logger.debug(
            `📁 Found ${yamlFiles.length} template files in ${path}:`,
            yamlFiles.map((f) => `\n  - ${f}`).join(""),
          );
        }
      } catch (error) {
        this.logger.debug(`📁 No templates found in ${path}`);
      }
    }

    if (!templatesFound) {
      this.logger.warn(
        "⚠️  No template files found in any search location.\n" +
          "💡 Create templates in .gitguard/templates/ to enable advanced AI features.\n" +
          "📂 Search locations:\n" +
          templatePaths.map((p) => `   - ${p}`).join("\n"),
      );
      return;
    }

    // Second pass: load the templates from directories that had YAML files
    await Promise.all(
      foundPaths.map((path) => this.loadTemplatesFromDirectory(path)),
    );

    const loadedTemplateCount = this.templates.size;
    const loadedTemplates = Array.from(this.templates.values());

    if (loadedTemplateCount === 0) {
      this.logger.warn(
        "⚠️  Found template files but none were valid.\n" +
          "💡 Please check your template files for proper YAML formatting and required fields.",
      );
    } else {
      const successRate = Math.round(
        (loadedTemplateCount / totalYamlFiles) * 100,
      );
      this.logger.info(
        `✨ Successfully loaded ${loadedTemplateCount}/${totalYamlFiles} templates (${successRate}%):\n${loadedTemplates
          .map((t) => `  - ${t.title ?? t.id} (${t.type}, ${t.format})`)
          .join("\n")}`,
      );

      // Log template statistics by type
      const templatesByType = loadedTemplates.reduce(
        (acc, template) => {
          acc[template.type] = (acc[template.type] || 0) + 1;
          return acc;
        },
        {} as Record<PromptType, number>,
      );

      this.logger.debug("📊 Template statistics:", {
        total: loadedTemplateCount,
        byType: templatesByType,
        searchPaths: foundPaths,
        successRate,
      });
    }
  }

  public getTemplatesForType(params: {
    type: PromptType;
    format: PromptFormat;
  }): PromptTemplate[] {
    const templates = Array.from(this.templates.values()).filter(
      (t) => t.type === params.type && t.format === params.format,
    );

    if (templates.length === 0) {
      this.logger.debug(
        `ℹ️  No templates found for type="${params.type}" format="${params.format}"`,
      );
    }

    return templates;
  }

  public getTemplateById(params: { id: string }): PromptTemplate | undefined {
    return this.templates.get(params.id);
  }

  public getTemplateChoices(params: {
    type: PromptType;
    format: PromptFormat;
  }): Array<{
    label: string;
    value: string;
    description?: string;
  }> {
    const templates = this.getTemplatesForType(params);
    return templates.map((template) => ({
      label: template.title ?? template.id,
      value: template.id,
      description: template.version ? `v${template.version}` : undefined,
    }));
  }

  public getDefaultTemplate(params: {
    type: PromptType;
    format: PromptFormat;
  }): PromptTemplate | undefined {
    const templates = this.getTemplatesForType(params);
    return templates[0]; // Return first template as default
  }

  public renderTemplate(params: {
    template: PromptTemplate;
    variables: PromptTemplate["variables"];
  }): string {
    const { template, variables } = params;
    try {
      const compiledTemplate = this.handlebars.compile(template.template);
      return compiledTemplate(variables);
    } catch (error) {
      this.logger.error("Failed to render template:", error);
      throw new Error(`Failed to render template: ${(error as Error).message}`);
    }
  }

  private registerHelpers(): void {
    this.handlebars.registerHelper("json", function (context) {
      return JSON.stringify(context, null, 2);
    });

    this.handlebars.registerHelper("includes", function (arr, value) {
      return Array.isArray(arr) && arr.includes(value);
    });
  }

  public getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  public async loadDefaultTemplates(): Promise<Map<string, PromptTemplate>> {
    const defaultTemplates = new Map<string, PromptTemplate>();
    const templatesDir = new URL("../../templates", import.meta.url).pathname;

    try {
      const files = await fs.readdir(templatesDir);
      const yamlFiles = files.filter(
        (f) => f.endsWith(".yml") || f.endsWith(".yaml"),
      );

      for (const file of yamlFiles) {
        try {
          const content = await fs.readFile(join(templatesDir, file), "utf-8");
          const template = parseYaml(content) as BasePromptTemplate;

          if (!template.type || !template.template) {
            this.logger.warn(`⚠️  Invalid default template in ${file}`);
            continue;
          }

          const templateId =
            template.id ?? this.generateTemplateId(file, template);
          defaultTemplates.set(templateId, template as PromptTemplate);
        } catch (error) {
          this.logger.warn(
            `❌ Failed to load default template ${file}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error("Failed to load default templates:", error);
    }

    return defaultTemplates;
  }

  public async saveTemplate(params: {
    template: PromptTemplate;
    path: string;
  }): Promise<void> {
    const { template, path } = params;
    const filename = `${template.type}.${template.format}.yml`;
    const filePath = join(path, filename);

    try {
      await fs.writeFile(filePath, JSON.stringify(template, null, 2));
    } catch (error) {
      this.logger.error(`Failed to save template ${filename}:`, error);
      throw error;
    }
  }
}
