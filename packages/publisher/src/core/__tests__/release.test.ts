import * as fs from "fs/promises";
import type {
  MonorepoConfig,
  NpmConfig,
  PackageContext,
  ReleaseConfig,
} from "../../types/config";
import { Logger } from "../../utils/logger";
import { ReleaseService } from "../release";
import type { FileHandle } from "fs/promises";

// Add type for the mocked service
type MockedChangelogService = {
  validate: jest.Mock;
  generate: jest.Mock;
  update: jest.Mock;
  getUnreleasedChanges: jest.Mock;
  previewNewVersion: jest.Mock;
  _setUnreleasedChanges: (changes: string[]) => void;
  workspaceService: unknown;
  BULLET_POINTS: readonly ["*", "-", "+"];
  COMMIT_TYPES: {
    readonly feat: "Added";
    readonly fix: "Fixed";
    readonly docs: "Documentation";
    readonly style: "Styling";
    readonly refactor: "Refactored";
    readonly perf: "Performance";
    readonly test: "Tests";
    readonly build: "Build";
    readonly ci: "CI";
    readonly chore: "Chores";
    readonly revert: "Reverted";
    readonly deps: "Dependencies";
    readonly breaking: "Breaking";
  };
  logger: { info: jest.Mock; error: jest.Mock; debug: jest.Mock };
};

// At the top of the file, add these types
type MockedFsPromises = {
  access: jest.Mock;
  readFile: jest.Mock;
  writeFile: jest.Mock;
  stat: jest.Mock;
};

interface WrittenFile {
  path: string;
  content: string;
}

let lastWrittenFile: WrittenFile | null = null;

// Create a single instance of mockedFs at the top level
const mockedFs = fs as unknown as MockedFsPromises;

jest.mock(
  "fs/promises",
  (): MockedFsPromises => ({
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest
      .fn()
      .mockImplementation(
        (
          _path: string | Buffer | URL | FileHandle,
          content: string | Buffer,
        ): Promise<void> => {
          if (typeof _path === "string") {
            lastWrittenFile = {
              path: _path,
              content: Buffer.isBuffer(content) ? content.toString() : content,
            };
          }
          return Promise.resolve();
        },
      ),
    stat: jest.fn(),
  }),
);

