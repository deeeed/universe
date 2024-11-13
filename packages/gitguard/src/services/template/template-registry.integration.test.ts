import { stringify as stringifyYaml } from "yaml";
import {
  BaseTestEnvironment,
  setupGitTestEnvironment,
} from "../../test/test-integration.utils.js";
import { CommitTemplate } from "../../types/templates.type.js";
import { TemplateRegistry } from "./template-registry.js";
import { GitService } from "../git.service.js";

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
      const template = registry.getTemplate<CommitTemplate>("test-commit");
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

      const template = newRegistry.getTemplate("test-commit");
      expect(template).toBeDefined();
    });
  });

  describe("template rendering", () => {
    it("should render template with variables", () => {
      const template = registry.getTemplate<CommitTemplate>("test-commit");
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

      const template = newRegistry.getTemplate<CommitTemplate>("helper-test");
      expect(template).toBeDefined();

      if (!template) {
        throw new Error("Template not found");
      }

      const result = newRegistry.renderTemplate({
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
      const templates = registry.getAvailableTemplates();
      expect(templates).toContainEqual({
        id: "test-commit",
        type: "commit",
      });
    });

    it("should find template by type and format", () => {
      const template = registry.getTemplateByType("commit", "api");
      expect(template).toBeDefined();
      expect(template?.id).toBe("test-commit");
    });

    it("should return undefined for non-existent template type", () => {
      const template = registry.getTemplateByType("split-commit", "api");
      expect(template).toBeUndefined();
    });
  });
});
