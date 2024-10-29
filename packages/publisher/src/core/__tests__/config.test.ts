import fs from "fs";
import path from "path";
import { loadConfig } from "../config";
import type { MonorepoConfig } from "../../types/config";

// Mock fs and path
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
  },
}));
jest.mock("path");

// Mock ts-node/register
jest.mock("ts-node/register", () => {
  return {};
});

describe("Config Loading", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    // Reset dynamic imports
    jest.isolateModules(() => {
      require("../config");
    });
  });

  it("should load default config when no config file exists", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const config = await loadConfig();
    expect(config).toMatchObject({
      packageManager: "yarn",
      changelogFile: "CHANGELOG.md",
      conventionalCommits: true,
    });
  });

  it("should load and validate TS config with default export", async () => {
    const mockConfig: MonorepoConfig = {
      packageManager: "yarn",
      changelogFile: "CHANGES.md",
      conventionalCommits: true,
      changelogFormat: "conventional",
      versionStrategy: "independent",
      bumpStrategy: "prompt",
      git: {
        tagPrefix: "v",
        requireCleanWorkingDirectory: false,
        requireUpToDate: true,
        commit: true,
        push: true,
        commitMessage: "chore(release): ${version}",
        tag: true,
        allowedBranches: ["main"],
        remote: "origin",
        tagMessage: "Release ${version}",
      },
      npm: {
        publish: true,
        registry: "https://registry.npmjs.org",
        tag: "latest",
        access: "public",
      },
      hooks: {},
      packages: {},
      ignorePackages: [],
      maxConcurrency: 4,
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (path.join as jest.Mock).mockReturnValue("/fake/path/publisher.config.ts");
    (path.extname as jest.Mock).mockReturnValue(".ts");

    jest.mock(
      "/fake/path/publisher.config.ts",
      () => ({
        __esModule: true,
        default: mockConfig,
      }),
      { virtual: true },
    );

    const config = await loadConfig();
    expect(config).toMatchObject(mockConfig);
  });

  it("should load and validate JS config with direct exports", async () => {
    const mockConfig: Partial<MonorepoConfig> = {
      packageManager: "npm",
      changelogFile: "CHANGELOG.md",
      conventionalCommits: true,
      git: {
        tagPrefix: "v",
        requireCleanWorkingDirectory: true,
        requireUpToDate: true,
        commit: true,
        push: true,
        commitMessage: "chore(release): ${version}",
        tag: true,
        allowedBranches: ["main"],
        remote: "origin",
      },
      npm: {
        publish: true,
        registry: "https://registry.npmjs.org",
        tag: "latest",
        access: "public",
      },
      hooks: {},
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (path.join as jest.Mock).mockReturnValue("/fake/path/publisher.config.js");
    (path.extname as jest.Mock).mockReturnValue(".js");

    // Mock dynamic imports
    jest.mock("/fake/path/publisher.config.js", () => mockConfig, {
      virtual: true,
    });

    const config = await loadConfig();
    expect(config).toMatchObject(mockConfig);
  });

  it("should load and validate JSON config", async () => {
    const mockConfig: MonorepoConfig = {
      packageManager: "pnpm",
      changelogFile: "CHANGELOG.md",
      conventionalCommits: true,
      changelogFormat: "conventional",
      versionStrategy: "independent",
      bumpStrategy: "prompt",
      git: {
        tagPrefix: "v",
        requireCleanWorkingDirectory: true,
        requireUpToDate: true,
        commit: true,
        push: true,
        commitMessage: "chore(release): ${version}",
        tag: true,
        allowedBranches: ["main"],
        remote: "origin",
        tagMessage: "Release ${version}",
      },
      npm: {
        publish: true,
        registry: "https://registry.npmjs.org",
        tag: "latest",
        access: "public",
      },
      hooks: {},
      packages: {},
      ignorePackages: [],
      maxConcurrency: 4,
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (path.join as jest.Mock).mockReturnValue(
      "/fake/path/publisher.config.json",
    );
    (path.extname as jest.Mock).mockReturnValue(".json");
    (fs.promises.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify(mockConfig),
    );

    const config = await loadConfig();
    expect(config).toMatchObject(mockConfig);
  });

  it("should throw error for invalid config", async () => {
    const invalidConfig = {
      packageManager: 123, // Should be a string
    };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (path.join as jest.Mock).mockReturnValue("/fake/path/publisher.config.js");
    (path.extname as jest.Mock).mockReturnValue(".js");

    // Mock dynamic imports
    jest.mock("/fake/path/publisher.config.js", () => invalidConfig, {
      virtual: true,
    });

    await expect(loadConfig()).rejects.toThrow(/Invalid configuration/);
  });

  it("should throw error when config file cannot be loaded", async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (path.join as jest.Mock).mockReturnValue("/fake/path/publisher.config.js");
    (path.extname as jest.Mock).mockReturnValue(".js");

    // Mock dynamic imports to throw error
    jest.mock(
      "/fake/path/publisher.config.js",
      () => {
        throw new Error("Module not found");
      },
      { virtual: true },
    );

    await expect(loadConfig()).rejects.toThrow(/Failed to load config/);
  });
});
