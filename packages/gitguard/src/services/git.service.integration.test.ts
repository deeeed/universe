import { exec } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
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

    // Initialize git service with temp directory
    gitService = new GitService({
      gitConfig: {
        cwd: tempDir,
        baseBranch: "main",
        monorepoPatterns: [],
        ignorePatterns: [],
      },
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
        isDebug: jest.fn(),
      },
    });

    // Initialize git repository
    await execPromise("git init", { cwd: tempDir });
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

    it("should return modified files", async () => {
      // Create and commit a file
      await writeFile(join(tempDir, "test.txt"), "initial content");
      await execPromise("git add .", { cwd: tempDir });
      await execPromise('git commit -m "Initial commit"', { cwd: tempDir });

      // Modify the file
      await writeFile(join(tempDir, "test.txt"), "modified content");

      const changes = await gitService.getUnstagedChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        path: "test.txt",
        status: "modified",
      });
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
});
