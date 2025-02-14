import conventionalChangelog from "conventional-changelog";
import { promises as fs } from "fs";
import path from "path";
import { PassThrough } from "stream";
import type { PackageContext, ReleaseConfig } from "../../types/config";
import { ChangelogService } from "../changelog";
import { GitService } from "../git";
import { WorkspaceService } from "../workspace";
import { Logger } from "../../utils/logger";

// Mock setup
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
  },
}));

jest.mock("conventional-changelog", () => jest.fn());

// Create a proper mock instance
const mockWorkspaceService = {
  getRootDir: jest.fn().mockResolvedValue("/monorepo/root"),
  readPackageJson: jest.fn().mockResolvedValue({
    name: "@siteed/publisher",
    repository: {
      type: "git",
      url: "https://github.com/deeeed/universe",
    },
  }),
  getPackageJsonPath: jest
    .fn()
    .mockResolvedValue("/monorepo/root/package.json"),
};

// Mock the WorkspaceService class
jest.mock("../workspace", () => ({
  WorkspaceService: jest.fn(() => mockWorkspaceService),
}));

describe("KeepAChangelogService", () => {
  let service: ChangelogService;
  let mockContext: PackageContext;
  let mockConfig: ReleaseConfig;
  const ROOT_DIR = "/monorepo/root";

  beforeEach(() => {
    jest.clearAllMocks();

    const logger = new Logger();
    const workspaceService = new WorkspaceService();
    const git = new GitService(
      {
        tagPrefix: "",
        requireCleanWorkingDirectory: true,
        requireUpToDate: true,
        requireUpstreamTracking: true,
        commit: true,
        push: true,
        commitMessage: "",
        tag: true,
        remote: "origin",
      },
      workspaceService.getRootDir(),
    );
    service = new ChangelogService(logger, workspaceService, git);

    // Set the mock directly with proper typing
    Object.defineProperty(service, "workspaceService", {
      value: mockWorkspaceService,
      writable: true,
    });

    mockContext = {
      name: "@siteed/publisher",
      path: path.join(ROOT_DIR, "packages/test-package"),
      currentVersion: "0.4.11",
      newVersion: "0.4.12",
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
    };

    mockConfig = {
      packageManager: "yarn",
      changelogFile: "CHANGELOG.md",
      conventionalCommits: true,
      changelogFormat: "keep-a-changelog",
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
    it("should convert conventional commits to keep-a-changelog format", async () => {
      const mockStream = new PassThrough();
      (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);

      const changelogPromise = service.generate(mockContext, mockConfig);
      mockStream.write("* feat: New feature\n");
      mockStream.write("* fix: Bug fix\n");
      mockStream.write("* chore: Update deps\n");
      mockStream.write("* security: Fix vulnerability\n");
      mockStream.end();

      const result = await changelogPromise;
      expect(result).toContain("* feat: New feature");
      expect(result).toContain("* fix: Bug fix");
      expect(result).toContain("* chore: Update deps");
      expect(result).toContain("* security: Fix vulnerability");
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
  });

  describe("update", () => {
    it("should handle migration from unreleased to new version correctly", async () => {
      const existingContent = `# Changelog

## [Unreleased]

### Added
- New feature X

## [0.4.11] - 2024-10-31
- ⚠️ **WARNING: DEVELOPMENT IN PROGRESS** ⚠️`;

      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const newChanges = "### Added\n- New feature Y";
      await service.update(mockContext, newChanges, mockConfig);

      const writeCall = jest.mocked(fs.writeFile).mock.calls[0];
      const updatedContent = writeCall?.[1] as string;

      expect(updatedContent).toContain("## [Unreleased]");
      expect(updatedContent).toContain("## [0.4.12]");
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

## [0.4.11] - 2024-10-31`;

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
      const existingContent = `# Changelog

## [Unreleased]`;

      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const preview = await service.previewNewVersion(mockContext, mockConfig, {
        newVersion: "1.1.0",
        conventionalCommits: false,
        format: "keep-a-changelog",
        includeEmptySections: true,
        date: "2024-10-30",
      });

      expect(preview).toContain("## [1.1.0] - 2024-10-30");
      expect(preview).toContain("No changes recorded");
    });

    it("should preserve unreleased content when conventional commits is disabled", async () => {
      const existingContent = `# Changelog

## [Unreleased]
### Added
- New feature X`;

      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const preview = await service.previewNewVersion(mockContext, mockConfig, {
        newVersion: "1.1.0",
        conventionalCommits: false,
        format: "keep-a-changelog",
        includeEmptySections: false,
        date: "2024-10-30",
      });

      expect(preview).toContain("## [1.1.0] - 2024-10-30");
      expect(preview).toContain("### Added\n- New feature X");
    });

    it("should include all sections when includeEmptySections is true", async () => {
      const existingContent = `# Changelog

## [Unreleased]
### Added
- New feature X`;

      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const preview = await service.previewNewVersion(mockContext, mockConfig, {
        newVersion: "1.1.0",
        conventionalCommits: false,
        format: "keep-a-changelog",
        includeEmptySections: true,
        date: "2024-10-30",
      });

      expect(preview).toContain("## [1.1.0] - 2024-10-30");
      expect(preview).toContain("### Added\n- New feature X");
    });
  });
});
