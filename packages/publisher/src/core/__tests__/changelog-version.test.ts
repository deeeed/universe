import { promises as fs } from "fs";
import path from "path";
import type { PackageContext, ReleaseConfig } from "../../types/config";
import { ChangelogService } from "../changelog";

// Mock setup
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
  },
}));

jest.mock("../workspace", () => ({
  WorkspaceService: jest.fn().mockImplementation(() => ({
    getRootDir: jest.fn().mockResolvedValue("/monorepo/root"),
    readPackageJson: jest.fn().mockResolvedValue({
      repository: "https://github.com/deeeed/universe",
    }),
  })),
}));

describe("ChangelogService - Version Management", () => {
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

  describe("version handling", () => {
    it("should prevent duplicate version entries", async () => {
      const duplicateContent = `# Changelog

## [0.4.8]

## [0.4.8] - 2024-10-30

- last call before release

- last call before release
`;
      (fs.readFile as jest.Mock).mockResolvedValueOnce(duplicateContent);

      const newContent = "### Added\n- Something new";
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = jest.mocked(fs.writeFile).mock.calls[0];
      const content = writeCall?.[1];

      if (typeof content !== "string") {
        throw new Error("Expected content to be a string");
      }

      // Should only have one version entry
      const versionMatches = content.match(/## \[0\.4\.8\]/g);
      expect(versionMatches?.length).toBe(1);

      // Should only have one instance of the changelog entry
      const entryMatches = content.match(/- last call before release/g);
      expect(entryMatches?.length).toBe(1);
    });

    it("should handle version entries with and without dates", async () => {
      const mixedContent = `# Changelog

## [0.4.8]
## [0.4.8] - 2024-10-30

- last call before release
`;
      (fs.readFile as jest.Mock).mockResolvedValueOnce(mixedContent);

      const newContent = "### Added\n- Something new";
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = jest.mocked(fs.writeFile).mock.calls[0];
      const content = writeCall?.[1];

      if (typeof content !== "string") {
        throw new Error("Expected content to be a string");
      }

      // Should consolidate into a single version entry with date
      expect(content).toMatch(/## \[0\.4\.8\] - 2024-10-30/);
      expect(content).not.toMatch(/## \[0\.4\.8\]\n/);
    });

    it("should maintain version order", async () => {
      const content = `# Changelog

## [Unreleased]

## [2.0.0] - 2024-02-01
- Major update

## [1.0.0] - 2024-01-01
- Initial release`;

      (fs.readFile as jest.Mock).mockResolvedValueOnce(content);
      const version = await service.getLatestVersion(mockContext);
      expect(version).toBe("2.0.0");
    });
  });

  describe("previewNewVersion", () => {
    it("should generate preview with proper version and date", async () => {
      const existingContent = `# Changelog

## [Unreleased]
- New feature A
- Bug fix B

## [1.0.0] - 2024-01-01
- Initial release`;

      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const preview = await service.previewNewVersion(mockContext, mockConfig, {
        newVersion: "1.1.0",
        conventionalCommits: false,
        format: "conventional",
        date: "2024-02-01",
      });

      expect(preview).toContain("## [1.1.0] - 2024-02-01");
      expect(preview).toContain("- New feature A");
      expect(preview).toContain("- Bug fix B");
    });

    it("should handle empty unreleased section by showing only the new version", async () => {
      const existingContent = `# Changelog

## [Unreleased]

## [1.0.0] - 2024-01-01
- Initial release`;

      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const preview = await service.previewNewVersion(mockContext, mockConfig, {
        newVersion: "1.1.0",
        conventionalCommits: false,
        format: "conventional",
        date: "2024-02-01",
      });

      expect(preview.trim()).toBe(
        `## [1.1.0] - 2024-02-01\nNo changes recorded`,
      );
    });
  });
});
