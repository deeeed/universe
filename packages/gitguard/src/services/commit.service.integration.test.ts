import {
  BaseTestEnvironment,
  setupBaseTestEnvironment,
} from "../test/test-integration.utils.js";
import { Config } from "../types/config.types.js";
import { CommitService } from "./commit.service.js";
import { GitService } from "./git.service.js";
import { SecurityService } from "./security.service.js";

interface CommitTestEnvironment extends BaseTestEnvironment {
  commitService: CommitService;
  git: GitService;
  security: SecurityService;
}

describe("CommitService Integration Tests", () => {
  let env: CommitTestEnvironment;

  async function setupCommitTestEnvironment(
    customConfig?: Partial<Config>,
  ): Promise<CommitTestEnvironment> {
    const baseEnv = await setupBaseTestEnvironment(customConfig);

    const git = new GitService({
      gitConfig: { ...baseEnv.config.git, cwd: baseEnv.tempDir },
      logger: baseEnv.logger,
    });

    const security = new SecurityService({
      config: baseEnv.config,
      logger: baseEnv.logger,
    });

    const commitService = new CommitService({
      config: baseEnv.config,
      git,
      security,
      logger: baseEnv.logger,
    });

    return {
      ...baseEnv,
      commitService,
      git,
      security,
    };
  }

  beforeEach(async () => {
    env = await setupCommitTestEnvironment();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe("analyze", () => {
    it("should analyze staged files and respect ignore patterns", async () => {
      const customEnv = await setupCommitTestEnvironment({
        git: {
          baseBranch: "main",
          monorepoPatterns: [],
          ignorePatterns: ["*.log", "build/**/*"],
        },
      });

      await customEnv.createFiles([
        { path: "src/index.ts", content: "console.log('hello');" },
        { path: "build/bundle.js", content: "// built file" },
        { path: "debug.log", content: "log content" },
      ]);

      await customEnv.stageFiles();
      const result = await customEnv.commitService.analyze({});

      expect(result.stats.filesChanged).toBe(1);
      expect(result.warnings).toHaveLength(0);

      await customEnv.cleanup();
    });

    it("should detect monorepo scope from file paths", async () => {
      const customEnv = await setupCommitTestEnvironment({
        git: {
          baseBranch: "main",
          monorepoPatterns: ["packages/*"],
          ignorePatterns: [],
        },
      });

      await customEnv.createFiles([
        {
          path: "packages/core/src/index.ts",
          content: "export const hello = 'world';",
        },
      ]);

      await customEnv.stageFiles();
      const result = await customEnv.commitService.analyze({
        message: "add hello export",
      });

      expect(result.formattedMessage).toBe("feat(core): add hello export");

      await customEnv.cleanup();
    });

    it("should suggest splitting commits for changes across multiple packages", async () => {
      const customEnv = await setupCommitTestEnvironment({
        git: {
          baseBranch: "main",
          monorepoPatterns: ["packages/*"],
          ignorePatterns: [],
        },
      });

      await customEnv.createFiles([
        {
          path: "packages/core/src/index.ts",
          content: "export const hello = 'world';",
        },
        {
          path: "packages/ui/src/Button.tsx",
          content: "export const Button = () => <button>Click me</button>;",
        },
      ]);

      await customEnv.stageFiles();
      const result = await customEnv.commitService.analyze({
        message: "add components",
      });

      expect(result.splitSuggestion).toBeDefined();
      expect(result.splitSuggestion?.suggestions).toHaveLength(2);
      expect(result.warnings.some((w) => w.type === "structure")).toBe(true);

      await customEnv.cleanup();
    });

    it("should analyze staged files with security checks", async () => {
      const customEnv = await setupCommitTestEnvironment({
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
              patterns: ["AKIA[A-Z0-9]{16}"],
            },
            files: {
              enabled: true,
              severity: "high",
            },
          },
        },
      });

      try {
        await customEnv.createFiles([
          { path: "src/index.ts", content: "console.log('hello');" },
          { path: "build/bundle.js", content: "// built file" },
          { path: "debug.log", content: "log content" },
          {
            path: "config.js",
            content: `
              // AWS Configuration
              const config = {
                apiKey: 'AKIAXXXXXXXXXXXXXXXX'  // This should trigger the security check
              };
            `,
          },
        ]);

        await customEnv.stageFiles();
        const diff = await customEnv.git.getDiff({ type: "staged" });

        const result = await customEnv.commitService.analyze({
          diff,
        });

        const securityWarnings = result.warnings.filter(
          (w) => w.type === "security",
        );
        if (securityWarnings.length === 0) {
          console.log(
            "No security warnings found. Full warnings:",
            result.warnings,
          );
          console.log("Diff content:", diff);
        }

        expect(result.warnings).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: "security",
              severity: "high",
            }),
          ]),
        );

        expect(result.stats.filesChanged).toBe(2); // src/index.ts and config.js
      } finally {
        await customEnv.cleanup();
      }
    });
  });

  describe("formatCommitMessage", () => {
    it("should format message with detected scope", async () => {
      const customEnv = await setupCommitTestEnvironment({
        git: {
          baseBranch: "main",
          monorepoPatterns: ["packages/*"],
          ignorePatterns: [],
        },
      });

      await customEnv.createFiles([
        {
          path: "packages/core/src/index.ts",
          content: "export const hello = 'world';",
        },
      ]);

      await customEnv.stageFiles();
      const result = customEnv.commitService.formatCommitMessage({
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

      await customEnv.cleanup();
    });

    it("should preserve existing conventional commit format", async () => {
      const customEnv = await setupCommitTestEnvironment({
        git: {
          baseBranch: "main",
          monorepoPatterns: ["packages/*"],
          ignorePatterns: [],
        },
      });

      await customEnv.createFiles([
        {
          path: "packages/core/src/index.ts",
          content: "export const hello = 'world';",
        },
      ]);

      await customEnv.stageFiles();
      const result = customEnv.commitService.formatCommitMessage({
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

      await customEnv.cleanup();
    });
  });
});
