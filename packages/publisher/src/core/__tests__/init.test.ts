import fs from "fs/promises";
import { Logger } from "../../utils/logger";
import { InitService } from "../init";
import { WorkspaceService } from "../workspace";

// Mock modules
jest.mock("fs/promises");
jest.mock("path", () => ({
  resolve: jest.fn().mockReturnValue("/mock/path"),
  parse: jest.fn().mockReturnValue({ root: "/" }),
  join: jest.fn().mockImplementation((...args) => args.join("/")),
}));

// Mock the Logger class
jest.mock("../../utils/logger", () => {
  return {
    Logger: jest.fn().mockImplementation(() => ({
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
      debug: jest.fn(),
    })),
  };
});

// Mock the WorkspaceService class
jest.mock("../workspace", () => {
  return {
    WorkspaceService: jest.fn().mockImplementation(() => ({
      getPackages: jest.fn(),
      getRootDir: jest.fn().mockReturnValue("/mock/path"),
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

    // Mock getRootDir to return a consistent path
    mockWorkspaceService.getRootDir.mockReturnValue("/mock/path");

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

      await expect(initService.initialize({ packages: [] })).rejects.toThrow(
        "No packages found to initialize",
      );
    });
  });
});
