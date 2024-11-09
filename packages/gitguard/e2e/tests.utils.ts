import { execSync } from "child_process";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { main } from "../src/cli/gitguard.js";
import { LoggerService } from "../src/services/logger.service.js";
import { RepoState, TestResult, TestScenario } from "./tests.types.js";

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

function buildCommandArgs(scenario: TestScenario): string[] {
  const baseArgs = ["node", "gitguard"];

  if (!scenario.input.command) {
    return baseArgs;
  }

  return [
    ...baseArgs,
    scenario.input.command.name,
    ...(scenario.input.command.subcommand
      ? [scenario.input.command.subcommand]
      : []),
    ...(scenario.input.command.args || []),
  ];
}

async function captureRepoState(testDir: string): Promise<RepoState> {
  const status = execSync("git status --short", { cwd: testDir }).toString();
  const log = execSync("git log --oneline", { cwd: testDir }).toString();

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

    // Create initial files and commit them to main
    if (scenario.setup.files) {
      for (const file of scenario.setup.files) {
        const filePath = join(testDir, file.path);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, file.content);
        logger.debug(`Created file: ${filePath}`);
        execGitCommand(`git add "${file.path}"`, testDir);
      }

      // Commit files on main if no specific branch is specified
      if (!scenario.setup.branch && scenario.setup.commit) {
        execGitCommand(`git commit -m "${scenario.setup.commit}"`, testDir);
        logger.debug(`Created initial commit: ${scenario.setup.commit}`);
      }
    }

    // Switch to feature branch if specified (for branch-related scenarios)
    if (scenario.setup.branch) {
      logger.debug(
        `Creating and switching to branch: ${scenario.setup.branch}`,
      );
      execGitCommand(`git checkout -b ${scenario.setup.branch}`, testDir);

      // If there's an initial commit message, commit the files on the feature branch
      if (scenario.setup.commit) {
        execGitCommand(`git add .`, testDir);
        execGitCommand(`git commit -m "${scenario.setup.commit}"`, testDir);
        logger.debug(
          `Created initial commit on branch: ${scenario.setup.commit}`,
        );
      }
    }

    // Handle changes based on scenario type
    if (scenario.setup.changes) {
      // Apply changes
      logger.debug("Applying changes to test files");
      for (const change of scenario.setup.changes) {
        const filePath = join(testDir, change.path);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, change.content);
        logger.debug(`Modified file: ${filePath}`);
        execGitCommand(`git add "${change.path}"`, testDir);
      }

      // Handle commit based on scenario type
      const isCommitScenario = scenario.input.command?.name === "commit";
      const isUnstagedTest =
        scenario.input.command?.args?.includes("--unstaged");

      if (!isCommitScenario && !isUnstagedTest) {
        // For branch scenarios or when not testing unstaged changes, create a commit
        execGitCommand(
          `git commit -m "feat: update ${scenario.setup.branch ?? "files"} with changes"`,
          testDir,
        );
        logger.debug("Created commit for changes");
      } else {
        logger.debug("Keeping changes staged for commit scenario");
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
  let testDir: string | undefined;

  try {
    logger.debug(`\nSetting up test directory for: ${scenario.name}`);
    testDir = await setupTestRepo(scenario, logger);

    const originalArgv = process.argv;
    const originalCwd = process.cwd();

    try {
      if (!scenario.input.command) {
        throw new Error(`No command specified for scenario: ${scenario.name}`);
      }

      const args = buildCommandArgs(scenario);
      process.argv = args;
      process.chdir(testDir);

      logger.debug("Running command:", args.join(" "));

      const initialState = await captureRepoState(testDir);
      await main();
      const finalState = await captureRepoState(testDir);

      return {
        success: true,
        message: `✅ ${scenario.name}`,
        details: {
          input: scenario.input.message,
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
    logger.error(`Scenario failed: ${scenario.name}`, error);
    return {
      success: false,
      message: `❌ ${scenario.name}`,
      error: error instanceof Error ? error : new Error(String(error)),
      details: {
        input: scenario.input.message,
        command: scenario.input.command
          ? `${scenario.input.command.name} ${scenario.input.command.subcommand || ""} ${scenario.input.command.args?.join(" ") || ""}`
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
