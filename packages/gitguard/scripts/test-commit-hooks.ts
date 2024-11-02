import { join } from "path";
import { mkdir, writeFile, rm, readFile } from "fs/promises";
import { tmpdir } from "os";
import execa from "execa";
import { LoggerService } from "../src/services/logger.service";

interface TestResult {
  success: boolean;
  message: string;
  error?: Error;
}

async function setupTestRepo(): Promise<string> {
  const testDir = join(tmpdir(), `gitguard-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });
  await mkdir(join(testDir, ".gitguard"), { recursive: true });

  // Initialize git repo
  await execa("git", ["init"], { cwd: testDir });
  await execa("git", ["config", "user.name", "GitGuard Test"], {
    cwd: testDir,
  });
  await execa("git", ["config", "user.email", "test@gitguard.dev"], {
    cwd: testDir,
  });

  // Create test files
  await writeFile(join(testDir, "test.txt"), "test content");
  await writeFile(
    join(testDir, ".gitguard/config.json"),
    JSON.stringify({
      git: { baseBranch: "main" },
      analysis: {
        maxCommitSize: 500,
        maxFileSize: 800,
        checkConventionalCommits: true,
      },
      ai: { enabled: false },
    }),
  );

  return testDir;
}

async function runTest(): Promise<TestResult> {
  let testDir: string | undefined;
  const logger = new LoggerService({ debug: true });

  try {
    testDir = await setupTestRepo();
    logger.info("Test directory:", testDir);

    // Stage files
    await execa("git", ["add", "."], { cwd: testDir });

    // Create commit message
    const messageFile = join(testDir, "COMMIT_EDITMSG");
    await writeFile(messageFile, "initial commit");

    // Run commit-hooks
    const { prepareCommit } = await import("../src/cli/commit-hooks.js");
    await prepareCommit({ messageFile, debug: true });

    // Verify the results
    const updatedMessage = await readFile(messageFile, "utf-8");
    logger.info("Updated commit message:", updatedMessage);

    return {
      success: true,
      message: "Test completed successfully!",
    };
  } catch (error) {
    return {
      success: false,
      message: "Test failed",
      error: error instanceof Error ? error : new Error(String(error)),
    };
  } finally {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
    }
  }
}

// Main execution
void (async (): Promise<void> => {
  const result = await runTest();
  const logger = new LoggerService({ debug: true });

  if (result.success) {
    logger.success(result.message);
  } else {
    logger.error(result.message, result.error);
    process.exit(1);
  }
})();
