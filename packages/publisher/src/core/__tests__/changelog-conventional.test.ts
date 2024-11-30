import conventionalChangelog from "conventional-changelog";
import { promises as fs } from "fs";
import path from "path";
import { PassThrough } from "stream";
import type { PackageContext, ReleaseConfig } from "../../types/config";
import { ChangelogService } from "../changelog";

jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
  },
}));

jest.mock("conventional-changelog", () => jest.fn());
jest.mock("../workspace", () => ({
  WorkspaceService: jest.fn().mockImplementation(() => ({
    getRootDir: jest.fn().mockResolvedValue("/monorepo/root"),
    readPackageJson: jest.fn().mockResolvedValue({
      repository: "https://github.com/deeeed/universe",
    }),
  })),
}));

describe("ConventionalChangelogService", () => {
  let service: ChangelogService;
  let mockContext: PackageContext;
  let mockConfig: ReleaseConfig;
  const ROOT_DIR = "/monorepo/root";

  beforeEach(() => {
    service = new ChangelogService();
    jest.clearAllMocks();

    mockContext = {
      name: "test-package",
      path: path.join(ROOT_DIR, "packages/test-package"),
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
      changelogFormat: "conventional",
      git: {
        tagPrefix: "",
        requireCleanWorkingDirectory: true,
        requireUpToDate: true,
        commit: true,
        push: true,
        commitMessage: `chore(${mockContext.name}): release \${version}`,
        tag: true,
        allowedBranches: ["main", "master"],
        remote: "origin",
        requireUpstreamTracking: true,
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
      packValidation: {
        enabled: true,
        validateFiles: true,
        validateBuildArtifacts: true,
      },
      updateDependenciesOnRelease: true,
      dependencyUpdateStrategy: "prompt",
      bumpType: "minor",
      preReleaseId: "beta",
      repository: {
        directory: "packages/publisher",
        url: "https://github.com/deeeed/universe",
      },
    };
  });

  describe("generate", () => {
    it("should generate changelog content using conventional format", async () => {
      const mockStream = new PassThrough();
      (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);

      const changelogPromise = service.generate(mockContext, mockConfig);
      mockStream.write("* feat: New stuff\n");
      mockStream.end();

      const result = await changelogPromise;
      expect(result).toBe("### Added\n- New stuff\n");
    });

    it("should handle malformed changelog gracefully", async () => {
      const mockStream = new PassThrough();
      (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);
      mockStream.end();

      const result = await service.generate(mockContext, mockConfig);
      expect(result).toBe("");
    });

    it("should handle empty changelog with no git commits", async () => {
      const mockStream = new PassThrough();
      (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);
      mockStream.end();

      const result = await service.generate(mockContext, mockConfig);
      expect(result).toBe("");
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
    it("should update existing changelog file", async () => {
      const existingContent = `# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2024-01-01\n\n* Initial release\n`;
      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const newContent = "### Added\n- Something new";
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = jest.mocked(fs.writeFile).mock.calls[0];
      expect(writeCall?.[0]).toBe(path.join(mockContext.path, "CHANGELOG.md"));
      const content = writeCall?.[1] as string;
      expect(content).toContain(`## [${mockContext.newVersion}]`);
      expect(content).toContain("### Added\n- Something new");
      expect(content).toContain("## [1.0.0]");
    });

    it("should handle migration from unreleased to new version correctly", async () => {
      const existingContent = `# Changelog

## [Unreleased]

### Added
- New feature X

## [1.0.0] - 2024-01-01`;

      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const newChanges = "### Added\n- New feature Y";
      await service.update(mockContext, newChanges, mockConfig);

      const writeCall = jest.mocked(fs.writeFile).mock.calls[0];
      const updatedContent = writeCall?.[1] as string;

      expect(updatedContent).toContain("## [Unreleased]");
      expect(updatedContent).toContain(`## [${mockContext.newVersion}]`);
      expect(updatedContent).toContain("- New feature Y");
    });

    it("should maintain section order when updating", async () => {
      const existingContent = `# Changelog

## [Unreleased]

### Security
- Security fix
### Added
- Feature A
### Fixed
- Bug fix

## [1.0.0] - 2024-01-01`;

      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const newChanges = "### Added\n- Feature B\n### Fixed\n- Another bug fix";
      await service.update(mockContext, newChanges, mockConfig);

      const writeCall = jest.mocked(fs.writeFile).mock.calls[0];
      const updatedContent = writeCall?.[1] as string;

      expect(updatedContent).toContain("### Added\n- Feature B");
      expect(updatedContent).toContain("### Fixed\n- Another bug fix");
      expect(updatedContent).toContain("### Security\n- Security fix");
    });
  });

  describe("previewNewVersion", () => {
    it("should handle empty sections when no unreleased content exists", async () => {
      const existingContent = `# Changelog\n\n## [Unreleased]`;
      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const mockStream = new PassThrough();
      (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);
      mockStream.end();

      const preview = await service.previewNewVersion(mockContext, mockConfig, {
        newVersion: "1.1.0",
        conventionalCommits: true,
        format: "conventional",
        includeEmptySections: true,
        date: "2024-10-30",
      });

      expect(preview).toContain("## [1.1.0] - 2024-10-30");
      expect(preview).toContain("No changes recorded");
    });

    it("should include all sections when includeEmptySections is true", async () => {
      const existingContent = `# Changelog\n\n## [Unreleased]\n### Added\n- New feature X`;
      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const mockStream = new PassThrough();
      (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);
      mockStream.end();

      const preview = await service.previewNewVersion(mockContext, mockConfig, {
        newVersion: "1.1.0",
        conventionalCommits: true,
        format: "conventional",
        includeEmptySections: true,
        date: "2024-10-30",
      });

      expect(preview).toContain("## [1.1.0] - 2024-10-30");
      expect(preview).toContain("### Added\n- New feature X");
    });
  });
});
