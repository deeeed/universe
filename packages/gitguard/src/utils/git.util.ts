import { exec, execSync, spawn } from "child_process";
import { promisify } from "util";
import { Logger } from "../types/logger.types.js";

const execPromise = promisify(exec);

interface GitExecBaseOptions {
  cwd?: string;
  logger?: Logger;
}

interface GitExecOptions extends GitExecBaseOptions {
  command: string;
  args: string[];
  maxBuffer?: number;
}

interface GitExecResult {
  stdout: string;
  stderr: string;
}

/**
 * Git-specific utility functions for repository operations
 */
export async function isGitRepository(
  options?: GitExecBaseOptions,
): Promise<boolean> {
  try {
    await execGit({
      command: "rev-parse",
      args: ["--git-dir"],
      cwd: options?.cwd,
      logger: options?.logger,
    });
    return true;
  } catch {
    return false;
  }
}

export async function getGitRoot(options?: GitExecOptions): Promise<string> {
  try {
    const output = await execGit({
      command: "rev-parse",
      args: ["--show-toplevel"],
      cwd: options?.cwd,
      logger: options?.logger,
    });
    return output.trim();
  } catch {
    throw new Error("Not a git repository");
  }
}

export async function getGitDir(options?: GitExecOptions): Promise<string> {
  try {
    const output = await execGit({
      command: "rev-parse",
      args: ["--git-dir"],
      cwd: options?.cwd,
      logger: options?.logger,
    });
    return output.trim();
  } catch {
    throw new Error("Not a git repository");
  }
}

/**
 * Determines the default branch for a repository
 * Checks in order: current branch if main/master, existing main/master branch, falls back to 'main'
 */
export async function determineDefaultBranch(
  options?: GitExecOptions,
): Promise<string> {
  try {
    // Check if we're in a git repo first
    const isRepo = await isGitRepository({
      cwd: options?.cwd,
      logger: options?.logger,
    });
    if (!isRepo) {
      return "main";
    }

    // Try to get current branch
    const currentBranch = await execGit({
      command: "rev-parse",
      args: ["--abbrev-ref", "HEAD"],
      cwd: options?.cwd,
      logger: options?.logger,
    });

    const trimmedBranch = currentBranch.trim();
    if (["main", "master"].includes(trimmedBranch)) {
      return trimmedBranch;
    }

    // List all branches
    const branchOutput = await execGit({
      command: "branch",
      args: ["--list"],
      cwd: options?.cwd,
      logger: options?.logger,
    });

    const branches = branchOutput
      .split("\n")
      .map((b: string) =>
        b
          .trim()
          .replace(/^\*\s*/, "")
          .trim(),
      )
      .filter(Boolean);

    // Check for main or master
    if (branches.includes("main")) return "main";
    if (branches.includes("master")) return "master";

    return "main";
  } catch {
    return "main";
  }
}

async function execGitWithBuffer({
  command,
  args,
  cwd,
  maxBuffer = 100 * 1024 * 1024,
  logger,
}: GitExecOptions): Promise<GitExecResult> {
  try {
    const { stdout, stderr } = await execPromise(
      `git ${command} ${args.join(" ")}`,
      { cwd, maxBuffer },
    );
    return { stdout, stderr };
  } catch (error) {
    logger?.debug("Buffer execution failed:", error);
    throw error;
  }
}

async function execGitWithStream({
  command,
  args,
  cwd,
  logger,
}: GitExecOptions): Promise<GitExecResult> {
  return new Promise((resolve, reject) => {
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const git = spawn("git", [command, ...args], { cwd });

    git.stdout?.on("data", (chunk: Buffer) =>
      stdoutChunks.push(Buffer.from(chunk)),
    );
    git.stderr?.on("data", (chunk: Buffer) =>
      stderrChunks.push(Buffer.from(chunk)),
    );

    git.on("error", (error: Error) => {
      logger?.error("Git stream error:", error);
      reject(error);
    });

    git.on("close", (code: number) => {
      if (code === 0) {
        resolve({
          stdout: Buffer.concat(stdoutChunks).toString("utf8"),
          stderr: Buffer.concat(stderrChunks).toString("utf8"),
        });
      } else {
        reject(new Error(`Git process exited with code ${code}`));
      }
    });
  });
}

export async function execGit(options: GitExecOptions): Promise<string> {
  try {
    const bufferResult = await execGitWithBuffer(options);
    return bufferResult.stdout;
  } catch (error) {
    if (error instanceof Error && error.message.includes("maxBuffer")) {
      options.logger?.debug(
        "Falling back to stream execution due to buffer size",
      );
      const streamResult = await execGitWithStream(options);
      return streamResult.stdout;
    }
    throw error;
  }
}

/**
 * Synchronously checks if the current directory is a git repository
 */
export function isGitRepositorySync(params?: { cwd?: string }): boolean {
  try {
    const result = execSync("git rev-parse --is-inside-work-tree", {
      cwd: params?.cwd,
      stdio: "pipe",
    });
    return result.toString().trim() === "true";
  } catch {
    return false;
  }
}

/**
 * Synchronously gets the git root directory
 */
export function getGitRootSync(params?: { cwd?: string }): string {
  try {
    const result = execSync("git rev-parse --show-toplevel", {
      cwd: params?.cwd,
      stdio: "pipe",
    });
    return result.toString().trim();
  } catch {
    throw new Error("Not a git repository");
  }
}