// Mock modules
jest.mock("../git", () => ({
  GitService: jest.fn().mockImplementation(() => ({
    validateStatus: jest.fn().mockResolvedValue(undefined),
    createTag: jest.fn().mockResolvedValue("test-package@1.1.0"),
    commitChanges: jest.fn().mockResolvedValue(undefined),
    getCurrentCommitHash: jest.fn().mockResolvedValue("hash123"),
    push: jest.fn().mockResolvedValue(undefined),
    checkTagExists: jest.fn().mockResolvedValue(false),
    resetToCommit: jest.fn().mockResolvedValue(undefined),
    getTagName: jest
      .fn()
      .mockImplementation(
        (packageName, version) => `${packageName}@${version}`,
      ),
    getLastTag: jest.fn().mockResolvedValue("test-package@1.0.0"),
    getCommitsSinceTag: jest.fn().mockResolvedValue([
      {
        hash: "abc123",
        date: "2024-01-15",
        message: "feat: New feature",
        body: null,
        files: ["packages/test-package/src/index.ts"],
      },
    ]),
    getAllCommits: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock("../workspace", () => ({
  WorkspaceService: jest.fn().mockImplementation(() => ({
    getPackages: jest.fn().mockImplementation((names?: string[]) => {
      if (!names || names.length === 0) return Promise.resolve([]);
      return Promise.resolve([
        {
          name: "test-package",
          path: `/path/to/test-package`,
          currentVersion: "1.0.0",
        } as PackageContext,
      ]);
    }),
    getChangedPackages: jest.fn().mockResolvedValue([] as PackageContext[]),
    getPackageConfig: jest.fn().mockResolvedValue({
      git: { tagPrefix: "", remote: "origin" },
      changelogFile: "CHANGELOG.md",
      conventionalCommits: true,
      npm: { publish: true },
    } as ReleaseConfig),
    getCurrentPackage: jest.fn().mockResolvedValue({
      name: "test-package",
      path: "/test/path",
      currentVersion: "1.0.0",
    } as PackageContext),
  })),
}));

jest.mock("../integrity", () => ({
  WorkspaceIntegrityService: jest.fn().mockImplementation(() => ({
    check: jest.fn().mockResolvedValue(true),
    checkWithDetails: jest.fn().mockResolvedValue({
      isValid: true,
      issues: [],
      updates: [],
      summary: {
        total: 0,
        outdated: 0,
        workspaceUpdates: 0,
        externalUpdates: 0,
      },
    }),
    fix: jest.fn().mockResolvedValue(true),
  })),
}));

// At the top of the file, with other mocks
jest.mock("../changelog", () => {
  let unreleasedChanges: string[] = [];

  return {
    ChangelogService: jest.fn().mockImplementation(() => ({
      validate: jest.fn().mockResolvedValue(undefined),
      generate: jest.fn().mockImplementation(() => {
        return Promise.resolve(
          [
            "# Changelog",
            "",
            `## [1.1.0] - ${new Date().toISOString().split("T")[0]}`,
            "* Initial release",
            "",
          ].join("\n"),
        );
      }),
      update: jest
        .fn()
        .mockImplementation(
          (packageContext: PackageContext, content: string) => {
            lastWrittenFile = {
              path: `${packageContext.path}/CHANGELOG.md`,
              content,
            };
            return Promise.resolve();
          },
        ),
      getUnreleasedChanges: jest
        .fn()
        .mockImplementation(() => Promise.resolve(unreleasedChanges)),
      previewNewVersion: jest
        .fn()
        .mockImplementation(
          (
            _context: PackageContext,
            _config: ReleaseConfig,
            options: { newVersion: string },
          ) => {
            const { newVersion } = options;
            return Promise.resolve(
              [
                `## [${newVersion}] - ${new Date().toISOString().split("T")[0]}`,
                ...unreleasedChanges,
                "* feat: New feature",
                "* fix: Bug fix",
                "",
              ].join("\n"),
            );
          },
        ),
      _setUnreleasedChanges: (changes: string[]): void => {
        unreleasedChanges = changes;
      },
      // Required static properties
      workspaceService: {},
      BULLET_POINTS: ["*", "-", "+"] as const,
      COMMIT_TYPES: {
        feat: "Added",
        fix: "Fixed",
        docs: "Documentation",
        style: "Styling",
        refactor: "Refactored",
        perf: "Performance",
        test: "Tests",
        build: "Build",
        ci: "CI",
        chore: "Chores",
        revert: "Reverted",
        deps: "Dependencies",
        breaking: "Breaking",
      } as const,
      logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn() },
    })),
  };
});

jest.mock("../version", () => ({
  VersionService: jest.fn().mockImplementation(() => ({
    bump: jest.fn().mockResolvedValue(undefined),
    determineVersion: jest.fn().mockReturnValue("1.1.0"),
    analyzeCommits: jest.fn().mockResolvedValue("patch"),
    validateVersion: jest.fn().mockReturnValue(true),
  })),
}));

// Add at the top with other mocks
jest.mock("../../utils/find-monorepo-root", () => ({
  findMonorepoRootSync: jest.fn().mockReturnValue("/test/monorepo/root"),
}));

jest.mock("../../utils/prompt", () => ({
  Prompts: jest.fn().mockImplementation(() => ({
    confirmRelease: jest.fn().mockResolvedValue(true),
    getVersionBump: jest.fn().mockResolvedValue("patch"),
    confirmChangelogContent: jest.fn().mockResolvedValue(true),
    getManualChangelogEntry: jest
      .fn()
      .mockResolvedValue("Manual changelog entry"),
    confirmChangelogCreation: jest.fn().mockResolvedValue(true),
  })),
}));

describe("ReleaseService", () => {
  let releaseService: ReleaseService;
  let config: MonorepoConfig;
  let logger: Logger;
  let defaultNpmConfig: NpmConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    lastWrittenFile = null;

    defaultNpmConfig = {
      publish: true,
      registry: "https://registry.npmjs.org",
      tag: "latest",
      access: "public",
    };

    config = {
      packageManager: "yarn",
      conventionalCommits: true,
      versionStrategy: "independent",
      changelogFormat: "conventional",
      git: {
        tagPrefix: "v",
        requireCleanWorkingDirectory: true,
        requireUpToDate: true,
        commit: true,
        push: true,
        requireUpstreamTracking: true,
        commitMessage: "chore(release): release ${packageName}@${version}",
        tag: true,
        allowedBranches: ["main", "master"],
        remote: "origin",
      },
      packValidation: {
        enabled: true,
        validateFiles: true,
        validateBuildArtifacts: true,
        requiredFiles: undefined,
      },
      npm: defaultNpmConfig,
      hooks: {},
      packages: {},
      ignorePackages: [],
      maxConcurrency: 4,
      bumpStrategy: "prompt",
      changelogFile: "CHANGELOG.md",
      updateDependenciesOnRelease: false,
      dependencyUpdateStrategy: "none",
    };

    logger = new Logger();
    releaseService = new ReleaseService(config, logger);

    // Set default workspace integrity check to pass
    jest
      .spyOn(releaseService["packageManager"], "checkWorkspaceIntegrity")
      .mockResolvedValue(true);

    // Add integrity service mock
    jest
      .spyOn(releaseService["integrityService"], "checkWithDetails")
      .mockResolvedValue({
        isValid: true,
        issues: [],
        updates: [],
        summary: {
          total: 0,
          outdated: 0,
          workspaceUpdates: 0,
          externalUpdates: 0,
        },
      });

    // Add version validation mock
    jest.spyOn(releaseService["version"], "validateVersion").mockReturnValue();

    // Verify the mocks are properly set up
    expect(fs.readFile).toBeDefined();
    expect(fs.writeFile).toBeDefined();
    expect(fs.access).toBeDefined();

    // Setup fs mock defaults
    mockedFs.access.mockResolvedValue(undefined);
    mockedFs.readFile.mockResolvedValue(
      Buffer.from(
        [
          "# Changelog",
          "",
          "## [Unreleased]",
          "* feat: New feature A",
          "",
          "## [1.0.0] - 2024-01-01",
          "* Initial release",
          "",
        ].join("\n"),
      ),
    );
    mockedFs.stat.mockResolvedValue({ isFile: () => true });

    // Reset the changelog content
    const changelogService = releaseService[
      "changelog"
    ] as unknown as MockedChangelogService;
    changelogService._setUnreleasedChanges([]);

    // Reset written files
    lastWrittenFile = null;

    // Setup default mock implementations for fs with proper typing
    mockedFs.writeFile.mockImplementation(
      (
        _path: string | Buffer | URL | fs.FileHandle,
        content: string | Buffer,
      ): Promise<void> => {
        if (typeof _path === "string" && _path.endsWith("CHANGELOG.md")) {
          lastWrittenFile = {
            path: _path,
            content: Buffer.isBuffer(content) ? content.toString() : content,
          };
        }
        return Promise.resolve();
      },
    );
  });

  describe("constructor", () => {
    it("should default to yarn when invalid package manager specified", () => {
      const invalidConfig: MonorepoConfig = {
        ...config,
        packageManager: "invalid" as "npm" | "yarn",
      };
      const spyLogger = jest.spyOn(logger, "warning");

      new ReleaseService(invalidConfig, logger);

      expect(spyLogger).toHaveBeenCalledWith(
        'Invalid package manager specified, defaulting to "yarn"',
      );
    });
  });

  describe("releasePackages", () => {
    beforeEach(() => {
      // Mock workspace to return consistent package info
      jest.spyOn(releaseService["workspace"], "getPackages").mockResolvedValue([
        {
          name: "test-package",
          path: "/path/test-package",
          currentVersion: "1.0.0",
        },
      ]);

      // Mock version service
      jest
        .spyOn(releaseService["version"], "determineVersion")
        .mockReturnValue("1.1.0");
      jest
        .spyOn(releaseService["version"], "bump")
        .mockResolvedValue(undefined);

      // Mock changelog service
      jest
        .spyOn(releaseService["changelog"], "generate")
        .mockResolvedValue("Test changelog");
    });

    it("should handle no packages found", async () => {
      const mockGetPackages = jest
        .spyOn(releaseService["workspace"], "getPackages")
        .mockResolvedValue([]);

      const result = await releaseService.releasePackages(["pkg1"], {});
      expect(result).toEqual([]);
      expect(mockGetPackages).toHaveBeenCalledWith(["pkg1"]);
    });

    it("should skip integrity check when not requested", async () => {
      jest.clearAllMocks();

      // Mock validateWithProgress to avoid running validations
      jest
        .spyOn(releaseService as any, "validateWithProgress")
        .mockResolvedValue(undefined);

      const checkMethod = jest.spyOn(
        releaseService["integrityService"],
        "checkWithDetails",
      );

      await releaseService.releasePackages(["test-package"], {
        skipGitCheck: true,
        checkIntegrity: false,
      });

      expect(checkMethod).not.toHaveBeenCalled();
    });

    it("should perform integrity check when requested", async () => {
      await releaseService.releasePackages(["test-package"], {
        checkIntegrity: true,
      });

      const checkMethod = jest.spyOn(
        releaseService["integrityService"],
        "checkWithDetails",
      );
      expect(checkMethod).toHaveBeenCalled();
    });

    it("should handle dry run mode", async () => {
      const results = await releaseService.releasePackages(["test-package"], {
        dryRun: true,
      });
      expect(results[0]).toMatchObject({
        packageName: "test-package",
        newVersion: "1.1.0",
      });

      const pushMethod = jest.spyOn(releaseService["git"], "push");
      expect(pushMethod).not.toHaveBeenCalled();
    });

    it("should cancel release when user does not confirm", async () => {
      jest
        .spyOn(releaseService["prompts"], "confirmRelease")
        .mockResolvedValue(false);

      await expect(
        releaseService.releasePackages(["test-package"], {}),
      ).rejects.toThrow("Release cancelled");
    });
  });

  describe("releaseAll", () => {
    it("should handle no changed packages", async () => {
      jest
        .spyOn(releaseService["workspace"], "getChangedPackages")
        .mockResolvedValue([]);
      jest
        .spyOn(releaseService["workspace"], "getPackages")
        .mockResolvedValue([]);

      const results = await releaseService.releaseAll({});

      expect(results).toEqual([]);
    });

    it("should release all changed packages", async () => {
      const changedPackages = [
        { name: "pkg1", path: "/path/to/pkg1", currentVersion: "1.0.0" },
      ];

      const mockResult = [
        {
          packageName: "pkg1",
          version: "1.0.1",
          changelog: "Changelog",
          git: { tag: "v1.0.1", commit: "commit-hash" },
        },
      ];

      const spyGetChangedPackages = jest
        .spyOn(releaseService["workspace"], "getChangedPackages")
        .mockResolvedValue(changedPackages);
      const spyReleasePackages = jest
        .spyOn(releaseService, "releasePackages")
        .mockResolvedValue(mockResult);

      const results = await releaseService.releaseAll({});

      expect(results).toEqual(mockResult);
      expect(spyReleasePackages).toHaveBeenCalledWith(["pkg1"], {});
      expect(spyGetChangedPackages).toHaveBeenCalled();
    });
  });

  describe("version determination", () => {
    const mockContext = {
      name: "pkg1",
      path: "/path/pkg1",
      currentVersion: "1.0.0",
    };
    const mockConfig = { ...config };

    it("should prompt for version when bumpStrategy is prompt", async () => {
      mockConfig.bumpStrategy = "prompt";
      const spyPrompt = jest
        .spyOn(releaseService["prompts"], "getVersionBump")
        .mockResolvedValue("minor");
      const spyVersion = jest
        .spyOn(releaseService["version"], "determineVersion")
        .mockReturnValue("1.1.0");

      await releaseService["determineVersion"](mockContext, mockConfig);

      expect(spyPrompt).toHaveBeenCalled();
      expect(spyVersion).toHaveBeenCalledWith(mockContext, "minor", undefined);
    });

    it("should use conventional commits when bumpStrategy is conventional", async () => {
      mockConfig.bumpStrategy = "conventional";
      mockConfig.bumpType = "major";

      // Mock analyzeCommits to return "major"
      const spyAnalyzeCommits = jest
        .spyOn(releaseService["version"], "analyzeCommits")
        .mockResolvedValue("major");

      const spyVersion = jest
        .spyOn(releaseService["version"], "determineVersion")
        .mockReturnValue("2.0.0");

      await releaseService["determineVersion"](mockContext, mockConfig);

      expect(spyAnalyzeCommits).toHaveBeenCalledWith(mockContext);
      expect(spyVersion).toHaveBeenCalledWith(mockContext, "major", undefined);
    });

    it("should default to patch when using auto strategy", async () => {
      mockConfig.bumpStrategy = "auto";
      const spyVersion = jest
        .spyOn(releaseService["version"], "determineVersion")
        .mockReturnValue("1.0.1");

      await releaseService["determineVersion"](mockContext, mockConfig);

      expect(spyVersion).toHaveBeenCalledWith(mockContext, "patch", undefined);
    });
  });

  describe("workspace dependencies", () => {
    it("should identify workspace dependencies correctly", () => {
      const context: PackageContext = {
        name: "pkg1",
        path: "/path/pkg1",
        currentVersion: "1.0.0",
        dependencies: {
          "@siteed/pkg2": "^1.0.0",
          lodash: "^4.0.0",
          "@your-scope/pkg3": "^1.0.0",
        },
        devDependencies: {
          "@siteed/dev-pkg": "^1.0.0",
        },
      };

      const deps = releaseService["getWorkspaceDependencies"](context);

      expect(deps).toEqual([
        "@siteed/pkg2",
        "@your-scope/pkg3",
        "@siteed/dev-pkg",
      ]);
    });
  });

  describe("config handling", () => {
    it("should merge configs correctly with pattern matching", async () => {
      // Create a fresh config with pattern matching
      const testConfig: MonorepoConfig = {
        ...config,
        packages: {
          "packages/*": {
            packageManager: "yarn",
            changelogFile: "CHANGELOG.md",
            conventionalCommits: true,
            changelogFormat: "conventional",
            git: config.git,
            versionStrategy: "independent",
            bumpStrategy: "prompt",
            npm: {
              ...defaultNpmConfig,
              access: "restricted",
            },
            hooks: {},
            updateDependenciesOnRelease: false,
            dependencyUpdateStrategy: "none",
          },
        },
      };

      // Create service with test config
      const testReleaseService = new ReleaseService(testConfig, logger);

      // Mock the package-specific config
      jest
        .spyOn(testReleaseService["workspace"], "getPackageConfig")
        .mockResolvedValue({
          packageManager: "yarn",
          changelogFile: "CHANGELOG.md",
          conventionalCommits: true,
          changelogFormat: "conventional",
          git: config.git,
          versionStrategy: "independent",
          bumpStrategy: "prompt",
          packValidation: {
            enabled: true,
            validateFiles: true,
            validateBuildArtifacts: true,
            requiredFiles: undefined,
          },
          npm: {
            publish: true,
            registry: "https://registry.npmjs.org",
            tag: "beta",
            access: "restricted",
          },
          hooks: {},
          updateDependenciesOnRelease: false,
          dependencyUpdateStrategy: "none",
        });

      // Get the effective config
      const result =
        await testReleaseService["getEffectiveConfig"]("packages/pkg1");

      // Verify the merged config
      expect(result.npm).toEqual({
        publish: true,
        registry: "https://registry.npmjs.org",
        tag: "beta",
        access: "restricted",
      });

      // Also verify that pattern matching worked
      expect(
        testReleaseService["matchPackagePattern"](
          "packages/pkg1",
          "packages/*",
        ),
      ).toBe(true);
    });

    it("should handle pattern matching with glob patterns", () => {
      expect(
        releaseService["matchPackagePattern"]("packages/pkg1", "packages/*"),
      ).toBe(true);
      expect(
        releaseService["matchPackagePattern"](
          "packages/nested/pkg1",
          "packages/*/*",
        ),
      ).toBe(true);
      expect(
        releaseService["matchPackagePattern"]("other/pkg1", "packages/*"),
      ).toBe(false);
    });
  });

  describe("prepareChangelogEntry", () => {
    it("should handle non-existent changelog file", async () => {
      // Setup non-existent file scenario
      mockedFs.access.mockRejectedValueOnce(new Error("ENOENT"));

      const mockConfirmCreation = jest
        .spyOn(releaseService["prompts"], "confirmChangelogCreation")
        .mockResolvedValueOnce(true);

      const mockGenerate = jest
        .spyOn(releaseService["changelog"], "generate")
        .mockResolvedValueOnce("## [1.0.0] - 2024-01-01\n\nInitial release");

      const result = await releaseService.prepareChangelogEntry(
        {
          name: "test-package",
          path: "/test/path",
          currentVersion: "1.0.0",
        },
        {
          npm: {
            tag: "latest",
            publish: true,
            registry: "https://registry.npmjs.org",
            access: "public",
          },
          packageManager: "yarn",
          changelogFile: "CHANGELOG.md",
          conventionalCommits: true,
          changelogFormat: "conventional",
          git: config.git,
          versionStrategy: "independent",
          bumpStrategy: "prompt",
          packValidation: {
            enabled: true,
            validateFiles: true,
            validateBuildArtifacts: true,
          },
          hooks: {},
          updateDependenciesOnRelease: false,
          dependencyUpdateStrategy: "none",
        },
      );

      expect(result).toBe("## [1.0.0] - 2024-01-01\n\nInitial release");
      expect(mockConfirmCreation).toHaveBeenCalledWith("test-package");
      expect(mockGenerate).toHaveBeenCalled();
    });
  });

  describe("changelog handling during release", () => {
    beforeEach(() => {
      lastWrittenFile = null;

      // Reset mocks
      jest
        .spyOn(releaseService["git"], "getCommitsSinceTag")
        .mockResolvedValue([]);
      jest
        .spyOn(releaseService["prompts"], "confirmChangelogContent")
        .mockResolvedValue(true);
    });

    it("should handle non-existent changelog file", async () => {
      // Setup non-existent file scenario
      mockedFs.access.mockRejectedValueOnce(new Error("ENOENT"));

      // Setup git commits
      jest
        .spyOn(releaseService["git"], "getCommitsSinceTag")
        .mockResolvedValueOnce([
          {
            hash: "abc123",
            date: "2024-01-15",
            message: "feat: Existing feature",
            body: null,
            files: ["packages/test-package/src/index.ts"],
          },
          {
            hash: "def456",
            date: "2024-01-16",
            message: "fix(test-package): resolve issue",
            body: null,
            files: ["packages/test-package/src/index.ts"],
          },
        ]);

      // Mock changelog generation with the exact expected content
      const changelogContent = [
        "# Changelog",
        "",
        "## [1.1.0] - 2024-11-30",
        "* feat: Existing feature",
        "* fix(test-package): resolve issue",
        "",
      ].join("\n");

      jest
        .spyOn(releaseService["changelog"], "generate")
        .mockResolvedValueOnce(changelogContent);

      // Mock the changelog service to return the expected content
      const changelogService = releaseService[
        "changelog"
      ] as unknown as MockedChangelogService;
      changelogService._setUnreleasedChanges([
        "* feat: Existing feature",
        "* fix(test-package): resolve issue",
      ]);

      // Mock fs.writeFile to capture the content
      mockedFs.writeFile.mockImplementation(
        (filePath: string, content: string) => {
          if (
            typeof filePath === "string" &&
            filePath.endsWith("CHANGELOG.md")
          ) {
            lastWrittenFile = { path: filePath, content };
          }
          return Promise.resolve();
        },
      );

      await releaseService.releasePackages(["test-package"], {});

      expect(lastWrittenFile).toBeDefined();
      expect(lastWrittenFile?.content).toContain("feat: Existing feature");
      expect(lastWrittenFile?.content).toContain(
        "fix(test-package): resolve issue",
      );
    });

    it("should handle manual changelog entry when user rejects generated content", async () => {
      // Setup manual entry scenario
      jest
        .spyOn(releaseService["prompts"], "confirmChangelogContent")
        .mockResolvedValueOnce(false);
      jest
        .spyOn(releaseService["prompts"], "getManualChangelogEntry")
        .mockResolvedValueOnce("Custom manual entry\nAnother custom entry");

      const changelogService = releaseService[
        "changelog"
      ] as unknown as MockedChangelogService;
      changelogService._setUnreleasedChanges([]);

      await releaseService.releasePackages(["test-package"], {});

      expect(lastWrittenFile).toBeDefined();
      expect(lastWrittenFile?.content).toContain("Custom manual entry");
      expect(lastWrittenFile?.content).toContain("Another custom entry");
    });
  });
});
