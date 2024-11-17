import { execSync } from "child_process";
import { existsSync } from "fs";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { main } from "../src/cli/gitguard.js";
import { LoggerService } from "../src/services/logger.service.js";
import { execGit } from "../src/utils/git.util.js";
import {
  BranchInfo,
  ExpectedResult,
  RepoState,
  TestResult,
  TestResultDetails,
  TestScenario,
} from "./tests.types.js";
import chalk from "chalk";

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

interface GetBranchDetailsParams {
  branch: string;
  cwd: string;
}

function getBranchDetails({ branch, cwd }: GetBranchDetailsParams): BranchInfo {
  const commits = execGitCommand(
    `git log ${branch} --pretty=format:"%H|%s|%an|%ad" --date=iso`,
    cwd,
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, message, author, date] = line.split("|");
      return { hash, message, author, date };
    });

  return {
    name: branch,
    commits,
  };
}

async function captureRepoState(testDir: string): Promise<RepoState> {
  const status = execSync("git status --short", { cwd: testDir }).toString();
  const log = execGitCommand("git log --pretty=format:'%s'", testDir);

  // Get branch information
  const currentBranch = execGitCommand(
    "git rev-parse --abbrev-ref HEAD",
    testDir,
  ).trim();
  const allBranches = execGitCommand(
    "git branch --format='%(refname:short)'",
    testDir,
  )
    .split("\n")
    .filter(Boolean);

  // Get detailed information for each branch
  const branchDetails = allBranches.map((branch) =>
    getBranchDetails({ branch, cwd: testDir }),
  );

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
    branches: {
      current: currentBranch,
      all: allBranches,
      details: branchDetails,
    },
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
  const currentState = await captureRepoState(testDir);
  logger.info(formatRepoState({ state: currentState }));

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

    // Handle renamed files if specified in setup
    if (scenario.setup.renamedFiles) {
      for (const rename of scenario.setup.renamedFiles) {
        // Create the original file
        const originalPath = join(testDir, rename.oldPath);
        await mkdir(dirname(originalPath), { recursive: true });
        await writeFile(originalPath, rename.content);
        execGitCommand(`git add "${rename.oldPath}"`, testDir);
        execGitCommand(`git commit -m "Add ${rename.oldPath}"`, testDir);

        // Rename the file
        execGitCommand(
          `git mv "${rename.oldPath}" "${rename.newPath}"`,
          testDir,
        );
        logger.debug(
          `Renamed file from ${rename.oldPath} to ${rename.newPath}`,
        );
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

interface FormatRepoStateParams {
  state: RepoState;
  label?: string;
}

interface RunScenarioParams {
  scenario: TestScenario;
  logger: LoggerService;
}

function formatRepoState({
  state,
  label = "Repository State",
}: FormatRepoStateParams): string {
  return `
${chalk.cyan(`📁 ${label}:`)}
${chalk.yellow("Git Status:")} ${state.status || "(empty)"}

${chalk.yellow("Git History:")}
${state.log
  .split("\n")
  .map((line) => `${chalk.gray("•")} ${line}`)
  .join("\n")}

${chalk.yellow("Branches:")}
${chalk.blue("Current:")} ${chalk.green(state.branches.current)}
${chalk.blue("All Branches:")} ${state.branches.all.map((b) => chalk.green(b)).join(", ")}

${state.branches.details
  .map(
    (branch) => `
${chalk.blue("Branch:")} ${chalk.green(branch.name)}
${chalk.magenta("Commits:")}
${branch.commits
  .map(
    (commit) =>
      `${chalk.gray("•")} ${commit.message} ${chalk.dim(`(${commit.author})`)}`,
  )
  .join("\n")}`,
  )
  .join("\n")}`;
}

interface FormatTestResultParams {
  success: boolean;
  message: string;
  details: TestResultDetails;
}

export function formatTestResult({
  success,
  message,
  details,
}: FormatTestResultParams): string {
  const statusIcon = success ? "✅" : "❌";

  return `
${chalk.cyan(`📊 Test Result: ${statusIcon} ${message}`)}

${chalk.yellow(`📝 Command: ${details.command}`)}

${formatRepoState({ state: details.initialState, label: "Initial Repository State" })}

${formatRepoState({ state: details.finalState, label: "Final Repository State" })}`;
}

export async function runScenario({
  scenario,
  logger,
}: RunScenarioParams): Promise<TestResult> {
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

      // Debug output for development
      logger.debug("\n📁 Repository State Changes:", {
        initialBranches: {
          current: initialState.branches.current,
          all: initialState.branches.all,
          details: initialState.branches.details,
        },
        finalBranches: {
          current: finalState.branches.current,
          all: finalState.branches.all,
          details: finalState.branches.details,
        },
      });

      const result = {
        success: true,
        message: `✅ ${scenario.name}`,
        details: {
          input: scenario.input.message,
          command: args.join(" "),
          initialState,
          finalState,
        },
      };

      return result;
    } finally {
      process.argv = originalArgv;
      process.chdir(originalCwd);
    }
  } catch (error) {
    logger.error(`Scenario failed: ${enhancedScenario.name}`, error);

    // Create empty repo state for error cases
    const emptyRepoState: RepoState = {
      status: "",
      log: "",
      files: [],
      branches: {
        current: "",
        all: [],
        details: [],
      },
    };

    return {
      success: false,
      message: `❌ ${enhancedScenario.name}`,
      error: error instanceof Error ? error : new Error(String(error)),
      details: {
        input: enhancedScenario.input.message,
        command: enhancedScenario.input.command
          ? `${enhancedScenario.input.command.name} ${enhancedScenario.input.command.subcommand ?? ""} ${enhancedScenario.input.command.args?.join(" ") ?? ""}`
          : "No command specified",
        initialState: emptyRepoState,
        finalState: emptyRepoState,
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
