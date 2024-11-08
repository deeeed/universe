import { execSync } from "child_process";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { main } from "../src/cli/gitguard.js";
import { LoggerService } from "../src/services/logger.service.js";
import { RepoState, TestResult, TestScenario } from "./tests.types.js";

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
