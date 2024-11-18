import Handlebars from "handlebars";
import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
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
  skipGlobal?: boolean;
}

export class TemplateRegistry {
  private readonly templates: Map<string, LoadedPromptTemplate> = new Map();
  private readonly gitRoot: string;
  private readonly logger: Logger;
  private readonly handlebars: typeof Handlebars;
  private readonly skipGlobal: boolean;

  constructor({
    logger,
    gitRoot,
    skipGlobal = false,
  }: TemplateRegistryOptions) {
    this.logger = logger;
    this.gitRoot = gitRoot;
    this.skipGlobal = skipGlobal;
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
      ...(!this.skipGlobal
        ? [
            {
              path: join(homedir(), ".gitguard/templates"),
              source: "global" as const,
            },
          ]
        : []),
    ];

    this.logger.debug("🔍 Searching for templates in:", templatePaths);
    this.logger.debug("🔍 Include defaults:", includeDefaults);

    // First pass: load custom templates
    for (const { path, source } of templatePaths) {
      await this.loadTemplatesFromDirectory(path, source);
    }

    // Load default templates only for missing types/formats
    if (includeDefaults) {
      try {
        const defaultTemplates = await this.loadDefaultTemplates();

        // Only add default templates if no custom template exists for that type/format
        defaultTemplates.forEach((template) => {
          const existingTemplate = Array.from(this.templates.values()).find(
            (t) => t.type === template.type && t.format === template.format,
          );

          if (!existingTemplate) {
            this.templates.set(template.id, template);
            this.logger.debug(
              `📝 Added default template for ${template.type}.${template.format}`,
              {
                id: template.id,
                type: template.type,
                format: template.format,
                version: template.version,
              },
            );
          } else {
            this.logger.debug(
              `⏭️  Skipping default template for ${template.type}.${template.format} (custom template exists)`,
            );
          }
        });
      } catch (error) {
        this.logger.warn("Failed to load default templates:", error);
      }
    }

    const loadedTemplateCount = this.templates.size;
    if (loadedTemplateCount === 0) {
      this.logger.warn(
        "⚠️  No template files found in any search location.\n" +
          "💡 Create templates in .gitguard/templates/ to enable advanced AI features.\n" +
          "📂 Search locations:\n" +
          templatePaths.map((p) => `   - ${p.path}`).join("\n"),
      );
      return;
    }

    // Log success message and statistics
    const loadedTemplates = Array.from(this.templates.values());
    const templatesBySource = loadedTemplates.reduce(
      (acc, t) => {
        acc[t.source] = (acc[t.source] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    this.logger.debug(
      `✨ Successfully loaded ${loadedTemplateCount} templates:\n${loadedTemplates
        .map((t) => `  - ${t.title ?? t.id} (${t.type}, ${t.format})`)
        .join("\n")}`,
    );

    // Log template statistics
    this.logger.debug("📊 Template statistics:", {
      total: loadedTemplateCount,
      bySource: templatesBySource,
      byType: loadedTemplates.reduce(
        (acc, t) => {
          acc[t.type] = (acc[t.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    });
  }

  public getTemplatesForType(params: {
    type: PromptType;
    format: PromptFormat;
  }): LoadedPromptTemplate[] {
    const templates = Array.from(this.templates.values()).filter(
      (t) =>
        t.type === params.type &&
        t.format === params.format &&
        t.active !== false, // Only return active templates
    );

    if (templates.length === 0) {
      this.logger.debug(
        `ℹ️  No active templates found for type="${params.type}" format="${params.format}"`,
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
  }): { userPrompt: string; systemPrompt: string } {
    const { template, variables } = params;
    try {
      const compiledUserTemplate = this.handlebars.compile(template.template);
      const userPrompt = compiledUserTemplate({
        ...variables,
        logger: this.logger,
      });
      const compiledSystemTemplate = this.handlebars.compile(
        template.systemPrompt ?? "",
      );
      const systemPrompt = compiledSystemTemplate({
        ...variables,
        logger: this.logger,
      });
      return { userPrompt, systemPrompt };
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

    // Get the current file URL
    const currentFileUrl = new URL(import.meta.url);
    const isDev = currentFileUrl.pathname.includes("/src/");

    this.logger.debug("Loading default templates", {
      isDev,
      currentFileUrl,
    });

    // Define possible template locations
    const templateLocations = isDev
      ? [
          // Development paths
          new URL("../../templates", currentFileUrl).pathname,
        ]
      : [
          // Production paths - try both ESM and CJS paths
          join(dirname(currentFileUrl.pathname), "../templates"), // ESM path
          join(dirname(currentFileUrl.pathname), "../../templates"), // CJS path
          join(process.cwd(), "dist/templates"), // Fallback path
        ];

    let templatesDir: string | undefined;

    // Find first valid templates directory
    for (const location of templateLocations) {
      try {
        await fs.access(location);
        templatesDir = location;
        this.logger.debug(`📁 Found templates directory at: ${location}`);
        break;
      } catch {
        this.logger.debug(`📁 No templates found at: ${location}`);
        continue;
      }
    }

    if (!templatesDir) {
      this.logger.warn(
        "⚠️  Could not find templates directory in any location:",
        templateLocations,
      );
      return defaultTemplates;
    }

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
      // Create a clean template object without source / path / id
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
