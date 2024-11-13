import { stringify as stringifyYaml } from "yaml";
import {
  BaseTestEnvironment,
  setupGitTestEnvironment,
} from "../../test/test-integration.utils.js";
import { CommitTemplate, PromptType } from "../../types/templates.type.js";
import { GitService } from "../git.service.js";
import { TemplateRegistry } from "./template-registry.js";

describe("TemplateRegistry Integration", () => {
  const sampleTemplate: CommitTemplate = {
    id: "test-commit",
    type: "commit",
    format: "api",
    ai: {
      systemPrompt: "You are a commit message assistant",
    },
    template: "Changes:\n{{#each files}}- {{this.path}}\n{{/each}}",
    variables: {
      files: [],
      diff: "",
      commits: [],
      baseBranch: "main",
    },
  };

  let env: BaseTestEnvironment & { gitService: GitService };
  let registry: TemplateRegistry;

  beforeEach(async () => {
    // Setup test environment with Git
    env = await setupGitTestEnvironment();

    // Create template directory and file
    await env.createFiles([
      {
        path: ".gitguard/templates/test-commit.yml",
        content: stringifyYaml(sampleTemplate),
      },
    ]);

    // Add and commit the template
    await env.gitService.execGit({
      command: "add",
      args: [".gitguard"],
    });
    await env.gitService.createCommit({ message: "Add template files" });

    // Initialize registry with correct git root
    registry = new TemplateRegistry({
      logger: env.logger,
      gitRoot: env.tempDir,
    });
    await registry.loadTemplates();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe("template loading", () => {
    it("should load templates from project directory", () => {
      const template = registry.getTemplateById({ id: "test-commit" });
      expect(template).toBeDefined();
      expect(template?.id).toBe("test-commit");
      expect(template?.type).toBe("commit");
    });

    it("should handle invalid template files gracefully", async () => {
      await env.createFiles([
        {
          path: ".gitguard/templates/invalid.yml",
          content: "invalid: yaml: content",
        },
      ]);

      await env.gitService.execGit({
        command: "add",
        args: [".gitguard/templates/invalid.yml"],
      });
      await env.gitService.createCommit({ message: "Add invalid template" });

      const newRegistry = new TemplateRegistry({
        logger: env.logger,
        gitRoot: env.tempDir,
      });
      await newRegistry.loadTemplates();

      const template = newRegistry.getTemplateById({ id: "test-commit" });
      expect(template).toBeDefined();
    });
  });

  describe("template rendering", () => {
    it("should render template with variables", () => {
      const template = registry.getTemplateById({ id: "test-commit" });
      expect(template).toBeDefined();

      if (!template) {
        throw new Error("Template not found");
      }

      const result = registry.renderTemplate({
        template,
        variables: {
          files: [
            {
              path: "test.txt",
              additions: 1,
              deletions: 0,
              isTest: false,
              isConfig: false,
            },
          ],
          diff: "test diff",
          commits: [],
          baseBranch: "main",
        },
      });

      expect(result).toContain("Changes:");
      expect(result).toContain("- test.txt");
    });

    it("should handle handlebars helpers", async () => {
      const helperTemplate: CommitTemplate = {
        ...sampleTemplate,
        id: "helper-test",
        template: "{{{json files}}}",
      };

      await env.createFiles([
        {
          path: ".gitguard/templates/helper-test.yml",
          content: stringifyYaml(helperTemplate),
        },
      ]);

      await env.gitService.execGit({
        command: "add",
        args: [".gitguard/templates/helper-test.yml"],
      });
      await env.gitService.createCommit({ message: "Add helper template" });

      const newRegistry = new TemplateRegistry({
        logger: env.logger,
        gitRoot: env.tempDir,
      });
      await newRegistry.loadTemplates();

      const template = newRegistry.getTemplateById({ id: "helper-test" });
      expect(template).toBeDefined();

      if (!template) {
        throw new Error("Template not found");
      }

      const result = registry.renderTemplate({
        template,
        variables: {
          files: [
            {
              path: "test.txt",
              additions: 1,
              deletions: 0,
              isTest: false,
              isConfig: false,
            },
          ],
          diff: "",
          commits: [],
          baseBranch: "main",
        },
      });

      expect(result).toContain('"path": "test.txt"');
    });
  });

  describe("template discovery", () => {
    it("should list available templates", () => {
      const templates = registry.getTemplatesForType({
        type: "commit",
        format: "api",
      });
      expect(templates).toHaveLength(1);
      expect(templates[0]).toMatchObject({
        id: "test-commit",
        type: "commit",
      });
    });

    it("should find template by type and format", () => {
      const templates = registry.getTemplatesForType({
        type: "commit",
        format: "api",
      });
      expect(templates[0]).toBeDefined();
      expect(templates[0]?.id).toBe("test-commit");
    });

    it("should return empty array for non-existent type", () => {
      const templates = registry.getTemplatesForType({
        type: "split-commit" as PromptType,
        format: "api",
      });
      expect(templates).toHaveLength(0);
    });
  });
});
