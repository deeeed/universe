import simpleGit from "simple-git";
import type { GitConfig, PackageContext } from "../../types/config";
import { GitService } from "../git";

jest.mock("simple-git");

const MOCK_CWD = "/mock/project/root";

describe("GitService", () => {
  let gitService: GitService;
  const mockGit = {
    status: jest.fn(),
    fetch: jest.fn(),
    tag: jest.fn(),
    add: jest.fn(),
    commit: jest.fn(),
    push: jest.fn(),
    addAnnotatedTag: jest.fn(),
    tags: jest.fn(),
    log: jest.fn(),
    show: jest.fn(),
    raw: jest.fn(),
  };

  beforeEach(() => {
    (simpleGit as jest.Mock).mockReturnValue(mockGit);
    const config: GitConfig = {
      tagPrefix: "v",
      requireCleanWorkingDirectory: true,
      requireUpToDate: true,
      commit: true,
      requireUpstreamTracking: true,
      push: true,
      commitMessage: "chore(release): release ${packageName}@${version}",
      tag: true,
      allowedBranches: ["main"],
      remote: "origin",
    };
    gitService = new GitService(config, MOCK_CWD);
  });

  describe("validateStatus", () => {
    it("should pass validation for clean working directory on main branch", async () => {
      mockGit.status.mockResolvedValue({
        isClean: () => true,
        current: "main",
        tracking: "origin/main",
        behind: 0,
      });

      await expect(gitService.validateStatus()).resolves.not.toThrow();
    });

    it("should throw error for dirty working directory", async () => {
      mockGit.status.mockResolvedValue({
        isClean: () => false,
        current: "main",
        files: [
          { path: "packages/my-package/src/index.ts" },
          { path: "packages/my-package/package.json" },
        ],
      });

      await expect(gitService.validateStatus()).rejects.toThrow(
        "Working directory is not clean. The following files have changes:\n" +
          "- packages/my-package/src/index.ts\n" +
          "- packages/my-package/package.json\n\n" +
          "To proceed anyway, you can:\n" +
          "1. Commit or stash your changes\n" +
          "2. Run with --no-git-check to skip this check",
      );
    });
  });

  describe("additional validation scenarios", () => {
    it("should throw error for non-allowed branch", async () => {
      mockGit.status.mockResolvedValue({
        isClean: () => true,
        current: "feature",
        tracking: "origin/feature",
        behind: 0,
      });

      await expect(gitService.validateStatus()).rejects.toThrow(
        "Current branch feature is not in allowed branches: main",
      );
    });

    it("should throw error when branch is behind remote", async () => {
      mockGit.status.mockResolvedValue({
        isClean: () => true,
        current: "main",
        tracking: "origin/main",
        behind: 2,
      });

      await expect(gitService.validateStatus()).rejects.toThrow(
        "Branch main is behind origin/main by 2 commits",
      );
    });
  });

  describe("hasChanges", () => {
    const packagePath = "/mock/project/root/packages/my-package";

    it("should return true if there are uncommitted changes", async () => {
      mockGit.status.mockResolvedValue({
        files: [{ path: "packages/my-package/src/index.ts" }],
      });

      const result = await gitService.hasChanges(packagePath);
      expect(result).toBe(true);
    });

    it("should check commits since last tag if no uncommitted changes", async () => {
      mockGit.status.mockResolvedValue({ files: [] });
      mockGit.tags.mockResolvedValue({ all: ["my-package@1.0.0"] });
      mockGit.log.mockResolvedValue({
        all: [{ hash: "abc123" }],
      });
      mockGit.show.mockResolvedValue(
        "abc123\n2024-01-01\ncommit message\n\npackages/my-package/file.ts",
      );

      const result = await gitService.hasChanges(packagePath);
      expect(result).toBe(true);
    });

    it("should return false if no changes found", async () => {
      mockGit.status.mockResolvedValue({ files: [] });
      mockGit.tags.mockResolvedValue({ all: ["my-package@1.0.0"] });
      mockGit.log.mockResolvedValue({
        all: [{ hash: "abc123" }],
      });
      mockGit.show.mockResolvedValue(
        "abc123\n2024-01-01\ncommit message\n\nother-package/file.ts",
      );

      const result = await gitService.hasChanges(packagePath);
      expect(result).toBe(false);
    });
  });

  describe("getLastTag", () => {
    it("should return the latest tag for a package", async () => {
      mockGit.tags.mockResolvedValue({
        all: ["my-package@1.0.0", "my-package@1.1.0", "other-package@2.0.0"],
      });

      const result = await gitService.getLastTag("my-package");
      expect(result).toBe("my-package@1.1.0");
    });

    it("should return empty string if no tags found", async () => {
      mockGit.tags.mockResolvedValue({ all: [] });

      const result = await gitService.getLastTag("my-package");
      expect(result).toBe("");
    });
  });

  describe("getCommitsSinceTag", () => {
    it("should return commits since specified tag", async () => {
      mockGit.log.mockResolvedValue({
        all: [{ hash: "abc123" }, { hash: "def456" }],
      });
      mockGit.show
        .mockResolvedValueOnce("abc123\n2024-01-01\nfirst commit\n\nfile1.ts")
        .mockResolvedValueOnce("def456\n2024-01-02\nsecond commit\n\nfile2.ts");

      const commits = await gitService.getCommitsSinceTag("v1.0.0");
      expect(commits).toHaveLength(2);
      expect(commits[0]).toEqual({
        hash: "abc123",
        date: "2024-01-01",
        message: "first commit",
        body: null,
        files: ["file1.ts"],
      });
    });

    it("should return all commits if no tag specified", async () => {
      mockGit.log.mockResolvedValue({
        all: [{ hash: "abc123" }],
      });
      mockGit.show.mockResolvedValue("abc123\n2024-01-01\ncommit\n\nfile.ts");

      const commits = await gitService.getCommitsSinceTag("");
      expect(commits).toHaveLength(1);
    });
  });

  describe("createTag", () => {
    const context: PackageContext = {
      name: "my-package",
      newVersion: "1.2.0",
      currentVersion: "1.1.0",
      path: "/mock/project/root/packages/my-package",
    };

    it("should check if tag exists before attempting to delete", async () => {
      const spyCheckTagExists = jest
        .spyOn(gitService, "checkTagExists")
        .mockResolvedValue(false);

      const spyDeleteTag = jest
        .spyOn(gitService, "deleteTag")
        .mockResolvedValue();

      await gitService.createTag(context, true);

      expect(spyCheckTagExists).toHaveBeenCalledWith("vmy-package@1.2.0");
      expect(spyDeleteTag).not.toHaveBeenCalled();
      expect(mockGit.addAnnotatedTag).toHaveBeenCalledWith(
        "vmy-package@1.2.0",
        "Release vmy-package@1.2.0",
      );
    });

    it("should delete existing tag when force is true", async () => {
      const spyCheckTagExists = jest
        .spyOn(gitService, "checkTagExists")
        .mockResolvedValue(true);

      const spyDeleteTag = jest
        .spyOn(gitService, "deleteTag")
        .mockResolvedValue();

      await gitService.createTag(context, true);

      expect(spyCheckTagExists).toHaveBeenCalledWith("vmy-package@1.2.0");
      expect(spyDeleteTag).toHaveBeenCalledWith("vmy-package@1.2.0", true);
      expect(mockGit.addAnnotatedTag).toHaveBeenCalledWith(
        "vmy-package@1.2.0",
        "Release vmy-package@1.2.0",
      );
    });
  });

  describe("commitChanges", () => {
    it("should commit changes with formatted message", async () => {
      const context: PackageContext = {
        name: "my-package",
        newVersion: "1.2.0",
        currentVersion: "1.1.0",
        path: "/mock/project/root/packages/my-package",
      };
      const changelogPath =
        "/mock/project/root/packages/my-package/CHANGELOG.md";

      mockGit.commit.mockResolvedValue({ commit: "abc123" });

      await gitService.commitChanges(context, changelogPath);

      expect(mockGit.add).toHaveBeenCalledWith([
        "packages/my-package/package.json",
        "packages/my-package/CHANGELOG.md",
      ]);
      expect(mockGit.commit).toHaveBeenCalledWith(
        "chore(release): release my-package@1.2.0",
      );
    });

    it("should throw if no new version provided", async () => {
      const context: PackageContext = {
        name: "my-package",
        currentVersion: "1.1.0",
        path: "/mock/project/root/packages/my-package",
      };
      const changelogPath =
        "/mock/project/root/packages/my-package/CHANGELOG.md";

      await expect(
        gitService.commitChanges(context, changelogPath),
      ).rejects.toThrow("New version is required to create a commit message");
    });
  });

  describe("push", () => {
    it("should handle push rejection with helpful error", async () => {
      mockGit.push.mockRejectedValue(new Error("rejected (non-fast-forward)"));
      mockGit.status.mockResolvedValue({ current: "main" });

      await expect(gitService.push()).rejects.toThrow(
        /Push failed. Your branch is out of sync with remote/,
      );
    });
  });

  describe("deleteTag", () => {
    it("should not throw when deleting non-existent tag", async () => {
      const spyCheckTagExists = jest
        .spyOn(gitService, "checkTagExists")
        .mockResolvedValue(false);

      await expect(
        gitService.deleteTag("non-existent-tag", true),
      ).resolves.not.toThrow();

      expect(spyCheckTagExists).toHaveBeenCalledWith("non-existent-tag");
      expect(mockGit.raw).not.toHaveBeenCalledWith([
        "tag",
        "-d",
        "non-existent-tag",
      ]);
    });

    it("should attempt remote deletion even if local tag doesn't exist", async () => {
      const spyCheckTagExists = jest
        .spyOn(gitService, "checkTagExists")
        .mockResolvedValue(false);

      await gitService.deleteTag("remote-only-tag", true);

      expect(spyCheckTagExists).toHaveBeenCalledWith("remote-only-tag");
      expect(mockGit.raw).toHaveBeenCalledWith([
        "push",
        "origin",
        ":refs/tags/remote-only-tag",
      ]);
    });
  });
});
