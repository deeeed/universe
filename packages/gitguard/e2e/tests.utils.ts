import { execSync } from "child_process";
import { mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { analyzeCommit } from "../src/controllers/commit/commit.coordinator.js";
import { LoggerService } from "../src/services/logger.service.js";
import { TestResult, TestScenario } from "./tests.types.js";

async function setupTestRepo(
  scenario: TestScenario,
  logger: LoggerService,
): Promise<string> {
  const testDir = join(tmpdir(), `gitguard-test-${Date.now()}`);

  try {
    // Create test directory
    logger.debug("Creating test directory:", testDir);
    await mkdir(testDir, { recursive: true });

    // Initialize git repository
    logger.debug("Initializing git repository");
    execSync("git init", { cwd: testDir });

    // Configure git for tests
    execSync("git config user.name 'Test User'", { cwd: testDir });
    execSync("git config user.email 'test@example.com'", { cwd: testDir });
    execSync("git config commit.gpgsign false", { cwd: testDir }); // Disable GPG signing for tests

    // Create initial commit to establish HEAD
    execSync("git commit --allow-empty -m 'Initial commit'", { cwd: testDir });

    // Create test files
    logger.debug("Creating test files");
    for (const file of scenario.setup.files) {
      const filePath = join(testDir, file.path);
      const dirPath = dirname(filePath);
      await mkdir(dirPath, { recursive: true });
      await writeFile(filePath, file.content);
      logger.debug(`Created file: ${filePath}`);
    }

    // Stage all files
    logger.debug("Staging files");
    execSync("git add .", { cwd: testDir });

    // Create .gitguard directory and config
    await mkdir(join(testDir, ".gitguard"), { recursive: true });
    await writeFile(
      join(testDir, ".gitguard/config.json"),
      JSON.stringify(
        {
          ...scenario.setup.config,
          git: {
            ...scenario.setup.config?.git,
            cwd: testDir, // Set the correct working directory
          },
        },
        null,
        2,
      ),
    );

    return testDir;
  } catch (error) {
    logger.error("Failed to setup test repo:", error);
    throw error;
  }
}

export async function runScenario(
  scenario: TestScenario,
  logger: LoggerService,
): Promise<TestResult> {
  let testDir: string | undefined;

  try {
    logger.debug(`\nSetting up test directory for: ${scenario.name}`);
    testDir = await setupTestRepo(scenario, logger);
    logger.debug(`Created test directory: ${testDir}`);

    // Create commit message file
    const messageFile = join(testDir, "COMMIT_EDITMSG");
    await writeFile(messageFile, scenario.input.message);
    logger.debug(`Created commit message file: ${messageFile}`);

    // Run analyze commit with the correct working directory and options
    const result = await analyzeCommit({
      options: {
        message: scenario.input.message,
        staged: true,
        unstaged: false,
        debug: false,
        execute: false,
        configPath: join(testDir, ".gitguard/config.json"),
        cwd: testDir,
        ...scenario.input.options, // Merge in the scenario-specific options
      },
    });

    // Validate result
    const success = validateResult(
      {
        message: result.formattedMessage || scenario.input.message,
        warnings: result.warnings.map((w) => w.message),
      },
      scenario.expected,
    );

    return {
      success,
      message: success ? `✅ ${scenario.name}` : `❌ ${scenario.name}`,
      details: {
        input: scenario.input.message,
        output: result.formattedMessage || scenario.input.message,
        warnings: result.warnings.map((w) => w.message),
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
