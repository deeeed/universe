import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { parseArgs } from "node:util";
import { tmpdir } from "os";
import { dirname, join } from "path";
import readline from "readline";
import { prepareCommit } from "../src/hooks/prepare-commit.js";
import { LoggerService } from "../src/services/logger.service.js";
import { spawn } from "child_process";

interface TestScenario {
  name: string;
  setup: {
    files: Array<{
      path: string;
      content: string;
    }>;
    monorepo?: boolean;
    config?: {
      ai?: { enabled: boolean };
      analysis?: {
        maxCommitSize?: number;
        maxFileSize?: number;
      };
      security?: {
        enabled: boolean;
      };
    };
  };
  input: {
    message: string;
  };
  expected: {
    message: string;
    securityIssues?: boolean;
    splitSuggestion?: boolean;
    aiSuggestions?: boolean;
  };
}

interface TestResult {
  success: boolean;
  message: string;
  error?: Error;
  details?: {
    input: string;
    output: string;
    warnings?: string[];
  };
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    name: "Basic commit message formatting",
    setup: {
      files: [{ path: "src/feature.ts", content: "console.log('test');" }],
    },
    input: {
      message: "add new feature",
    },
    expected: {
      message: "feat: add new feature",
    },
  },
  {
    name: "Monorepo package detection",
    setup: {
      monorepo: true,
      files: [
        {
          path: "packages/app/src/feature.ts",
          content: "console.log('test');",
        },
      ],
    },
    input: {
      message: "add new feature",
    },
    expected: {
      message: "feat(app): add new feature",
    },
  },
  {
    name: "Security check - AWS credentials",
    setup: {
      files: [
        {
          path: ".env",
          content: "AWS_SECRET_KEY=AKIAXXXXXXXXXXXXXXXX",
        },
      ],
    },
    input: {
      message: "add config",
    },
    expected: {
      message: "chore: add config",
      securityIssues: true,
    },
  },
  {
    name: "Multi-package changes",
    setup: {
      monorepo: true,
      files: [
        {
          path: "packages/app/src/feature.ts",
          content: "console.log('app');",
        },
        {
          path: "packages/core/src/utils.ts",
          content: "console.log('core');",
        },
      ],
    },
    input: {
      message: "update features",
    },
    expected: {
      message: "feat(app,core): update features",
      splitSuggestion: true,
    },
  },
  {
    name: "AI suggestions enabled",
    setup: {
      files: [{ path: "src/feature.ts", content: "console.log('test');" }],
      config: {
        ai: { enabled: true },
      },
    },
    input: {
      message: "add new feature",
    },
    expected: {
      message: "feat: add new feature",
      aiSuggestions: true,
    },
  },
  {
    name: "Security check - Environment variables",
    setup: {
      files: [
        {
          path: ".env.local",
          content: "DATABASE_URL=postgresql://user:password@localhost:5432/db",
        },
      ],
      config: {
        security: {
          enabled: true,
        },
      },
    },
    input: {
      message: "add database config",
    },
    expected: {
      message: "chore: add database config",
      securityIssues: true,
    },
  },
  {
    name: "Large commit detection",
    setup: {
      files: Array.from({ length: 10 }, (_, i) => ({
        path: `src/feature${i}.ts`,
        content: "console.log('test');".repeat(100),
      })),
    },
    input: {
      message: "massive update",
    },
    expected: {
      message: "feat: massive update",
      splitSuggestion: true,
    },
  },
];

interface GitEnv {
  GIT_AUTHOR_NAME: string;
  GIT_AUTHOR_EMAIL: string;
  GIT_COMMITTER_NAME: string;
  GIT_COMMITTER_EMAIL: string;
  GIT_EDITOR: string;
  HUSKY: string;
  HUSKY_GIT_PARAMS: string;
  LINT_STAGED_COMMIT: string;
  PRE_COMMIT_HOOK: string;
  AUTOMATED_COMMIT: string;
  [key: string]: string | undefined;
}

interface SpawnOptions {
  cwd: string;
  env: Record<string, string | undefined>;
}

