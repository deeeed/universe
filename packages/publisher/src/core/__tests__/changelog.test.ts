/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import conventionalChangelog from "conventional-changelog";
import { promises as fs } from "fs";
import { PassThrough } from "stream";
import type { PackageContext, ReleaseConfig } from "../../types/config";
import { ChangelogService } from "../changelog";

// Mock the fs promises API
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
  },
}));

// Mock conventional-changelog
jest.mock("conventional-changelog", () => jest.fn());

describe("ChangelogService", () => {
  let service: ChangelogService;
  let mockContext: PackageContext;
  let mockConfig: ReleaseConfig;

  beforeEach(() => {
    service = new ChangelogService();
    jest.clearAllMocks();

    mockContext = {
      name: "test-package",
      path: "/test/path",
      currentVersion: "1.0.0",
      newVersion: "1.1.0",
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
    };

    mockConfig = {
      packageManager: "yarn",
      changelogFile: "CHANGELOG.md",
      conventionalCommits: true,
      git: {
        tagPrefix: "v",
        requireCleanWorkingDirectory: true,
        requireUpToDate: true,
        commit: true,
        push: true,
        commitMessage: "chore(release): release ${packageName}@${version}",
        tag: true,
        allowedBranches: ["main", "master"],
        remote: "origin",
      },
      npm: {
        publish: true,
        registry: "https://registry.npmjs.org",
        tag: "latest",
        access: "public",
      },
      hooks: {},
      versionStrategy: "independent",
      bumpStrategy: "prompt",
    };
  });

  describe("generate", () => {
    it("should generate changelog content", async () => {
      const mockStream = new PassThrough();
      (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);

      const changelogPromise = service.generate(mockContext, mockConfig);
      mockStream.write("## Changes\n\n* Feature: New stuff\n");
      mockStream.end();

      const result = await changelogPromise;
      expect(result).toBe("## Changes\n\n* Feature: New stuff");
    });

    it("should handle errors during generation", async () => {
      const mockStream = new PassThrough();
      (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);

      const changelogPromise = service.generate(mockContext, mockConfig);
      mockStream.emit("error", new Error("Generation failed"));

      await expect(changelogPromise).rejects.toThrow("Generation failed");
    });
  });

  describe("update", () => {
    it("should create new changelog file if it doesnt exist", async () => {
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error("ENOENT"));

      const newContent = "* Feature: Something new";
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall?.[1] as string;

      expect(content).toContain("# Changelog");
      expect(content).toContain("## [Unreleased]");
      expect(content).toContain("## [1.1.0]");
      expect(content).toContain("* Feature: Something new");
      expect(content).toContain(
        "[unreleased]: https://github.com/deeeed/universe/compare/v1.1.0...HEAD",
      );
    });

    it("should update existing changelog file", async () => {
      const existingContent =
        "# Changelog\n\n## [1.0.0] - 2024-01-01\n\n* Initial release\n";
      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const newContent = "* Feature: Something new";
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall?.[1] as string;
      expect(content).toContain("## [1.1.0]");
      expect(content).toContain("* Feature: Something new");
      expect(content).toContain("## [1.0.0]");
    });
  });

  describe("validate", () => {
    it("should validate a valid changelog", async () => {
      const validContent = `# Changelog

## [Unreleased]

## [2.0.0] - 2024-03-01

* Major update

## [1.0.0] - 2024-01-01

* Initial release
`;
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(validContent);

      await expect(
        service.validate(mockContext, mockConfig),
      ).resolves.not.toThrow();
    });

    it("should fail if changelog file is missing", async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error("ENOENT"));

      await expect(service.validate(mockContext, mockConfig)).rejects.toThrow(
        "Changelog file not found",
      );
    });

    it("should fail if changelog is missing header", async () => {
      const invalidContent = `## [Unreleased]

## [1.0.0] - 2024-01-01`;

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(invalidContent);

      await expect(service.validate(mockContext, mockConfig)).rejects.toThrow(
        "missing header",
      );
    });

    it("should fail if changelog is missing unreleased section", async () => {
      const invalidContent = `# Changelog

## [1.0.0] - 2024-01-01`;

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(invalidContent);

      await expect(service.validate(mockContext, mockConfig)).rejects.toThrow(
        "missing Unreleased section",
      );
    });

    it("should fail if version entries are in wrong order", async () => {
      const invalidContent = `# Changelog

## [Unreleased]

## [1.0.0] - 2024-03-01

## [2.0.0] - 2024-01-01`;

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(invalidContent);

      await expect(service.validate(mockContext, mockConfig)).rejects.toThrow(
        "Version ordering error",
      );
    });

    it("should fail if date format is invalid", async () => {
      const invalidContent = `# Changelog

## [Unreleased]

## [1.0.0] - 2024-13-45`;

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readFile as jest.Mock).mockResolvedValue(invalidContent);

      await expect(service.validate(mockContext, mockConfig)).rejects.toThrow(
        "Invalid date format",
      );
    });
  });

  describe("comparison links", () => {
    it("should add comparison links", async () => {
      const existingContent = "# Changelog\n\n## [1.0.0] - 2024-01-01\n";
      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const newContent = "* Feature: Something new";
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall?.[1] as string;
      expect(content).toContain(
        "[unreleased]: https://github.com/deeeed/universe/compare/v1.1.0...HEAD",
      );
      expect(content).toContain(
        "[1.1.0]: https://github.com/deeeed/universe/compare/v1.0.0...v1.1.0",
      );
    });
  });
});
