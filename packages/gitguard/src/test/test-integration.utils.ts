import { exec } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { Config } from "../types/config.types.js";
import { Logger } from "../types/logger.types.js";
import { GitService } from "../services/git.service.js";
import { SecurityService } from "../services/security.service.js";
import { CommitService } from "../services/commit.service.js";
import { LoggerService } from "../services/logger.service.js";

const execPromise = promisify(exec);

export interface TestFile {
  path: string;
  content: string;
}

export interface BaseTestEnvironment {
  tempDir: string;
  logger: Logger;
  config: Config;
  createFiles: (files: TestFile[]) => Promise<void>;
  stageFiles: () => Promise<string>;
  cleanup: () => Promise<void>;
}

export interface GitTestEnvironment extends BaseTestEnvironment {
  gitService: GitService;
}

export interface SecurityTestEnvironment extends BaseTestEnvironment {
  securityService: SecurityService;
}

export interface CommitTestEnvironment extends BaseTestEnvironment {
  commitService: CommitService;
  gitService: GitService;
  securityService: SecurityService;
}

export const defaultConfig: Config = {
  git: {
    baseBranch: "main",
    monorepoPatterns: [],
    ignorePatterns: [],
  },
  security: {
    enabled: true,
    rules: {
      secrets: {
        enabled: true,
        severity: "high",
      },
      files: {
        enabled: true,
        severity: "high",
      },
    },
  },
  analysis: {
    maxCommitSize: 100,
    maxFileSize: 1000,
    checkConventionalCommits: true,
  },
  debug: true,
  colors: true,
  ai: { enabled: false, provider: null },
  pr: {
    template: {
      path: "",
      required: false,
      sections: {
        description: false,
        breaking: false,
        testing: false,
        checklist: false,
      },
    },
    maxSize: 100,
    requireApprovals: 1,
  },
};

async function setupGitRepo(tempDir: string): Promise<void> {
  await execPromise("git init", { cwd: tempDir });
  await execPromise("git config user.email 'test@example.com'", {
    cwd: tempDir,
  });
  await execPromise("git config user.name 'Test User'", { cwd: tempDir });
  await execPromise("git config core.autocrlf false", { cwd: tempDir });

  // Create initial commit
  await writeFile(join(tempDir, "README.md"), "# Test Repository");
  await execPromise("git add README.md", { cwd: tempDir });
  await execPromise('git commit -m "Initial commit"', { cwd: tempDir });
}

export async function setupBaseTestEnvironment(
  customConfig?: Partial<Config>,
): Promise<BaseTestEnvironment> {
  const tempDir = await mkdtemp(join(tmpdir(), "gitguard-test-"));
  await setupGitRepo(tempDir);

  const config = { ...defaultConfig, ...customConfig };
  const logger = new LoggerService({ debug: true });

  const createFiles = async (files: TestFile[]): Promise<void> => {
    for (const file of files) {
      const fullPath = join(tempDir, file.path);
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      if (dir !== tempDir) {
        await execPromise(`mkdir -p "${dir}"`);
      }
      await writeFile(fullPath, file.content);
    }
  };

  const stageFiles = async (): Promise<string> => {
    await execPromise("git add .", { cwd: tempDir });
    const { stdout } = await execPromise("git diff --cached", { cwd: tempDir });
    return stdout;
  };

  const cleanup = async (): Promise<void> => {
    await rm(tempDir, { recursive: true, force: true });
  };

  return { tempDir, logger, config, createFiles, stageFiles, cleanup };
}

export async function setupGitTestEnvironment(
  customConfig?: Partial<Config>,
): Promise<GitTestEnvironment> {
  const baseEnv = await setupBaseTestEnvironment(customConfig);

  const gitService = new GitService({
    gitConfig: { ...baseEnv.config.git, cwd: baseEnv.tempDir },
    logger: baseEnv.logger,
  });

  return { ...baseEnv, gitService };
}

export async function setupSecurityTestEnvironment(
  customConfig?: Partial<Config>,
): Promise<SecurityTestEnvironment> {
  const baseEnv = await setupBaseTestEnvironment(customConfig);

  const securityService = new SecurityService({
    config: baseEnv.config,
    logger: baseEnv.logger,
  });

  return { ...baseEnv, securityService };
}

export async function setupCommitTestEnvironment(
  customConfig?: Partial<Config>,
): Promise<CommitTestEnvironment> {
  const baseEnv = await setupBaseTestEnvironment(customConfig);

  const gitService = new GitService({
    gitConfig: { ...baseEnv.config.git, cwd: baseEnv.tempDir },
    logger: baseEnv.logger,
  });

  const securityService = new SecurityService({
    config: baseEnv.config,
    logger: baseEnv.logger,
  });

  const commitService = new CommitService({
    config: baseEnv.config,
    git: gitService,
    logger: baseEnv.logger,
    security: securityService,
  });

  return { ...baseEnv, gitService, securityService, commitService };
}
