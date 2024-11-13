import { promises as fs } from "node:fs";
import { PromptTemplate, PromptType } from "../../types/templates.type.js";
import { TemplateRegistry } from "./template-registry.js";

// Mock fs, path, and os modules
jest.mock("node:fs", () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

jest.mock("node:path", () => ({
  join: jest.fn().mockImplementation((...args) => args.join("/")),
}));

jest.mock("os", () => ({
  homedir: jest.fn().mockReturnValue("/home/user"),
}));

// Mock git util
jest.mock("../../utils/git.util.js", () => ({
  getGitRootSync: jest.fn().mockReturnValue("/project/root"),
}));

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
  warning: jest.fn(),
  raw: jest.fn(),
  newLine: jest.fn(),
  table: jest.fn(),
  isDebug: jest.fn(),
} as const;

describe("TemplateRegistry", () => {
  const validTemplate: PromptTemplate = {
    id: "test-template",
    type: "commit" as PromptType,
    format: "api",
    ai: {
      systemPrompt: "You are a helpful assistant",
    },
    template: "Template content",
    variables: {
      files: [],
      diff: "",
      commits: [],
      baseBranch: "main",
    },
  };
  const gitRoot = "/project/root";

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock readdir to return different files for each directory
    (fs.readdir as jest.Mock).mockImplementation((path: string) => {
      if (path.includes("templates")) {
        return Promise.resolve(["commit.yml", "pr.yaml", "invalid.txt"]);
      }
      return Promise.resolve([]);
    });
  });

  describe("loadTemplates", () => {
    it("should load valid templates from all directories", async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(validTemplate),
      );

      const registry = new TemplateRegistry({
        logger: mockLogger,
        gitRoot,
      });
      await registry.loadTemplates();

      expect(fs.readdir).toHaveBeenCalledWith(
        expect.stringContaining("templates"),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Loaded template:"),
        expect.any(Object),
      );
    });

    it("should handle invalid template files gracefully", async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("Invalid YAML"));

      const registry = new TemplateRegistry({
        logger: mockLogger,
        gitRoot,
      });
      await registry.loadTemplates();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load template"),
        expect.any(Error),
      );
    });

    it("should validate templates before adding them", async () => {
      const invalidTemplate = { id: "invalid" }; // Missing required fields
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(invalidTemplate),
      );

      const registry = new TemplateRegistry({
        logger: mockLogger,
        gitRoot,
      });
      await registry.loadTemplates();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Invalid template in commit.yml: missing required fields",
      );
    });
  });

  describe("getTemplate", () => {
    it("should return template by id", async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(validTemplate),
      );

      const registry = new TemplateRegistry({
        logger: mockLogger,
        gitRoot,
      });
      await registry.loadTemplates();

      const template = registry.getTemplate(validTemplate.id);
      expect(template).toEqual(validTemplate);
    });

    it("should return undefined for non-existent template", async () => {
      const registry = new TemplateRegistry({
        logger: mockLogger,
        gitRoot,
      });
      await registry.loadTemplates();

      const template = registry.getTemplate("non-existent");
      expect(template).toBeUndefined();
    });
  });

  describe("getTemplateByType", () => {
    it("should return template by type and format", async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(validTemplate),
      );

      const registry = new TemplateRegistry({
        logger: mockLogger,
        gitRoot,
      });
      await registry.loadTemplates();

      const template = registry.getTemplateByType("commit", "api");
      expect(template).toEqual(validTemplate);
    });

    it("should return undefined for non-existent type", async () => {
      const registry = new TemplateRegistry({
        logger: mockLogger,
        gitRoot,
      });
      await registry.loadTemplates();

      const template = registry.getTemplateByType(
        "non-existent" as PromptType,
        "api",
      );
      expect(template).toBeUndefined();
    });
  });

  describe("getAvailableTemplates", () => {
    it("should return list of available templates", async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({ ...validTemplate, title: "Test Template" }),
      );

      const registry = new TemplateRegistry({
        logger: mockLogger,
        gitRoot,
      });
      await registry.loadTemplates();

      const templates = registry.getAvailableTemplates();
      expect(templates).toEqual([
        {
          id: validTemplate.id,
          type: validTemplate.type,
          description: "Test Template",
        },
      ]);
    });
  });
});
