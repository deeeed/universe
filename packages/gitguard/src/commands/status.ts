import chalk from "chalk";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { loadConfig } from "../utils/config.util.js";
import { LoggerService } from "../services/logger.service.js";
import { Config } from "../types/config.types.js";
import { getGitRoot } from "../utils/git.util.js";
import { getHookStatus } from "../utils/hook.util.js";

interface StatusOptions {
  debug?: boolean;
  configPath?: string;
}

function formatConfigPath(path: string, exists: boolean): string {
  return exists ? chalk.green(path) : chalk.gray(`${path} (not found)`);
}

function formatEnabled(enabled: boolean): string {
  return enabled ? chalk.green("✓ Enabled") : chalk.gray("✗ Disabled");
}

function formatConfigValue(value: unknown): string {
  if (value === undefined || value === null) {
    return chalk.gray("Not configured");
  }
  if (typeof value === "boolean") {
    return value ? chalk.green("Yes") : chalk.gray("No");
  }
  return chalk.white(String(value));
}

function displayAIConfig(ai: Config["ai"]): string[] {
  const output: string[] = [];
  output.push(`    Status: ${formatEnabled(ai.enabled)}`);

  if (ai.enabled) {
    output.push(`    Provider: ${formatConfigValue(ai.provider)}`);

    if (ai.provider === "azure" && ai.azure) {
      output.push("    Azure OpenAI:");
      output.push(`      Endpoint: ${formatConfigValue(ai.azure.endpoint)}`);
      output.push(
        `      Deployment: ${formatConfigValue(ai.azure.deployment)}`,
      );
      output.push(
        `      API Version: ${formatConfigValue(ai.azure.apiVersion)}`,
      );
    } else if (ai.provider === "openai" && ai.openai) {
      output.push("    OpenAI:");
      output.push(`      Model: ${formatConfigValue(ai.openai.model)}`);
      output.push(
        `      Organization: ${formatConfigValue(ai.openai.organization)}`,
      );
    } else if (ai.provider === "ollama" && ai.ollama) {
      output.push("    Ollama:");
      output.push(`      Host: ${formatConfigValue(ai.ollama.host)}`);
      output.push(`      Model: ${formatConfigValue(ai.ollama.model)}`);
    }
  }

  return output;
}

export async function status(options: StatusOptions): Promise<void> {
  const logger = new LoggerService({ debug: options.debug });

  try {
    const config = await loadConfig({ configPath: options.configPath });
    const gitRoot = getGitRoot();
    const hookStatus = await getHookStatus();

    // Header
    logger.info(chalk.bold("\n📊 GitGuard Status Report"));
    logger.info("=======================");

    // Hook Status
    logger.info(chalk.blue("\n🔗 Git Hooks"));
    logger.info("-------------");

    if (hookStatus.isRepo) {
      logger.info(`Repository: ${chalk.green("✓")} Git repository detected`);
      logger.info(
        `Local Hook: ${hookStatus.localHook.exists ? chalk.green("✓ Installed") : chalk.gray("✗ Not installed")}`,
      );
      if (hookStatus.localHook.exists) {
        logger.info(`  Path: ${hookStatus.localHook.path}`);
      }
    } else {
      logger.info(`Repository: ${chalk.gray("✗ Not a git repository")}`);
    }

    logger.info(
      `Global Hook: ${hookStatus.globalHook.exists ? chalk.green("✓ Installed") : chalk.gray("✗ Not installed")}`,
    );
    if (hookStatus.globalHook.exists) {
      logger.info(`  Path: ${hookStatus.globalHook.path}`);
    }

    // Configuration Sources
    logger.info(chalk.blue("\n⚙️  Configuration"));
    logger.info("----------------");

    const globalConfigPath = join(homedir(), ".gitguard", "config.json");
    const localConfigPath = join(gitRoot, ".gitguard", "config.json");

    logger.info("Config Files:");
    logger.info(
      `  Global: ${formatConfigPath(globalConfigPath, existsSync(globalConfigPath))}`,
    );
    logger.info(
      `  Local: ${formatConfigPath(localConfigPath, existsSync(localConfigPath))}`,
    );

    // Active Configuration
    logger.info(chalk.blue("\n🔧 Active Settings"));
    logger.info("----------------");

    // Git Settings
    logger.info("\nGit:");
    logger.info(`  Base Branch: ${formatConfigValue(config.git.baseBranch)}`);
    logger.info("  Ignore Patterns:");
    config.git.ignorePatterns.forEach((pattern) => {
      logger.info(`    • ${pattern}`);
    });

    // Analysis Settings
    logger.info("\nAnalysis:");
    logger.info(
      `  Max Commit Size: ${formatConfigValue(config.analysis.maxCommitSize)} lines`,
    );
    logger.info(
      `  Max File Size: ${formatConfigValue(config.analysis.maxFileSize)} lines`,
    );
    logger.info(
      `  Conventional Commits: ${formatEnabled(config.analysis.checkConventionalCommits)}`,
    );

    // AI Features
    logger.info("\nAI Features:");
    displayAIConfig(config.ai).forEach((line) => logger.info(line));

    // Security Features
    logger.info("\nSecurity:");
    logger.info(`  Status: ${formatEnabled(config.security.enabled)}`);
    if (config.security.enabled) {
      logger.info(
        `  Secret Detection: ${formatEnabled(config.security.checkSecrets)}`,
      );
      logger.info(
        `  File Checks: ${formatEnabled(config.security.checkFiles)}`,
      );
    }

    // PR Settings
    logger.info("\nPull Requests:");
    logger.info(
      `  Template Path: ${formatConfigValue(config.pr.template.path)}`,
    );
    logger.info(
      `  Template Required: ${formatEnabled(config.pr.template.required)}`,
    );
    logger.info("  Required Sections:");
    Object.entries(config.pr.template.sections).forEach(
      ([section, enabled]) => {
        logger.info(`    • ${section}: ${formatEnabled(enabled)}`);
      },
    );
    logger.info(`  Max Size: ${formatConfigValue(config.pr.maxSize)} lines`);
    logger.info(
      `  Required Approvals: ${formatConfigValue(config.pr.requireApprovals)}`,
    );

    // Debug Mode
    logger.info("\nDebug Mode:");
    logger.info(`  Status: ${formatEnabled(config.debug)}`);

    // Quick Actions
    logger.info(chalk.blue("\n💡 Quick Actions"));
    logger.info("---------------");
    logger.info("• Install hooks:        gitguard hook install [-g]");
    logger.info("• Configure AI:         Edit ~/.gitguard/config.json");
    logger.info("• Enable debug:         GITGUARD_DEBUG=true");
    logger.info("• Skip hook:           SKIP_GITGUARD=true git commit");
  } catch (error) {
    logger.error("Failed to get status:", error);
    throw error;
  }
}
