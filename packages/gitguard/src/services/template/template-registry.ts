import Handlebars from "handlebars";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { homedir } from "os";
import { parse as parseYaml } from "yaml";
import { Logger } from "../../types/logger.types.js";

import {
  PromptFormat,
  PromptTemplate,
  PromptType,
} from "../../types/templates.type.js";

interface TemplateRegistryOptions {
  logger: Logger;
  gitRoot: string;
}

export class TemplateRegistry {
  private templates: Map<string, PromptTemplate> = new Map();
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

  private async loadTemplatesFromDirectory(directory: string): Promise<void> {
    try {
      const files = await fs.readdir(directory);

      for (const file of files) {
        if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;

        try {
          const content = await fs.readFile(join(directory, file), "utf-8");
          const template = parseYaml(content) as PromptTemplate;

          if (!template.id || !template.type || !template.template) {
            this.logger.warn(
              `Invalid template in ${file}: missing required fields`,
            );
            continue;
          }

          this.templates.set(template.id, template);
          this.logger.debug(`Loaded template: ${template.id}`, template);
        } catch (error) {
          this.logger.warn(`Failed to load template ${file}:`, error);
        }
      }
    } catch (error) {
      this.logger.debug(`Template directory not found: ${directory}`);
    }
  }

  public async loadTemplates(): Promise<void> {
    const templatePaths = [
      join(this.gitRoot, ".gitguard/templates"),
      join(homedir(), ".gitguard/templates"),
    ];

    this.logger.debug("Loading templates from:", templatePaths);

    await Promise.all(
      templatePaths.map((path) => this.loadTemplatesFromDirectory(path)),
    );

    this.logger.debug(
      `Loaded ${this.templates.size} templates:`,
      Array.from(this.templates.keys()),
    );
  }

  public getTemplate<T extends PromptTemplate>(id: string): T | undefined {
    return this.templates.get(id) as T | undefined;
  }

  public getTemplateByType<T extends PromptTemplate>(
    type: PromptType,
    format: PromptFormat = "api",
  ): T | undefined {
    return Array.from(this.templates.values()).find(
      (t): t is T => t.type === type && t.format === format,
    );
  }

  public getAvailableTemplates(): Array<{
    id: string;
    type: PromptType;
    description?: string;
  }> {
    return Array.from(this.templates.values()).map(({ id, type, title }) => ({
      id,
      type,
      description: title,
    }));
  }

  private registerHelpers(): void {
    this.handlebars.registerHelper("json", function (context) {
      return JSON.stringify(context, null, 2);
    });

    this.handlebars.registerHelper("includes", function (arr, value) {
      return Array.isArray(arr) && arr.includes(value);
    });
  }

  public renderTemplate<T extends PromptTemplate>(params: {
    template: T;
    variables: T["variables"];
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
}
