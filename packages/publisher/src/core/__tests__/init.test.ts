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
    })),
  };
});

// Mock the WorkspaceService class
jest.mock("../workspace", () => {
  return {
    WorkspaceService: jest.fn().mockImplementation(() => ({
      getPackages: jest.fn(),
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
      (fs.access as jest.Mock).mockRejectedValue(new Error("Not found"));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (path.join as jest.Mock).mockImplementation((...args: string[]) =>
        args.join("/"),
      );

      await initService.initialize(["@scope/pkg-a"]);

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("packages/pkg-a/publisher.config.ts"),
        expect.stringContaining("@scope/pkg-a"),
      );

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("packages/pkg-a/CHANGELOG.md"),
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

      await initService.initialize(["@scope/pkg-a"]);

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it("should handle no packages found", async () => {
      mockWorkspaceService.getPackages.mockResolvedValue([]);

      await expect(initService.initialize([])).rejects.toThrow(
        "No packages found to initialize",
      );
    });

    it("should create root config if it does not exist", async () => {
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

      // Mock fs.access to reject, simulating the file does not exist
      (fs.access as jest.Mock).mockRejectedValue(new Error("Not found"));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      // Run the initialize method
      await initService.initialize(["@scope/pkg-a"]);

      // Check that the last fs.writeFile call contains 'MonorepoConfig' in the content
      const lastWriteFileCall = (fs.writeFile as jest.Mock).mock.calls.at(
        -1,
      ) as [string, string] | undefined;
      expect(lastWriteFileCall).toBeDefined();
      expect(lastWriteFileCall?.[1]).toContain("MonorepoConfig");
    });
  });
});
