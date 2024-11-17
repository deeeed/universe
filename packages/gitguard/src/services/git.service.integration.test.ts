import { jest } from "@jest/globals";
import { exec } from "child_process";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { GitService } from "./git.service.js";

const execPromise = promisify(exec);

describe("GitService Integration Tests", () => {
  let tempDir: string;
  let gitService: GitService;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await mkdtemp(join(tmpdir(), "gitguard-test-"));

    // Initialize git repository first
    await execPromise("git init", { cwd: tempDir });

    // Initialize git service with temp directory
    gitService = new GitService({
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        success: jest.fn(),
        warning: jest.fn(),
        raw: jest.fn(),
        newLine: jest.fn(),
        table: jest.fn(),
        isDebug: jest.fn(() => false),
      },
      gitConfig: {
        cwd: tempDir,
        baseBranch: "main",
        monorepoPatterns: [],
        ignorePatterns: [],
      },
    });
  });

  afterEach(async () => {
    // Cleanup temporary directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("getCurrentBranch", () => {
    it("should return default branch for new repository", async () => {
      const branch = await gitService.getCurrentBranch();
      expect(branch).toBe("main");
    });

    it("should return correct branch after first commit", async () => {
      // Create and commit a file
      await writeFile(join(tempDir, "test.txt"), "test content");
      await execPromise("git add .", { cwd: tempDir });
      await execPromise('git commit -m "Initial commit"', { cwd: tempDir });

      const branch = await gitService.getCurrentBranch();
      expect(branch).toBe("main");
    });

    it("should return new branch name after branch creation", async () => {
      // Setup initial commit
      await writeFile(join(tempDir, "test.txt"), "test content");
      await execPromise("git add .", { cwd: tempDir });
      await execPromise('git commit -m "Initial commit"', { cwd: tempDir });

      // Create and checkout new branch
      await execPromise("git checkout -b feature-branch", { cwd: tempDir });

      const branch = await gitService.getCurrentBranch();
      expect(branch).toBe("feature-branch");
    });
  });

  describe("getStagedChanges", () => {
    it("should return empty array for new repository", async () => {
      const changes = await gitService.getStagedChanges();
      expect(changes).toEqual([]);
    });

    it("should return staged files", async () => {
      // Create and stage a file
      await writeFile(join(tempDir, "test.txt"), "test content");
      await execPromise("git add .", { cwd: tempDir });

      const changes = await gitService.getStagedChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        path: "test.txt",
        additions: 1,
        deletions: 0,
      });
    });

    it("should detect renamed files correctly", async () => {
      // Create and commit initial file
      await writeFile(join(tempDir, "old-name.txt"), "test content");
      await execPromise("git add .", { cwd: tempDir });
      await execPromise('git commit -m "Initial commit"', { cwd: tempDir });

      // Rename the file and stage it
      await execPromise("git mv old-name.txt new-name.txt", { cwd: tempDir });

      const changes = await gitService.getStagedChanges();
      expect(changes).toHaveLength(2); // Should show both deletion and addition
      expect(changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "old-name.txt",
            status: "deleted",
            additions: 0,
            deletions: 1,
          }),
          expect.objectContaining({
            path: "new-name.txt",
            status: "added",
            additions: 1,
            deletions: 0,
          }),
        ]),
      );
    });

    it("should detect renamed files correctly when executed from subdirectory", async () => {
      // Create subdirectory
      const subDir = join(tempDir, "subdir");
      await mkdir(subDir);

      // Create and commit initial file in subdirectory
      await writeFile(join(subDir, "old-name.txt"), "test content");
      await execPromise("git add .", { cwd: tempDir });
      await execPromise('git commit -m "Initial commit"', { cwd: tempDir });

      const originalDir = process.cwd();
      try {
        const anotherSubDir = join(tempDir, "another-subdir");
        await mkdir(anotherSubDir);
        // Rename the file and stage it using full relative paths
        await execPromise(
          "git mv subdir/old-name.txt another-subdir/new-name.txt",
          {
            cwd: tempDir,
          },
        );
        // Change working directory to subdirectory
        process.chdir(subDir);

        const changes = await gitService.getStagedChanges();
        expect(changes).toHaveLength(2); // Should show both deletion and addition
        expect(changes).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: "subdir/old-name.txt",
              status: "deleted",
              additions: 0,
              deletions: 1,
            }),
            expect.objectContaining({
              path: "another-subdir/new-name.txt",
              status: "added",
              additions: 1,
              deletions: 0,
            }),
          ]),
        );
      } finally {
        // Always restore original directory
        process.chdir(originalDir);
      }
    });
  });

  describe("getUnstagedChanges", () => {
    it("should return empty array for new repository", async () => {
      const changes = await gitService.getUnstagedChanges();
      expect(changes).toEqual([]);
    });

    it("should return unstaged files", async () => {
      // Create file without staging
      await writeFile(join(tempDir, "test.txt"), "test content");

      const changes = await gitService.getUnstagedChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        path: "test.txt",
        status: "untracked",
      });
    });

    it("should return modified files including those in subdirectories when executed from subdirectory", async () => {
      // Create subdirectory
      const subDir = join(tempDir, "subdir");
      await mkdir(subDir);

      // Create and commit files in both root and subdirectory
      await writeFile(join(tempDir, "root.txt"), "initial content");
      await writeFile(join(subDir, "nested.txt"), "initial content");
      await execPromise("git add .", { cwd: tempDir });
      await execPromise('git commit -m "Initial commit"', { cwd: tempDir });

      // Modify both files
      await writeFile(join(tempDir, "root.txt"), "modified content");
      await writeFile(join(subDir, "nested.txt"), "modified content");

      // Store original directory
      const originalDir = process.cwd();
      try {
        // Change working directory to subdirectory before getting changes
        process.chdir(subDir);
        const changes = await gitService.getUnstagedChanges();

        expect(changes).toHaveLength(2);
        expect(changes).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: "root.txt",
              status: "modified",
            }),
            expect.objectContaining({
              path: "subdir/nested.txt",
              status: "modified",
            }),
          ]),
        );
      } finally {
        // Always restore original directory
        process.chdir(originalDir);
      }
    });
  });

  describe("renameBranch", () => {
    beforeEach(async () => {
      // Setup initial commit
      await writeFile(join(tempDir, "test.txt"), "test content");
      await execPromise("git add .", { cwd: tempDir });
      await execPromise('git commit -m "Initial commit"', { cwd: tempDir });
    });

    it("should rename current branch", async () => {
      await gitService.renameBranch({ from: "main", to: "new-main" });
      const branch = await gitService.getCurrentBranch();
      expect(branch).toBe("new-main");
    });

    it("should throw error when target branch exists", async () => {
      // Create target branch
      await execPromise("git branch new-main", { cwd: tempDir });

      await expect(
        gitService.renameBranch({ from: "main", to: "new-main" }),
      ).rejects.toThrow('Branch "new-main" already exists');
    });
  });

  describe("unstageFiles", () => {
    beforeEach(async () => {
      // Setup initial commit
      await writeFile(join(tempDir, "test.txt"), "test content");
      await execPromise("git add .", { cwd: tempDir });
      await execPromise('git commit -m "Initial commit"', { cwd: tempDir });
    });

    it("should handle unstaging renamed files", async () => {
      // Rename a file using git mv and stage it
      await execPromise("git mv test.txt renamed.txt", { cwd: tempDir });

      // Verify the file is staged
      const stagedChanges = await gitService.getStagedChanges();
      expect(stagedChanges).toHaveLength(2); // Should show both deletion and addition
      expect(stagedChanges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "test.txt",
            status: "deleted",
          }),
          expect.objectContaining({
            path: "renamed.txt",
            status: "added",
          }),
        ]),
      );

      // Try to unstage both the old and new filenames
      await gitService.unstageFiles({ files: ["test.txt", "renamed.txt"] });

      // Verify the file was unstaged
      const afterUnstage = await gitService.getStagedChanges();
      expect(afterUnstage).toHaveLength(0);
    });
  });
});
