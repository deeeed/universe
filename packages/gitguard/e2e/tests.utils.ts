import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { execSync } from "child_process";
import { prepareCommit } from "../src/hooks/prepare-commit.js";
import { LoggerService } from "../src/services/logger.service.js";
import { createConfig } from "../src/utils/config.util.js";
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
      JSON.stringify(scenario.setup.config || {}, null, 2),
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

    // Run prepare-commit directly with createConfig
    await prepareCommit({
      messageFile,
      config: createConfig({
        cwd: testDir,
        partial: scenario.setup.config,
      }),
      forceTTY: true,
      isTest: true,
    });

    // Read the updated message
    const updatedMessage = await readFile(messageFile, "utf-8");
    const warnings: string[] = []; // You might need to capture warnings from prepare-commit

    // Validate result
    const success = validateResult(
      { message: updatedMessage.trim(), warnings },
      scenario.expected,
    );

    return {
      success,
      message: success ? `✅ ${scenario.name}` : `❌ ${scenario.name}`,
      details: {
        input: scenario.input.message,
        output: updatedMessage.trim(),
        warnings,
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
