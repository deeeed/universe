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

// Add test fixtures
const TEST_FILES = {
  core: {
    path: "packages/core/src/index.ts",
    content: "export const hello = 'world';",
  },
  ui: {
    path: "packages/ui/src/Button.tsx",
    content: "export const Button = () => <button>Click me</button>;",
  },
  config: {
    path: "config.js",
    content: `
      // AWS Configuration
      const config = {
        apiKey: 'AKIAXXXXXXXXXXXXXXXX'
      };
    `,
  },
} as const;

// Test configurations
const TEST_CONFIGS = {
  monorepo: {
    git: {
      baseBranch: "main",
      monorepoPatterns: ["packages/*"] as string[],
      ignorePatterns: [] as string[],
    },
  },
  security: {
    git: {
      baseBranch: "main",
      monorepoPatterns: [] as string[],
      ignorePatterns: ["**/*.log", "build/**"] as string[],
    },
    security: {
      enabled: true,
      rules: {
        secrets: {
          enabled: true,
          severity: "high",
          patterns: ["AKIA[A-Z0-9]{16}"] as string[],
        },
        files: {
          enabled: true,
          severity: "high",
        },
      },
    },
  },
} satisfies Record<string, Partial<Config>>;

describe("CommitService Integration Tests", () => {
  let env: CommitTestEnvironment;

  async function setupCommitTestEnvironment(
    customConfig?: Partial<Config>,
  ): Promise<CommitTestEnvironment> {
    const baseEnv = await setupBaseTestEnvironment({
      config: customConfig,
    });

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
    it.each([
      {
        name: "should analyze staged files and respect ignore patterns",
        config: {
          git: {
            baseBranch: "main",
            monorepoPatterns: [],
            ignorePatterns: ["*.log", "build/**/*"],
          },
        },
        files: [
          { path: "src/index.ts", content: "console.log('hello');" },
          { path: "build/bundle.js", content: "// built file" },
          { path: "debug.log", content: "log content" },
        ],
        expectedFilesChanged: 1,
        expectedWarnings: 0,
      },
      {
        name: "should detect monorepo scope from file paths",
        config: TEST_CONFIGS.monorepo,
        files: [TEST_FILES.core],
        message: "add hello export",
        expectedMessage: "feat(core): add hello export",
      },
    ])(
      "$name",
      async ({
        config,
        files,
        message,
        expectedFilesChanged,
        expectedMessage,
        expectedWarnings,
      }) => {
        const customEnv = await setupCommitTestEnvironment(config);

        try {
          await customEnv.createFiles(files);
          await customEnv.stageFiles();

          const result = await customEnv.commitService.analyze({ message });

          if (expectedFilesChanged) {
            expect(result.stats.filesChanged).toBe(expectedFilesChanged);
          }
          if (expectedWarnings !== undefined) {
            expect(result.warnings).toHaveLength(expectedWarnings);
          }
          if (expectedMessage) {
            expect(result.formattedMessage).toBe(expectedMessage);
          }
        } finally {
          await customEnv.cleanup();
        }
      },
    );

    // Keep the more complex tests separate
    it("should suggest splitting commits for changes across multiple packages", async () => {
      const customEnv = await setupCommitTestEnvironment(TEST_CONFIGS.monorepo);

      try {
        await customEnv.createFiles([TEST_FILES.core, TEST_FILES.ui]);
        await customEnv.stageFiles();

        const result = await customEnv.commitService.analyze({
          message: "add components",
        });

        expect(result.splitSuggestion).toBeDefined();
        expect(result.splitSuggestion?.suggestions).toHaveLength(2);
        expect(result.warnings.some((w) => w.type === "structure")).toBe(true);
      } finally {
        await customEnv.cleanup();
      }
    });

    it("should analyze staged files with security checks", async () => {
      const customEnv = await setupCommitTestEnvironment(TEST_CONFIGS.security);

      try {
        await customEnv.createFiles([
          { path: "src/index.ts", content: "console.log('hello');" },
          { path: "build/bundle.js", content: "// built file" },
          { path: "debug.log", content: "log content" },
          TEST_FILES.config,
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
    it.each([
      {
        name: "should format message with detected scope",
        message: "add hello export",
        expectedResult: "feat(core): add hello export",
      },
      {
        name: "should preserve existing conventional commit format",
        message: "fix: correct type definition",
        expectedResult: "fix(core): correct type definition",
      },
    ])("$name", async ({ message, expectedResult }) => {
      const customEnv = await setupCommitTestEnvironment(TEST_CONFIGS.monorepo);

      try {
        await customEnv.createFiles([TEST_FILES.core]);
        await customEnv.stageFiles();

        const result = customEnv.commitService.formatCommitMessage({
          message,
          files: [
            {
              path: TEST_FILES.core.path,
              additions: 1,
              deletions: 0,
              isTest: false,
              isConfig: false,
            },
          ],
        });

        expect(result).toBe(expectedResult);
      } finally {
        await customEnv.cleanup();
      }
    });
  });
});
