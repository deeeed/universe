import { InitService } from "../init";
import { Logger } from "../../utils/logger";
import { WorkspaceService } from "../workspace";
import fs from "fs/promises";
import path from "path";

// Mock modules
jest.mock("fs/promises");
jest.mock("path");

// Mock the Logger class
jest.mock("../../utils/logger", () => {
  return {
    Logger: jest.fn().mockImplementation(() => ({
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
      debug: jest.fn(), // Add debug method if your Logger uses it
    })),
  };
});

// Mock the WorkspaceService class
jest.mock("../workspace", () => {
  return {
    WorkspaceService: jest.fn().mockImplementation(() => ({
      getPackages: jest.fn(),
      getRootDir: jest.fn(), // Mock getRootDir
      // Add other methods if necessary
    })),
  };
});

describe("InitService", () => {
  let initService: InitService;
  let mockLogger: jest.Mocked<Logger>;
  let mockWorkspaceService: jest.Mocked<WorkspaceService>;

  beforeEach(() => {
    // Create mocked instances with explicit typing
    mockLogger = new Logger() as jest.Mocked<Logger>;
    mockWorkspaceService =
      new WorkspaceService() as jest.Mocked<WorkspaceService>;

    initService = new InitService(mockLogger, mockWorkspaceService);

    jest.clearAllMocks();

    // Add mock for fs.readFile
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        name: "@scope/pkg-a",
        version: "1.0.0",
      }),
    );
  });

  describe("initialize", () => {
    it("should initialize specified packages", async () => {
      const mockPackages = [
        {
          name: "@scope/pkg-a",
          path: "packages/pkg-a",
          currentVersion: "1.0.0",
          dependencies: {},
          devDependencies: {},
          peerDependencies: {},
        },
      ];

      mockWorkspaceService.getPackages.mockResolvedValue(mockPackages);
      mockWorkspaceService.getRootDir.mockResolvedValue(
        "/path/to/monorepo/root",
      );

      // Mock path.join to properly concatenate paths
      (path.join as jest.Mock).mockImplementation((...args: string[]) =>
        args.join("/").replace(/\/+/g, "/"),
      );

      (fs.access as jest.Mock).mockRejectedValue(new Error("Not found"));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await initService.initialize(["@scope/pkg-a"]);

      // Check if mkdir was called with the correct paths
      const mkdirCalls = (fs.mkdir as jest.Mock).mock.calls as Array<
        [string, { recursive: boolean }]
      >;
      expect(mkdirCalls).toContainEqual([
        "packages/pkg-a/.publisher",
        { recursive: true },
      ]);
      expect(mkdirCalls).toContainEqual([
        "packages/pkg-a/.publisher/hooks",
        { recursive: true },
      ]);

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(
          "/path/to/monorepo/root/packages/pkg-a/publisher.config.ts",
        ),
        expect.stringContaining("@scope/pkg-a"),
      );

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(
          "/path/to/monorepo/root/packages/pkg-a/CHANGELOG.md",
        ),
        expect.stringContaining("# Changelog"),
      );
    });

    it("should not overwrite existing config without force option", async () => {
      const mockPackages = [
        {
          name: "@scope/pkg-a",
          path: "packages/pkg-a",
          currentVersion: "1.0.0",
          dependencies: {},
          devDependencies: {},
          peerDependencies: {},
        },
      ];

      mockWorkspaceService.getPackages.mockResolvedValue(mockPackages);
      (fs.access as jest.Mock).mockResolvedValue(undefined); // File exists

      // Mock fs.readFile for package.json
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({
          name: "@scope/pkg-a",
          version: "1.0.0",
        }),
      );

      await initService.initialize(["@scope/pkg-a"]);

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it("should handle no packages found", async () => {
      mockWorkspaceService.getPackages.mockResolvedValue([]);

      await expect(initService.initialize([])).rejects.toThrow(
        "No packages found to initialize",
      );
    });
  });
});
