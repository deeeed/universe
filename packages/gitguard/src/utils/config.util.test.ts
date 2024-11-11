import { promises as fs } from "fs";
import { homedir } from "os";
import { join } from "path";
import { PartialConfig } from "../types/config.types.js";
import {
  createConfig,
  getConfigPaths,
  getConfigStatus,
  getDefaultConfig,
  loadConfig,
} from "./config.util.js";
import * as gitUtil from "./git.util.js";

// Mock dependencies
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

jest.mock("os", () => ({
  homedir: jest.fn(),
}));

jest.mock("./git.util.js", () => ({
  isGitRepository: jest.fn(),
  getGitRoot: jest.fn(),
}));

describe("Config Util", () => {
  const mockHomedir = "/home/user";
  const mockGitRoot = "/project/root";

  beforeEach(() => {
    jest.resetAllMocks();
    (homedir as jest.Mock).mockReturnValue(mockHomedir);
    (gitUtil.isGitRepository as jest.Mock).mockReturnValue(true);
    (gitUtil.getGitRoot as jest.Mock).mockReturnValue(mockGitRoot);
    process.env = {};
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({}));
  });

  describe("getConfigPaths", () => {
    it("should return correct paths in a git repository", () => {
      const paths = getConfigPaths();
      expect(paths).toEqual({
        global: join(mockHomedir, ".gitguard", "config.json"),
        local: join(mockGitRoot, ".gitguard", "config.json"),
      });
    });

    it("should return only global path outside git repository", () => {
      (gitUtil.isGitRepository as jest.Mock).mockReturnValue(false);
      const paths = getConfigPaths();
      expect(paths).toEqual({
        global: join(mockHomedir, ".gitguard", "config.json"),
        local: null,
      });
    });
  });

  describe("createConfig", () => {
    it("should merge partial config with default config", () => {
      const partial: PartialConfig = {
        debug: true,
        git: {
          baseBranch: "develop",
        },
      };

      const config = createConfig({ partial });
      expect(config.debug).toBe(true);
      expect(config.git.baseBranch).toBe("develop");
      expect(config.git.cwd).toBe(mockGitRoot);
    });

    it("should override cwd when provided", () => {
      const customCwd = "/custom/path";
      const config = createConfig({ cwd: customCwd });
      expect(config.git.cwd).toBe(customCwd);
    });
  });

  describe("getConfigStatus", () => {
    it("should handle missing configs", async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(
        Object.assign(new Error("ENOENT: no such file or directory"), {
          code: "ENOENT",
        }),
      );

      const status = await getConfigStatus();
      expect(status.global.exists).toBe(false);
      expect(status.local.exists).toBe(false);

      const expectedConfig = getDefaultConfig(mockGitRoot);
      expect(status.effective).toEqual(expectedConfig);
    });

    it("should return correct config status", async () => {
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path.includes("home")) {
          return Promise.resolve(JSON.stringify({ debug: true }));
        }
        if (path.includes("root")) {
          return Promise.resolve(
            JSON.stringify({ git: { baseBranch: "develop" } }),
          );
        }
        return Promise.reject(
          Object.assign(new Error("ENOENT: no such file or directory"), {
            code: "ENOENT",
          }),
        );
      });

      const status = await getConfigStatus();
      expect(status.global.exists).toBe(true);
      expect(status.local.exists).toBe(true);
      expect(status.effective?.debug).toBe(true);
      expect(status.effective?.git.baseBranch).toBe("develop");
    });
  });

  describe("loadConfig", () => {
    const mockEnv = {
      GITGUARD_USE_AI: "true",
      AZURE_OPENAI_ENDPOINT: "https://api.azure.com",
      GITHUB_TOKEN: "mock-token",
      GITGUARD_SECURITY_ENABLED: "true",
    };

    beforeEach(() => {
      process.env = { ...mockEnv };
      (fs.readFile as jest.Mock).mockReset();
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({}));
    });

    it("should load config with environment variables", async () => {
      const config = await loadConfig();
      expect(config.ai.enabled).toBe(true);
      expect(config.ai.provider).toBe("azure");
      expect(config.git.github?.token).toBe("mock-token");
    });

    it("should load config from custom path", async () => {
      const customConfig = {
        debug: true,
        git: { baseBranch: "custom" },
      };
      (fs.readFile as jest.Mock).mockImplementation((path: string) => {
        if (path === "custom/path") {
          return Promise.resolve(JSON.stringify(customConfig));
        }
        return Promise.resolve(JSON.stringify({}));
      });

      const config = await loadConfig({ configPath: "custom/path" });
      expect(config.debug).toBe(true);
      expect(config.git.baseBranch).toBe("custom");
    });

    it("should disable AI if provider config is incomplete", async () => {
      process.env = {
        GITGUARD_USE_AI: "true",
      };

      const config = await loadConfig();
      expect(config.ai.enabled).toBe(false);
    });

    it("should throw error on invalid config", async () => {
      (fs.readFile as jest.Mock).mockResolvedValue("invalid json");

      await expect(loadConfig({ configPath: "custom/path" })).rejects.toThrow(
        "Failed to load configuration",
      );
    });
  });
});
