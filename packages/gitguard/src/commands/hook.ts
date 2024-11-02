import { promises as fs } from "fs";
import { join } from "path";
import { loadConfig } from "../config.js";
import { GitService } from "../services/git.service.js";
import { LoggerService } from "../services/logger.service.js";

interface HookCommandOptions {
  action: "install" | "uninstall";
  global?: boolean;
  debug?: boolean;
}

const HOOK_SCRIPT = `#!/usr/bin/env node
const { prepareCommit } = require('gitguard/hooks');

// Get the commit message file from git
const messageFile = process.argv[2];
if (!messageFile) {
  console.error('No commit message file provided');
  process.exit(1);
}

// Run the hook
prepareCommit({ messageFile })
  .catch((error) => {
    console.error('Hook failed:', error);
    process.exit(1);
  });
`;

export async function hook(options: HookCommandOptions): Promise<void> {
  const logger = new LoggerService({ debug: options.debug });

  try {
    const config = await loadConfig();
    const git = new GitService({ config: config.git, logger });

    if (options.action === "install") {
      const hooksPath = await git.getHooksPath();
      const hookPath = join(hooksPath, "prepare-commit-msg");
      await fs.writeFile(hookPath, HOOK_SCRIPT, { mode: 0o755 });
      logger.success(`✅ Git hook installed at ${hookPath}`);
    } else {
      // Handle uninstall
      const hooksPath = await git.getHooksPath();
      const hookPath = join(hooksPath, "prepare-commit-msg");
      await fs.unlink(hookPath).catch(() => {});
      logger.success("✅ Git hook uninstalled");
    }
  } catch (error) {
    logger.error("Hook command failed:", error);
    throw error;
  }
}
