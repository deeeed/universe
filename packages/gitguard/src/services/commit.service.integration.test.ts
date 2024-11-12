import { exec } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { Config } from "../types/config.types.js";
import { Logger } from "../types/logger.types.js";
import { CommitService } from "./commit.service.js";
import { GitService } from "./git.service.js";
import { LoggerService } from "./logger.service.js";
import { SecurityService } from "./security.service.js";

const execPromise = promisify(exec);

interface TestEnvironment {
  tempDir: string;
  commitService: CommitService;
  gitService: GitService;
  securityService: SecurityService;
  mockLogger: Logger;
  config: Config;
  createFiles: (
    files: Array<{ path: string; content: string }>,
  ) => Promise<void>;
  stageFiles: () => Promise<void>;
}

describe("CommitService Integration Tests", () => {
  let env: TestEnvironment;

  async function setupTestEnvironment(
    customConfig?: Partial<Config>,
  ): Promise<TestEnvironment> {
    const tempDir = await mkdtemp(join(tmpdir(), "gitguard-commit-test-"));

    // Initialize git repo with initial commit
    await execPromise("git init", { cwd: tempDir });
    await execPromise("git config user.email 'test@example.com'", {
      cwd: tempDir,
    });
    await execPromise("git config user.name 'Test User'", { cwd: tempDir });
    await execPromise("git config core.autocrlf false", { cwd: tempDir });

    // Create and commit an initial file to establish HEAD
    await writeFile(join(tempDir, "README.md"), "# Test Repository");
    await execPromise("git add README.md", { cwd: tempDir });
    await execPromise('git commit -m "Initial commit"', { cwd: tempDir });

    const mockLogger: Logger = new LoggerService({ debug: true });

    const defaultConfig: Config = {
      git: {
        baseBranch: "main",
        monorepoPatterns: [],
        ignorePatterns: [],
      },
      security: {
        enabled: true,
        rules: {
          secrets: {
            enabled: true,
            severity: "high",
          },
          files: {
            enabled: true,
            severity: "high",
          },
        },
      },
      analysis: {
        maxCommitSize: 100,
        maxFileSize: 1000,
        checkConventionalCommits: true,
      },
      debug: true,
      colors: true,
      ai: { enabled: false, provider: null },
      pr: {
        template: {
          path: "",
          required: false,
          sections: {
            description: false,
            breaking: false,
            testing: false,
            checklist: false,
          },
        },
        maxSize: 100,
        requireApprovals: 1,
      },
    };

    const config = { ...defaultConfig, ...customConfig };
    const gitService = new GitService({
      gitConfig: { ...config.git, cwd: tempDir },
      logger: mockLogger,
    });
    const securityService = new SecurityService({
      config,
      logger: mockLogger,
    });
    const commitService = new CommitService({
      config,
      git: gitService,
      logger: mockLogger,
      security: securityService,
    });

    const createFiles = async (
      files: Array<{ path: string; content: string }>,
    ): Promise<void> => {
      for (const file of files) {
        const fullPath = join(tempDir, file.path);
        const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
        if (dir !== tempDir) {
          await execPromise(`mkdir -p "${dir}"`);
        }
        await writeFile(fullPath, file.content);
      }
    };

    const stageFiles = async (): Promise<void> => {
      await execPromise("git add .", { cwd: tempDir });
    };

    return {
      tempDir,
      commitService,
      gitService,
      securityService,
      mockLogger,
      config,
      createFiles,
      stageFiles,
    };
  }

  beforeEach(async () => {
    env = await setupTestEnvironment();
  });

  afterEach(async () => {
    await rm(env.tempDir, { recursive: true, force: true });
  });

  describe("analyze", () => {
    it("should return empty result when no files are staged", async () => {
      const result = await env.commitService.analyze({});

      expect(result).toMatchObject({
        stats: {
          filesChanged: 0,
          additions: 0,
          deletions: 0,
        },
        warnings: [],
      });
    });

    it("should analyze staged files and respect ignore patterns", async () => {
      // Setup with ignore patterns
      env = await setupTestEnvironment({
        git: {
          baseBranch: "main",
          monorepoPatterns: [],
          ignorePatterns: ["*.log", "build/**/*"],
        },
      });

      await env.createFiles([
        { path: "src/index.ts", content: "console.log('hello');" },
        { path: "build/bundle.js", content: "// built file" },
        { path: "debug.log", content: "log content" },
      ]);

      await env.stageFiles();

      const result = await env.commitService.analyze({});

      // Only src/index.ts should be included
      expect(result.stats.filesChanged).toBe(1);
      expect(result.warnings).toHaveLength(0);
    });

    it("should detect monorepo scope from file paths", async () => {
      env = await setupTestEnvironment({
        git: {
          baseBranch: "main",
          monorepoPatterns: ["packages/*"],
          ignorePatterns: [],
        },
      });

      await env.createFiles([
        {
          path: "packages/core/src/index.ts",
          content: "export const hello = 'world';",
        },
      ]);

      await env.stageFiles();

      const result = await env.commitService.analyze({
        message: "add hello export",
      });

      // Verify the scope is detected from the monorepo pattern
      expect(result.formattedMessage).toBe("feat(core): add hello export");
    });

    it("should suggest splitting commits for changes across multiple packages", async () => {
      env = await setupTestEnvironment({
        git: {
          baseBranch: "main",
          monorepoPatterns: ["packages/*"],
          ignorePatterns: [],
        },
      });

      await env.createFiles([
        {
          path: "packages/core/src/index.ts",
          content: "export const hello = 'world';",
        },
        {
          path: "packages/ui/src/Button.tsx",
          content: "export const Button = () => <button>Click me</button>;",
        },
      ]);

      await env.stageFiles();

      const result = await env.commitService.analyze({
        message: "add components",
      });

      expect(result.splitSuggestion).toBeDefined();
      expect(result.splitSuggestion?.suggestions).toHaveLength(2);
      expect(result.warnings.some((w) => w.type === "structure")).toBe(true);
    });

    it("should analyze staged files with security checks", async () => {
      env = await setupTestEnvironment({
        git: {
          baseBranch: "main",
          monorepoPatterns: [],
          ignorePatterns: ["**/*.log", "build/**"],
        },
        security: {
          enabled: true,
          rules: {
            secrets: {
              enabled: true,
              severity: "high",
            },
            files: {
              enabled: true,
              severity: "high",
            },
          },
        },
      });

      await env.createFiles([
        { path: "src/index.ts", content: "console.log('hello');" },
        { path: "build/bundle.js", content: "// built file" },
        { path: "debug.log", content: "log content" },
        {
          path: "config.js",
          content: "const apiKey = 'AKIA1234567890ABCDEF';", // Should trigger security warning
        },
      ]);

      await env.stageFiles();

      const result = await env.commitService.analyze({});

      // Verify security findings
      expect(result.warnings.some((w) => w.type === "security")).toBe(true);

      // Verify ignored files are excluded
      const nonIgnoredFiles = result.stats.filesChanged;
      expect(nonIgnoredFiles).toBe(2); // src/index.ts and config.js
    });
  });

  describe("formatCommitMessage", () => {
    it("should format message with detected scope", async () => {
      env = await setupTestEnvironment({
        git: {
          baseBranch: "main",
          monorepoPatterns: ["packages/*"],
          ignorePatterns: [],
        },
      });

      const result = env.commitService.formatCommitMessage({
        message: "add hello export",
        files: [
          {
            path: "packages/core/src/index.ts",
            additions: 1,
            deletions: 0,
            isTest: false,
            isConfig: false,
          },
        ],
      });

      expect(result).toBe("feat(core): add hello export");
    });

    it("should preserve existing conventional commit format", async () => {
      env = await setupTestEnvironment({
        git: {
          baseBranch: "main",
          monorepoPatterns: ["packages/*"],
          ignorePatterns: [],
        },
      });

      const result = env.commitService.formatCommitMessage({
        message: "fix: correct type definition",
        files: [
          {
            path: "packages/core/src/index.ts",
            additions: 1,
            deletions: 0,
            isTest: false,
            isConfig: false,
          },
        ],
      });

      expect(result).toBe("fix(core): correct type definition");
    });
  });
});
