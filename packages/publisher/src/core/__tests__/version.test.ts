/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { VersionService } from "../version";
import type { PackageContext, GitConfig } from "../../types/config";
import {
  jest,
  expect,
  describe,
  it,
  beforeEach,
  afterEach,
} from "@jest/globals";

type MockFunction = (...args: any[]) => Promise<unknown>;

describe("VersionService", () => {
  let versionService: VersionService;
  let mockExecCommand: jest.MockedFunction<MockFunction>;

  beforeEach(() => {
    const mockGitConfig: GitConfig = {
      tagPrefix: "v",
      requireCleanWorkingDirectory: false,
      requireUpToDate: false,
      commit: true,
      push: true,
      requireUpstreamTracking: true,
      commitMessage: "chore: release v${version}",
      tag: true,
      tagMessage: "Release v${version}",
      allowedBranches: ["main", "master"],
      remote: "origin",
    };
    versionService = new VersionService(mockGitConfig);
  });

  describe("determineVersion", () => {
    const context: PackageContext = {
      name: "test-package",
      path: "/test/path",
      currentVersion: "1.0.0",
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
    };

    it("should bump patch version correctly", () => {
      const newVersion = versionService.determineVersion(context, "patch");
      expect(newVersion).toBe("1.0.1");
    });

    it("should bump minor version correctly", () => {
      const newVersion = versionService.determineVersion(context, "minor");
      expect(newVersion).toBe("1.1.0");
    });

    it("should bump major version correctly", () => {
      const newVersion = versionService.determineVersion(context, "major");
      expect(newVersion).toBe("2.0.0");
    });

    it("should handle custom version", () => {
      const customContext = { ...context, newVersion: "1.5.0" };
      const newVersion = versionService.determineVersion(
        customContext,
        "custom",
      );
      expect(newVersion).toBe("1.5.0");
    });

    it("should throw error for invalid current version", () => {
      const invalidContext = { ...context, currentVersion: "invalid" };
      expect(() =>
        versionService.determineVersion(invalidContext, "patch"),
      ).toThrow("Invalid current version");
    });
  });

  describe("updateDependencies", () => {
    beforeEach(() => {
      // @ts-expect-error dont need to mock exec
      mockExecCommand = jest.fn().mockResolvedValue({});
      jest
        .spyOn(versionService as any, "execCommand")
        .mockImplementation(mockExecCommand);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should update package dependencies correctly", async () => {
      const mockPackageJson = {
        dependencies: {
          "dep-a": "^1.0.0",
          "dep-b": "^2.0.0",
        },
        devDependencies: {
          "dev-dep-a": "^1.0.0",
        },
        peerDependencies: {},
      };

      jest.mock("/test/path/package.json", () => mockPackageJson, {
        virtual: true,
      });

      const context: PackageContext = {
        name: "test-package",
        path: "/test/path",
        currentVersion: "1.0.0",
        dependencies: {
          "dep-a": "^1.0.0",
          "dep-b": "^2.0.0",
        },
        devDependencies: {
          "dev-dep-a": "^1.0.0",
        },
        peerDependencies: {},
      };

      const updates: Map<string, string> = new Map([
        ["dep-a", "1.1.0"],
        ["dev-dep-a", "1.2.0"],
      ]);

      await versionService.updateDependencies(context, updates);

      expect(mockExecCommand).toHaveBeenCalledWith(
        "yarn",
        ["up", "dep-a", "dev-dep-a"],
        { cwd: "/test/path" },
      );
    });

    it("should not call yarn if no updates are needed", async () => {
      const context: PackageContext = {
        name: "test-package",
        path: "/test/path",
        currentVersion: "1.0.0",
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
      };

      const updates = new Map<string, string>();

      await versionService.updateDependencies(context, updates);

      expect(mockExecCommand).not.toHaveBeenCalled();
    });

    it("should handle empty dependency sections", async () => {
      const context: PackageContext = {
        name: "test-package",
        path: "/test/path",
        currentVersion: "1.0.0",
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
      };

      const updates = new Map<string, string>([["dep-a", "1.1.0"]]);

      await versionService.updateDependencies(context, updates);

      expect(mockExecCommand).toHaveBeenCalledWith("yarn", ["up", "dep-a"], {
        cwd: "/test/path",
      });
    });
  });
});
