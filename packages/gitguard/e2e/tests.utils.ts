import execa, { Options } from "execa";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { defaultConfig } from "../src/config.js";
import { prepareCommit } from "../src/hooks/prepare-commit.js";
import { LoggerService } from "../src/services/logger.service.js";
import { Config } from "../src/types/config.types.js";
import { TestResult, TestScenario } from "./tests.types.js";

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

async function setupTestRepo(
  scenario: TestScenario,
  logger: LoggerService,
): Promise<string> {
  const testDir = join(tmpdir(), `gitguard-test-${Date.now()}`);
  const tempHooksDir = join(testDir, ".git-temp-hooks");

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

  const execOptions: Options = {
    cwd: testDir,
    env: gitEnv,
  };

  try {
    logger.debug("Creating test directory:", testDir);
    await mkdir(testDir, { recursive: true });
    await mkdir(tempHooksDir, { recursive: true });

    // Create .gitguard directory and config first
    logger.debug("Creating .gitguard directory");
    await mkdir(join(testDir, ".gitguard"), { recursive: true });

    // Create config by merging default with scenario config
    const config: Config = {
      ...defaultConfig,
      git: {
        baseBranch:
          scenario.setup.config?.git?.baseBranch ??
          defaultConfig.git.baseBranch,
        ignorePatterns: (
          scenario.setup.config?.git?.ignorePatterns ??
          defaultConfig.git.ignorePatterns
        ).filter((pattern): pattern is string => pattern !== undefined),
        cwd: testDir,
      },
      analysis: {
        maxCommitSize:
          scenario.setup.config?.analysis?.maxCommitSize ??
          defaultConfig.analysis.maxCommitSize,
        maxFileSize:
          scenario.setup.config?.analysis?.maxFileSize ??
          defaultConfig.analysis.maxFileSize,
        checkConventionalCommits: true,
      },
      security: {
        enabled:
          scenario.setup.config?.security?.enabled ??
          defaultConfig.security.enabled,
        checkSecrets: true,
        checkFiles: true,
      },
      ai: {
        enabled: scenario.setup.config?.ai?.enabled ?? defaultConfig.ai.enabled,
        provider: null,
      },
      debug: scenario.setup.config?.debug ?? defaultConfig.debug,
      pr: defaultConfig.pr,
    };

    await writeFile(
      join(testDir, ".gitguard/config.json"),
      JSON.stringify(config, null, 2),
    );

    logger.debug("Initializing git repository");
    await execa("git", ["init"], execOptions);

    logger.debug("Configuring git");
    await execa("git", ["config", "core.autocrlf", "false"], execOptions);
    await execa("git", ["config", "core.safecrlf", "false"], execOptions);
    await execa("git", ["config", "commit.gpgsign", "false"], execOptions);
    // Set hooks path to our temporary directory
    await execa("git", ["config", "core.hooksPath", tempHooksDir], execOptions);

    // Create test files
    logger.debug("Creating test files");
    for (const file of scenario.setup.files) {
      const filePath = join(testDir, file.path);
      const dirPath = dirname(filePath);
      await mkdir(dirPath, { recursive: true });
      await writeFile(filePath, file.content);
      logger.debug(`Created file: ${filePath}`);
    }

    // Create initial commit to establish HEAD
    logger.debug("Creating initial commit");
    await execa("git", ["add", "."], execOptions);
    await execa(
      "git",
      ["commit", "--allow-empty", "-m", "Initial commit"],
      execOptions,
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

function validateResult(
  result: { message: string; warnings: string[] },
  expected: TestScenario["expected"],
): boolean {
  if (result.message !== expected.message) {
    return false;
  }

  if (
    expected.securityIssues &&
    !result.warnings.some((w) => w.includes("security"))
  ) {
    return false;
  }

  if (
    expected.splitSuggestion &&
    !result.warnings.some((w) => w.includes("split"))
  ) {
    return false;
  }

  if (
    expected.aiSuggestions &&
    !result.warnings.some((w) => w.includes("AI"))
  ) {
    return false;
  }

  return true;
}

export async function runScenario(
  scenario: TestScenario,
  logger: LoggerService,
): Promise<TestResult> {
  let testDir: string | undefined;

  try {
    logger.debug(`\n Setting up test directory for: ${scenario.name}`);
    testDir = await setupTestRepo(scenario, logger);
    logger.debug(`Created test directory: ${testDir}`);

    // Stage files
    logger.debug("Staging test files...");
    await execa("git", ["add", "."], { cwd: testDir });
    logger.debug("Files staged successfully");

    // Create commit message
    const messageFile = join(testDir, "COMMIT_EDITMSG");
    await writeFile(messageFile, scenario.input.message);
    logger.debug(`Created commit message file: ${messageFile}`);

    // Read the config that was already set up
    const config = JSON.parse(
      await readFile(join(testDir, ".gitguard/config.json"), "utf-8"),
    ) as Config;

    await prepareCommit({
      messageFile,
      config,
    });

    // Read results
    const result = {
      message: await readFile(messageFile, "utf-8"),
      warnings: [] as string[],
    };

    // Validate result against expected outcome
    const success = validateResult(result, scenario.expected);

    return {
      success,
      message: success ? `✅ ${scenario.name}` : `❌ ${scenario.name}`,
      details: {
        input: scenario.input.message,
        output: result.message,
        warnings: result.warnings,
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
