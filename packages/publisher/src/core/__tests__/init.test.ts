import fs from "fs/promises";
import { Logger } from "../../utils/logger";
import { InitService } from "../init";
import { WorkspaceService } from "../workspace";

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
    it("should handle no packages found", async () => {
      mockWorkspaceService.getPackages.mockResolvedValue([]);

      await expect(initService.initialize([])).rejects.toThrow(
        "No packages found to initialize",
      );
    });
  });
});