function execCommand(
  command: string,
  args: string[],
  options: SpawnOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, options);

    process.on("error", (error) => {
      reject(error);
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function setupTestRepo(scenario: TestScenario): Promise<string> {
  const logger = new LoggerService({
    debug: process.argv.includes("--debug"),
  });
  const testDir = join(tmpdir(), `gitguard-test-${Date.now()}`);

  const gitEnv: GitEnv = {
    ...(process.env as Record<string, string>),
    GIT_AUTHOR_NAME: "GitGuard Test",
    GIT_AUTHOR_EMAIL: "test@gitguard.dev",
    GIT_COMMITTER_NAME: "GitGuard Test",
    GIT_COMMITTER_EMAIL: "test@gitguard.dev",
    GIT_EDITOR: "true",
    HUSKY: "0",
    HUSKY_GIT_PARAMS: "1",
    LINT_STAGED_COMMIT: "1",
    PRE_COMMIT_HOOK: "1",
    AUTOMATED_COMMIT: "1",
  };

  const execOptions: SpawnOptions = {
    cwd: testDir,
    env: gitEnv,
  };

  try {
    logger.debug("Creating test directory:", testDir);
    await mkdir(testDir, { recursive: true });

    logger.debug("Creating .gitguard directory");
    await mkdir(join(testDir, ".gitguard"), { recursive: true });

    logger.debug("Initializing git repository");
    await execCommand("git", ["init"], execOptions);

    logger.debug("Configuring git");
    await execCommand("git", ["config", "core.autocrlf", "false"], execOptions);
    await execCommand("git", ["config", "core.safecrlf", "false"], execOptions);
    await execCommand(
      "git",
      ["config", "commit.gpgsign", "false"],
      execOptions,
    );

    logger.debug("Creating initial commit");
    const readmePath = join(testDir, "README.md");
    await writeFile(readmePath, "# Test Repository");

    logger.debug("Staging README");
    await execCommand("git", ["add", "README.md"], execOptions);

    logger.debug("Creating commit");
    await execCommand(
      "git",
      [
        "commit",
        "--no-verify",
        "--no-gpg-sign",
        "-m",
        "[automated] Initial commit",
      ],
      execOptions,
    );

    // Create test files
    logger.debug("Creating test files");
    for (const file of scenario.setup.files) {
      const filePath = join(testDir, file.path);
      const dirPath = dirname(filePath);
      await mkdir(dirPath, { recursive: true });
      await writeFile(filePath, file.content);
      logger.debug(`Created file: ${filePath}`);
    }

    // Create config
    const defaultConfig = {
      git: {
        baseBranch: "main",
        ignorePatterns: ["*.lock", "dist/*"],
      },
      analysis: {
        maxCommitSize: 500,
        maxFileSize: 800,
        checkConventionalCommits: true,
      },
      ai: { enabled: false },
      security: {
        enabled: false, // Disable security by default
      },
    };

    const config = scenario.setup.config
      ? {
          ...defaultConfig,
          ...scenario.setup.config,
          git: { ...defaultConfig.git },
          analysis: {
            ...defaultConfig.analysis,
            ...(scenario.setup.config.analysis || {}),
          },
          security: {
            enabled: Boolean(scenario.setup.config.security?.enabled),
          },
        }
      : defaultConfig;

    await writeFile(
      join(testDir, ".gitguard/config.json"),
      JSON.stringify(config, null, 2),
    );

    logger.debug("Test repo setup complete");
    return testDir;
  } catch (error) {
    logger.error("Failed to setup test repo:", error);
    await rm(testDir, { recursive: true, force: true }).catch((err) =>
      logger.error("Failed to cleanup after setup failure:", err),
    );
    throw error;
  }
}

async function runScenario(scenario: TestScenario): Promise<TestResult> {
  const logger = new LoggerService({ debug: true });
  let testDir: string | undefined;

  try {
    logger.debug(`\n Setting up test directory for: ${scenario.name}`);
    testDir = await setupTestRepo(scenario);
    logger.debug(`Created test directory: ${testDir}`);

    // Stage files
    logger.debug("Staging test files...");
    await execCommand("git", ["add", "."], { cwd: testDir, env: process.env });
    logger.debug("Files staged successfully");

    // Create commit message
    const messageFile = join(testDir, "COMMIT_EDITMSG");
    await writeFile(messageFile, scenario.input.message);
    logger.debug(`Created commit message file: ${messageFile}`);

    // Run commit-hooks with proper typing
    logger.debug("Running commit hooks...");
    await prepareCommit({
      messageFile,
      config: {
        git: {
          baseBranch: "main",
          cwd: testDir,
          ignorePatterns: ["*.lock", "dist/*"],
        },
        analysis: {
          maxCommitSize: 500,
          maxFileSize: 800,
          checkConventionalCommits: true,
        },
        security: {
          enabled: false,
          checkSecrets: false,
          checkFiles: false,
        },
        ai: {
          enabled: false,
          provider: null,
        },
        hook: {
          defaultChoice: "keep",
          timeoutSeconds: 10,
        },
        pr: {
          template: {
            path: ".github/pull_request_template.md",
            required: false,
            sections: {
              description: true,
              breaking: true,
              testing: true,
              checklist: true,
            },
          },
          maxSize: 800,
          requireApprovals: 1,
        },
        debug: true,
      },
      forceTTY: true,
    });

    // Read results
    const updatedMessage = await readFile(messageFile, "utf-8");
    logger.debug("Updated message:", updatedMessage.trim());

    // Validate results
    if (updatedMessage.trim() !== scenario.expected.message) {
      throw new Error(
        `Message mismatch. Expected "${scenario.expected.message}" but got "${updatedMessage.trim()}"`,
      );
    }

    return {
      success: true,
      message: `✅ ${scenario.name}`,
      details: {
        input: scenario.input.message,
        output: updatedMessage.trim(),
      },
    };
  } catch (error) {
    logger.error(`Scenario failed: ${scenario.name}`, error);
    return {
      success: false,
      message: `❌ ${scenario.name}`,
      error: error instanceof Error ? error : new Error(String(error)),
      details: {
        input: scenario.input.message,
        output: "failed",
      },
    };
  } finally {
    if (testDir) {
      logger.debug(`Cleaning up test directory: ${testDir}`);
      await rm(testDir, { recursive: true, force: true }).catch((error) =>
        logger.error("Failed to cleanup:", error),
      );
    }
  }
}

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function promptUser(question: string): Promise<string> {
  const rl = createInterface();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function selectScenarios(logger: LoggerService): Promise<TestScenario[]> {
  const { values } = parseArgs({
    options: {
      tests: { type: "string" },
      all: { type: "boolean" },
    },
  });

  if (values.tests) {
    const selectedIndices = values.tests
      .split(",")
      .map((n) => parseInt(n.trim()) - 1)
      .filter((n) => n >= 0 && n < TEST_SCENARIOS.length);
    return selectedIndices.map((i) => TEST_SCENARIOS[i]);
  }

  if (values.all) {
    return TEST_SCENARIOS;
  }

  logger.info("\n📋 Available Test Scenarios:");
  TEST_SCENARIOS.forEach((scenario, index) => {
    logger.info(`${index + 1}. ${scenario.name}`);
  });

  const answer = await promptUser(
    "\nEnter scenario numbers to run (comma-separated) or 'all': ",
  );

  if (answer.toLowerCase() === "all") {
    return TEST_SCENARIOS;
  }

  const selectedIndices = answer
    .split(",")
    .map((n) => parseInt(n.trim()) - 1)
    .filter((n) => n >= 0 && n < TEST_SCENARIOS.length);

  return selectedIndices.map((i) => TEST_SCENARIOS[i]);
}

async function main(): Promise<void> {
  const logger = new LoggerService({ debug: true });
  const results: TestResult[] = [];

  try {
    logger.info("🧪 Starting GitGuard test suite...");

    const { values } = parseArgs({
      options: {
        tests: { type: "string" },
        all: { type: "boolean" },
        interactive: { type: "boolean" },
      },
    });

    const selectedScenarios = await selectScenarios(logger);

    for (const scenario of selectedScenarios) {
      logger.info(`\n🔍 Testing scenario: ${scenario.name}`);

      if (values.interactive) {
        const proceed = await promptUser(
          "\nPress Enter to run this test (or 'skip' to skip): ",
        );
        if (proceed.toLowerCase() === "skip") {
          logger.info("Skipped ⏭️");
          continue;
        }
      }

      const result = await runScenario(scenario);
      results.push(result);
      logger.info(`${result.success ? "✅" : "❌"} ${scenario.name}`);

      if (values.interactive && !result.success) {
        const debug = await promptUser(
          "\nTest failed. Enter 'd' for detailed debug info: ",
        );
        if (debug.toLowerCase() === "d") {
          logger.debug("Detailed Error Info:", {
            error: result.error,
            details: result.details,
          });
          await promptUser("\nPress Enter to continue...");
        }
      }
    }

    logger.info("\n📊 Test Results:");
    let failureCount = 0;

    for (const result of results) {
      if (result.success) {
        logger.success(result.message);
        if (result.details) {
          logger.debug("  Input:", result.details.input);
          logger.debug("  Output:", result.details.output);
        }
      } else {
        failureCount++;
        logger.error(result.message);
        if (result.error) {
          logger.error("  Error:", result.error);
        }
      }
    }

    const successCount = results.length - failureCount;
    logger.info(`\n${successCount}/${results.length} tests passed`);

    if (failureCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    logger.error("Test suite failed:", error);
    process.exit(1);
  }
}

void main().catch((error: Error) => {
  const logger = new LoggerService({ debug: true });
  logger.error("Fatal error in test suite:", error);
  process.exit(1);
});
