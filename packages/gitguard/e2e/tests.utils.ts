import { execSync } from "child_process";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { main } from "../src/cli/gitguard.js";
import { LoggerService } from "../src/services/logger.service.js";
import { execGit } from "../src/utils/git.util.js";
import {
  ExpectedResult,
  RepoState,
  TestResult,
  TestScenario,
} from "./tests.types.js";
import { existsSync } from "fs";

function execGitCommand(command: string, cwd: string): string {
  return execSync(command, {
    cwd,
    encoding: "utf-8",
  }).toString();
}

async function createTempDir(): Promise<string> {
  const tempPath = join(tmpdir(), `gitguard-test-${Date.now()}`);
  await mkdir(tempPath, { recursive: true });
  return tempPath;
}

function buildCommandArgs(
  scenario: TestScenario,
  logger: LoggerService,
): string[] {
  const baseArgs = ["node", "gitguard"];
  logger.debug("Building command args for scenario:", scenario);

  if (!scenario.input.command) {
    return baseArgs;
  }

  const commandArgs = [
    ...baseArgs,
    scenario.input.command.name,
    ...(scenario.input.command.subcommand
      ? [scenario.input.command.subcommand]
      : []),
    ...(scenario.input.command.args ?? []),
  ];

  // Add boolean flags correctly
  if (scenario.input.options) {
    Object.entries(scenario.input.options).forEach(([key, value]) => {
      logger.debug(`Processing option ${key}:`, value);
      if (value === true) {
        commandArgs.push(`--${key}`);
      }
    });
  }

  logger.debug("Final command args:", commandArgs);
  return commandArgs;
}

async function captureRepoState(testDir: string): Promise<RepoState> {
  const status = execSync("git status --short", { cwd: testDir }).toString();
  const log = execGitCommand("git log --pretty=format:'%s'", testDir);

  const files = execSync("git ls-files", { cwd: testDir })
    .toString()
    .split("\n")
    .filter(Boolean)
    .map(async (path) => ({
      path,
      content: await readFile(join(testDir, path), "utf-8"),
    }));

  let config: Record<string, unknown> | undefined;
  try {
    const configPath = join(testDir, ".gitguard/config.json");
    config = JSON.parse(await readFile(configPath, "utf-8")) as Record<
      string,
      unknown
    >;
  } catch {
    // Config might not exist
  }

  return {
    status,
    log,
    files: await Promise.all(files),
    config,
  };
}

interface GitStatus {
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

// Update getGitStatus with proper typing
async function getGitStatus(dir: string): Promise<GitStatus> {
  const output = await execGit({
    command: "status",
    args: ["--porcelain"],
    cwd: dir,
  });

  const lines = output.split("\n").filter((line: string) => line.length > 0);

  return {
    staged: lines
      .filter((line: string) => line.startsWith("M ") || line.startsWith("A "))
      .map((line: string) => line.slice(3)),
    unstaged: lines
      .filter((line: string) => line.startsWith(" M") || line.startsWith(" D"))
      .map((line: string) => line.slice(3)),
    untracked: lines
      .filter((line: string) => line.startsWith("??"))
      .map((line: string) => line.slice(3)),
  };
}

/**
 * Verifies that the test directory matches the expected result
 */
export async function verifyExpectedResult({
  testDir,
  expected,
  logger,
}: {
  testDir: string;
  expected: ExpectedResult;
  logger: LoggerService;
}): Promise<void> {
  await verifyFiles(testDir, expected.files, logger);
  await verifyGitState(testDir, expected.git, logger);
}

/**
 * Verifies that files match the expected state
 */
async function verifyFiles(
  testDir: string,
  expectedFiles: ExpectedResult["files"],
  logger: LoggerService,
): Promise<void> {
  if (!expectedFiles) {
    return;
  }

  for (const file of expectedFiles) {
    const fullPath = join(testDir, file.path);
    const exists = existsSync(fullPath);
    logger.debug(`Checking file ${file.path}, exists: ${exists}`);

    if (file.exists && !exists) {
      throw new Error(`Expected file ${file.path} to exist`);
    }

    if (!file.exists && exists) {
      throw new Error(`Expected file ${file.path} to not exist`);
    }

    if (exists && file.content) {
      const content = await readFile(fullPath, "utf-8");
      verifyFileContent(file.path, content, file.content);
    }
  }
}

/**
 * Verifies file content matches expected content
 */
function verifyFileContent(
  filepath: string,
  actual: string,
  expected: string | RegExp,
): void {
  if (expected instanceof RegExp) {
    if (!expected.test(actual)) {
      throw new Error(
        `File ${filepath} content does not match expected pattern`,
      );
    }
  } else if (actual !== expected) {
    throw new Error(`File ${filepath} content does not match expected content`);
  }
}

/**
 * Verifies git files match expected state
 */
function verifyGitFiles(
  type: string,
  actual: string[],
  expected?: string[],
): void {
  if (!expected) {
    return;
  }

  const missing = expected.filter((f) => !actual.includes(f));
  if (missing.length > 0) {
    throw new Error(`Missing ${type} files: ${missing.join(", ")}`);
  }
}

/**
 * Verifies git state matches expected state
 */
async function verifyGitState(
  testDir: string,
  expectedGit: ExpectedResult["git"],
  logger: LoggerService,
): Promise<void> {
  if (!expectedGit?.status) {
    return;
  }

  const status = await getGitStatus(testDir);
  logger.debug("Current git status:", status);

  verifyGitFiles("staged", status.staged, expectedGit.status.staged);
  verifyGitFiles("unstaged", status.unstaged, expectedGit.status.unstaged);
  verifyGitFiles("untracked", status.untracked, expectedGit.status.untracked);
}

async function setupTestRepo(
  scenario: TestScenario,
  logger: LoggerService,
): Promise<string> {
  try {
    const testDir = await createTempDir();
    logger.debug(`Creating test directory: ${testDir}`);

    // Initialize git repo
    logger.debug("Initializing git repository");
    execGitCommand("git init", testDir);
    execGitCommand("git config user.name 'Test User'", testDir);
    execGitCommand("git config user.email 'test@example.com'", testDir);
    execGitCommand("git config commit.gpgsign false", testDir);

    // Create initial commit on main branch
    execGitCommand("git checkout -b main", testDir);
    execGitCommand("git commit --allow-empty -m 'Initial commit'", testDir);

    // Switch to feature branch if specified
    if (scenario.setup.branch) {
      logger.debug(
        `Creating and switching to branch: ${scenario.setup.branch}`,
      );
      execGitCommand(`git checkout -b ${scenario.setup.branch}`, testDir);
    }

    // Create files and commit them on the feature branch
    if (scenario.setup.files) {
      for (const file of scenario.setup.files) {
        const filePath = join(testDir, file.path);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, file.content);
        logger.debug(`Created file: ${filePath}`);
        execGitCommand(`git add "${file.path}"`, testDir);
      }

      // Commit files if commit message is provided
      if (scenario.setup.commit) {
        execGitCommand(`git commit -m "${scenario.setup.commit}"`, testDir);
        logger.debug(`Created commit: ${scenario.setup.commit}`);
      }
    }

    // Apply additional changes if specified
    if (scenario.setup.changes) {
      for (const change of scenario.setup.changes) {
        const filePath = join(testDir, change.path);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, change.content);
        logger.debug(`Applied change to: ${filePath}`);

        if (!scenario.setup.stageOnly) {
          execGitCommand(`git add "${change.path}"`, testDir);
          if (scenario.setup.commit) {
            execGitCommand(`git commit -m "Update ${change.path}"`, testDir);
          }
        } else {
          execGitCommand(`git add "${change.path}"`, testDir);
        }
      }
    }

