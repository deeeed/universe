import Handlebars from "handlebars";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { homedir } from "os";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { Logger } from "../../types/logger.types.js";
import { registerHandlebarsHelpers } from "../../utils/handlebars-helpers.util.js";

import {
  BasePromptTemplate,
  LoadedPromptTemplate,
  PromptFormat,
  PromptTemplate,
  PromptType,
  TemplateVariables,
} from "../../types/templates.type.js";

interface TemplateRegistryOptions {
  logger: Logger;
  gitRoot: string;
}

export class TemplateRegistry {
  private readonly templates: Map<string, LoadedPromptTemplate> = new Map();
  private readonly gitRoot: string;
  private readonly logger: Logger;
  private readonly handlebars: typeof Handlebars;

  constructor({ logger, gitRoot }: TemplateRegistryOptions) {
    this.logger = logger;
    this.gitRoot = gitRoot;
    this.handlebars = Handlebars.create();
    registerHandlebarsHelpers({ handlebars: this.handlebars });

    this.logger.debug("Initializing TemplateRegistry", {
      gitRoot: this.gitRoot,
    });
  }

  private generateTemplateId(
    file: string,
    template: Partial<PromptTemplate>,
  ): string {
    const baseName = file.replace(/\.(ya?ml)$/, "");

    if (template.type && template.format) {
      return `${template.type}.${template.format}.${baseName}`;
    }

    const parts = baseName.split(".");
    const type = template.type ?? parts[0];
    const format = template.format ?? parts[1] ?? "api";

    return `${type}.${format}.${baseName}`;
  }

  private async loadTemplatesFromDirectory(
    directory: string,
    source: "project" | "global",
  ): Promise<void> {
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

          const completeTemplate: LoadedPromptTemplate = {
            ...(template as PromptTemplate),
            id: templateId,
            source,
            path: join(directory, file),
          };

          this.templates.set(templateId, completeTemplate);

          this.logger.debug(
            `📝 Loaded template "${completeTemplate.title ?? templateId}"`,
            {
              id: templateId,
              type: completeTemplate.type,
              format: completeTemplate.format,
              version: completeTemplate.version,
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

  public async loadTemplates(params?: {
    includeDefaults?: boolean;
  }): Promise<void> {
    const { includeDefaults = false } = params ?? {};
    const templatePaths = [
      {
        path: join(this.gitRoot, ".gitguard/templates"),
        source: "project" as const,
      },
      {
        path: join(homedir(), ".gitguard/templates"),
        source: "global" as const,
      },
    ];

    this.logger.debug("🔍 Searching for templates in:", templatePaths);
    this.logger.debug("🔍 Include defaults:", includeDefaults);

    let templatesFound = false;
    let totalYamlFiles = 0;
    const foundPaths: Array<{ path: string; source: "project" | "global" }> =
      [];

    // First pass: check which directories have template files
    for (const { path, source } of templatePaths) {
      try {
        const files = await fs.readdir(path);
        const yamlFiles = files.filter(
          (file) => file.endsWith(".yml") || file.endsWith(".yaml"),
        );

        if (yamlFiles.length > 0) {
          templatesFound = true;
          totalYamlFiles += yamlFiles.length;
          foundPaths.push({ path, source });
          this.logger.debug(
            `📁 Found ${yamlFiles.length} template files in ${path}:`,
            yamlFiles.map((f) => `\n  - ${f}`).join(""),
          );
        }
      } catch (error) {
        this.logger.debug(`📁 No templates found in ${path}`);
      }
    }

    // Load default templates if requested
    if (includeDefaults) {
      try {
        const defaultTemplates = await this.loadDefaultTemplates();
        defaultTemplates.forEach((template) => {
          this.templates.set(template.id, template);
          totalYamlFiles++; // Include default templates in the count
        });
        templatesFound = templatesFound || defaultTemplates.size > 0;
      } catch (error) {
        this.logger.warn("Failed to load default templates:", error);
      }
    }

    if (!templatesFound) {
      this.logger.warn(
        "⚠️  No template files found in any search location.\n" +
          "💡 Create templates in .gitguard/templates/ to enable advanced AI features.\n" +
          "📂 Search locations:\n" +
          templatePaths.map((p) => `   - ${p.path}`).join("\n"),
      );
      return;
    }

    // Second pass: load the templates from directories that had YAML files
    await Promise.all(
      foundPaths.map(({ path, source }) =>
        this.loadTemplatesFromDirectory(path, source),
      ),
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
        searchPaths: foundPaths.map(({ path }) => path),
        successRate,
      });
    }
  }

  public getTemplatesForType(params: {
    type: PromptType;
    format: PromptFormat;
  }): LoadedPromptTemplate[] {
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

  public getTemplateById(params: {
    id: string;
  }): LoadedPromptTemplate | undefined {
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
  }): LoadedPromptTemplate | undefined {
    const templates = this.getTemplatesForType(params);
    return templates[0]; // Return first template as default
  }

  public renderTemplate(params: {
    template: LoadedPromptTemplate;
    variables: TemplateVariables;
  }): string {
    const { template, variables } = params;
    try {
      const compiledTemplate = this.handlebars.compile(template.template);
      return compiledTemplate({ ...variables, logger: this.logger });
    } catch (error) {
      this.logger.error("Failed to render template:", error);
      throw new Error(`Failed to render template: ${(error as Error).message}`);
    }
  }

  public getAllTemplates(): LoadedPromptTemplate[] {
    return Array.from(this.templates.values());
  }

  public async loadDefaultTemplates(): Promise<
    Map<string, LoadedPromptTemplate>
  > {
    const defaultTemplates = new Map<string, LoadedPromptTemplate>();
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

          const completeTemplate: LoadedPromptTemplate = {
            ...(template as PromptTemplate),
            id: templateId,
            source: "default",
            path: join(templatesDir, file),
          };

          defaultTemplates.set(templateId, completeTemplate);

          this.logger.debug(
            `📝 Loaded default template "${completeTemplate.title ?? templateId}"`,
            {
              id: templateId,
              type: completeTemplate.type,
              format: completeTemplate.format,
              version: completeTemplate.version,
            },
          );
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
    template: LoadedPromptTemplate;
    path: string;
  }): Promise<void> {
    const { template, path } = params;
    const filename = `${template.type}.${template.format}.yml`;
    const filePath = join(path, filename);

    try {
      // Create a clean template object without source and path
      const {
        source: _source,
        path: _templatePath,
        id: _id,
        ...cleanTemplate
      } = template;

      // Convert to YAML with proper formatting
      const yamlContent = stringifyYaml(cleanTemplate);

      await fs.writeFile(filePath, yamlContent);
    } catch (error) {
      this.logger.error(`Failed to save template ${filename}:`, error);
      throw error;
    }
  }
}