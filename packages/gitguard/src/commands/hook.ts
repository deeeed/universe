/* eslint-disable no-console */
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
const { prepareCommit } = require('@siteed/gitguard/hooks');

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
  console.log("Hook function called with options:", options);
  const logger = new LoggerService({ debug: true });

  try {
    console.log("Loading config...");
    const config = await loadConfig();
    console.log("Config loaded:", config);

    console.log("Initializing GitService...");
    const git = new GitService({ config: config.git, logger });

    if (options.action === "install") {
      console.log("Installing hook...");
      const hooksPath = await git.getHooksPath();
      console.log(`Hooks path: ${hooksPath}`);

      const hookPath = join(hooksPath, "prepare-commit-msg");
      console.log(`Hook path: ${hookPath}`);

      // Check if hooks directory exists
      const hooksExists = await fs
        .access(hooksPath)
        .then(() => true)
        .catch(() => false);
      console.log(`Hooks directory exists: ${hooksExists}`);

      if (!hooksExists) {
        console.log(`Creating hooks directory: ${hooksPath}`);
        await fs.mkdir(hooksPath, { recursive: true });
      }

      // Write the hook file
      console.log("Writing hook file...");
      await fs.writeFile(hookPath, HOOK_SCRIPT, { mode: 0o755 });

      // Verify the file was created
      const exists = await fs
        .access(hookPath)
        .then(() => true)
        .catch(() => false);
      console.log(`Hook file exists: ${exists}`);

      if (exists) {
        logger.success(`✅ Git hook installed at ${hookPath}`);
      } else {
        throw new Error("Hook file was not created successfully");
      }
    } else {
      console.log("Uninstalling hook...");
      const hooksPath = await git.getHooksPath();
      const hookPath = join(hooksPath, "prepare-commit-msg");
      await fs.unlink(hookPath).catch((err) => {
        console.log(`Error removing hook:`, err);
      });
      logger.success("✅ Git hook uninstalled");
    }
  } catch (error) {
    console.error("Hook command failed with error:", error);
    throw error;
  }
}
