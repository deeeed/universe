import execa from "execa";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

async function setupTestRepo(): Promise<string> {
  const testDir = join(tmpdir(), `gitguard-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });

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

async function runTest() {
  let testDir: string | undefined;

  try {
    testDir = await setupTestRepo();
    console.log("Test directory:", testDir);

    // Stage files
    await execa("git", ["add", "."], { cwd: testDir });

    // Create commit message
    const messageFile = join(testDir, "COMMIT_EDITMSG");
    await writeFile(messageFile, "initial commit");

    // Run commit-hooks
    const { prepareCommit } = await import("../cli/commit-hooks");
    await prepareCommit({ messageFile });

    // Verify the results
    const updatedMessage = await readFile(messageFile, "utf-8");
    console.log("Updated commit message:", updatedMessage);

    console.log("✅ Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true });
    }
  }
}

runTest();
