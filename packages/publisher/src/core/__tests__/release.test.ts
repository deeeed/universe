import type {
  MonorepoConfig,
  NpmConfig,
  PackageContext,
} from "../../types/config";
import { Logger } from "../../utils/logger";
import { ReleaseService } from "../release";

// Mock modules
jest.mock("../git");
jest.mock("../npm");
jest.mock("../yarn");
jest.mock("../version");
jest.mock("../workspace");
jest.mock("../changelog");
jest.mock("../../utils/prompt");
jest.mock("../package-manager", () => ({
  PackageManagerFactory: {
    create: jest.fn().mockReturnValue({
      validateAuth: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue({
        published: true,
        registry: "https://registry.npmjs.org",
      }),
      getLatestVersion: jest.fn().mockResolvedValue("1.0.0"),
      checkWorkspaceIntegrity: jest.fn().mockResolvedValue(true),
      updateDependencies: jest.fn().mockResolvedValue(undefined),
      pack: jest.fn().mockResolvedValue("package.tgz"),
      runScript: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Add mock for integrity service
jest.mock("../integrity", () => ({
  WorkspaceIntegrityService: jest.fn().mockImplementation(() => ({
    check: jest.fn().mockResolvedValue(true),
  })),
}));

describe("ReleaseService", () => {
  let releaseService: ReleaseService;
  let config: MonorepoConfig;
  let logger: Logger;
  let defaultNpmConfig: NpmConfig;

  beforeEach(() => {
    jest.clearAllMocks();

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
        commitMessage: "chore(release): release ${packageName}@${version}",
        tag: true,
        allowedBranches: ["main", "master"],
        remote: "origin",
      },
      npm: defaultNpmConfig,
      hooks: {},
      packages: {},
      ignorePackages: [],
      maxConcurrency: 4,
      bumpStrategy: "prompt",
      changelogFile: "CHANGELOG.md",
    };

    logger = new Logger();
    releaseService = new ReleaseService(config, logger);

    // Set default workspace integrity check to pass
    jest
      .spyOn(releaseService["packageManager"], "checkWorkspaceIntegrity")
      .mockResolvedValue(true);
  });

  describe("constructor", () => {
    it("should default to yarn when invalid package manager specified", () => {
      const invalidConfig: MonorepoConfig = {
        ...config,
        packageManager: "invalid" as "npm" | "yarn" | "pnpm",
      };
      const spyLogger = jest.spyOn(logger, "warning");

      new ReleaseService(invalidConfig, logger);

      expect(spyLogger).toHaveBeenCalledWith(
        'Invalid package manager specified, defaulting to "yarn"',
      );
    });
  });

  describe("releasePackages", () => {
    it("should handle no packages found", async () => {
      const mockGetPackages = jest
        .spyOn(releaseService["workspace"], "getPackages")
        .mockResolvedValue([]);

      const result = await releaseService.releasePackages(["pkg1"], {});
      expect(result).toEqual([]);
      expect(mockGetPackages).toHaveBeenCalledWith(["pkg1"]);
    });

    it("should skip integrity check when not requested", async () => {
      const mockCheck = jest.spyOn(releaseService["integrityService"], "check");
      jest
        .spyOn(releaseService["workspace"], "getPackages")
        .mockResolvedValue([
          { name: "pkg1", path: "/path/pkg1", currentVersion: "1.0.0" },
        ]);
      jest
        .spyOn(releaseService["workspace"], "getPackageConfig")
        .mockResolvedValue(config);
      jest
        .spyOn(releaseService["prompts"], "confirmRelease")
        .mockResolvedValue(true);

      await releaseService.releasePackages(["pkg1"], {});

      expect(mockCheck).not.toHaveBeenCalled();
    });

    it("should perform integrity check when requested", async () => {
      const mockCheck = jest
        .spyOn(releaseService["integrityService"], "check")
        .mockResolvedValue(true);
      jest
        .spyOn(releaseService["workspace"], "getPackages")
        .mockResolvedValue([
          { name: "pkg1", path: "/path/pkg1", currentVersion: "1.0.0" },
        ]);
      jest
        .spyOn(releaseService["workspace"], "getPackageConfig")
        .mockResolvedValue(config);
      jest
        .spyOn(releaseService["prompts"], "confirmRelease")
        .mockResolvedValue(true);

      await releaseService.releasePackages(["pkg1"], { checkIntegrity: true });

      expect(mockCheck).toHaveBeenCalled();
    });

    it("should throw error when integrity check fails", async () => {
      jest
        .spyOn(releaseService["integrityService"], "check")
        .mockResolvedValue(false);

      await expect(
        releaseService.releasePackages(["pkg1"], { checkIntegrity: true }),
      ).rejects.toThrow(
        "Workspace integrity check failed. Please fix the issues above or run without --check-integrity",
      );
    });

    it("should handle dry run mode", async () => {
      const mockPackages = [
        { name: "pkg1", path: "/path/pkg1", currentVersion: "1.0.0" },
      ];

      jest
        .spyOn(releaseService["workspace"], "getPackages")
        .mockResolvedValue(mockPackages);
      jest
        .spyOn(releaseService["workspace"], "getPackageConfig")
        .mockResolvedValue(config);
      const spyLogger = jest.spyOn(releaseService["logger"], "info");

      const results = await releaseService.releasePackages(["pkg1"], {
        dryRun: true,
      });

      expect(results[0]).toMatchObject({
        packageName: "pkg1",
        changelog: "Dry run - no changes made",
        git: { tag: "dry-run", commit: "dry-run" },
      });
      expect(spyLogger).toHaveBeenCalledWith("Dry run completed");
    });

    it("should cancel release when user does not confirm", async () => {
      const mockPackages = [
        { name: "pkg1", path: "/path/pkg1", currentVersion: "1.0.0" },
      ];

      jest
        .spyOn(releaseService["workspace"], "getPackages")
        .mockResolvedValue(mockPackages);
      jest
        .spyOn(releaseService["workspace"], "getPackageConfig")
        .mockResolvedValue(config);
      jest
        .spyOn(releaseService["version"], "determineVersion")
        .mockReturnValue("1.0.1");
      jest
        .spyOn(releaseService["changelog"], "generate")
        .mockResolvedValue("Changelog entry");
      jest
        .spyOn(releaseService["prompts"], "confirmRelease")
        .mockResolvedValue(false);

      await expect(
        releaseService.releasePackages(["pkg1"], {}),
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
          npm: {
            publish: true,
            registry: "https://registry.npmjs.org",
            tag: "beta", // Explicitly set tag to beta
            access: "restricted",
          },
          hooks: {},
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

  describe("hooks", () => {
    it("should run hooks in correct order", async () => {
      const mockHook = jest.fn();
      const mockContext = {
        name: "pkg1",
        path: "/path",
        currentVersion: "1.0.0",
      };
      const mockConfig = {
        ...config,
        hooks: {
          preRelease: mockHook,
        },
      };

      const spyLogger = jest.spyOn(releaseService["logger"], "info");

      await releaseService["runHooks"]("preRelease", mockConfig, mockContext);

      expect(mockHook).toHaveBeenCalledWith(mockContext);
      expect(spyLogger).toHaveBeenCalledWith("Running preRelease hook...");
    });
  });
});