    // Create .gitguard directory and config
    if (scenario.setup.config) {
      const configDir = join(testDir, ".gitguard");
      await mkdir(configDir, { recursive: true });
      await writeFile(
        join(configDir, "config.json"),
        JSON.stringify(
          {
            ...scenario.setup.config,
            git: {
              ...scenario.setup.config?.git,
              cwd: testDir,
            },
          },
          null,
          2,
        ),
      );
    }

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
  const isDebug = process.argv.includes("--debug");

  const enhancedScenario = isDebug
    ? {
        ...scenario,
        setup: {
          ...scenario.setup,
          config: {
            ...scenario.setup.config,
            debug: scenario.setup.config?.debug ?? true,
          },
        },
      }
    : scenario;

  let testDir: string | undefined;

  try {
    logger.debug(`\nSetting up test directory for: ${enhancedScenario.name}`);
    testDir = await setupTestRepo(enhancedScenario, logger);

    const originalArgv = process.argv;
    const originalCwd = process.cwd();

    try {
      if (!enhancedScenario.input.command) {
        throw new Error(
          `No command specified for scenario: ${enhancedScenario.name}`,
        );
      }

      const args = buildCommandArgs(enhancedScenario, logger);
      // Filter out test runner specific args while keeping gitguard args
      process.argv = [...args, ...(isDebug ? ["--debug"] : [])];
      process.chdir(testDir);

      logger.debug("Running command:", process.argv.join(" "));

      const initialState = await captureRepoState(testDir);
      await main();
      const finalState = await captureRepoState(testDir);

      return {
        success: true,
        message: `✅ ${enhancedScenario.name}`,
        details: {
          input: enhancedScenario.input.message,
          command: args.join(" "),
          initialState,
          finalState,
        },
      };
    } finally {
      process.argv = originalArgv;
      process.chdir(originalCwd);
    }
  } catch (error) {
    logger.error(`Scenario failed: ${enhancedScenario.name}`, error);
    return {
      success: false,
      message: `❌ ${enhancedScenario.name}`,
      error: error instanceof Error ? error : new Error(String(error)),
      details: {
        input: enhancedScenario.input.message,
        command: enhancedScenario.input.command
          ? `${enhancedScenario.input.command.name} ${enhancedScenario.input.command.subcommand ?? ""} ${enhancedScenario.input.command.args?.join(" ") ?? ""}`
          : "No command specified",
      },
    };
  } finally {
    if (testDir) {
      await rm(testDir, { recursive: true, force: true }).catch((error) =>
        logger.error("Failed to cleanup:", error),
      );
    }
  }
}
