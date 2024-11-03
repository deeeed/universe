import chalk from "chalk";
import { LoggerService } from "../services/logger.service.js";
import { Config } from "../types/config.types.js";
import { getConfigStatus } from "../utils/config.util.js";
import { getGitRoot } from "../utils/git.util.js";
import { getHookStatus } from "../utils/hook.util.js";

export interface StatusOptions {
  debug?: boolean;
  configPath?: string;
  configOnly?: boolean;
  hooksOnly?: boolean;
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

function displayConfigFeatures(config: Partial<Config> | null): string[] {
  const output: string[] = [];

  // Git Configuration
  output.push("Git Configuration:");
  output.push(`  Base Branch: ${formatConfigValue(config?.git?.baseBranch)}`);

  // Analysis Features
  output.push("\nAnalysis Features:");
  output.push(
    `  Conventional Commits: ${formatEnabled(config?.analysis?.checkConventionalCommits ?? false)}`,
  );
  output.push(
    `  Max Commit Size: ${formatConfigValue(config?.analysis?.maxCommitSize ?? "Not set")} lines`,
  );
  output.push(
    `  Max File Size: ${formatConfigValue(config?.analysis?.maxFileSize ?? "Not set")} lines`,
  );

  // AI Features
  output.push("\nAI Features:");
  output.push(`  Status: ${formatEnabled(config?.ai?.enabled ?? false)}`);
  if (config?.ai?.enabled) {
    output.push(`  Provider: ${formatConfigValue(config.ai.provider)}`);

    if (config.ai.provider === "azure" && config.ai.azure) {
      output.push("  Azure OpenAI:");
      output.push(
        `    Endpoint: ${formatConfigValue(config.ai.azure.endpoint)}`,
      );
      output.push(
        `    Deployment: ${formatConfigValue(config.ai.azure.deployment)}`,
      );
      output.push(
        `    API Version: ${formatConfigValue(config.ai.azure.apiVersion)}`,
      );
    } else if (config.ai.provider === "openai" && config.ai.openai) {
      output.push("  OpenAI:");
      output.push(`    Model: ${formatConfigValue(config.ai.openai.model)}`);
    } else if (config.ai.provider === "ollama" && config.ai.ollama) {
      output.push("  Ollama:");
      output.push(`    Host: ${formatConfigValue(config.ai.ollama.host)}`);
      output.push(`    Model: ${formatConfigValue(config.ai.ollama.model)}`);
    }
  }

  // Security Features
  output.push("\nSecurity Features:");
  output.push(`  Status: ${formatEnabled(config?.security?.enabled ?? false)}`);
  output.push(
    `  Secret Detection: ${formatEnabled(config?.security?.checkSecrets ?? false)}`,
  );
  output.push(
    `  File Checks: ${formatEnabled(config?.security?.checkFiles ?? false)}`,
  );

  // PR Features
  output.push("\nPull Request Features:");
  output.push(
    `  Template Required: ${formatEnabled(config?.pr?.template?.required ?? false)}`,
  );
  output.push(
    `  Template Path: ${formatConfigValue(config?.pr?.template?.path)}`,
  );
  if (config?.pr?.template?.sections) {
    output.push("  Required Sections:");
    Object.entries(config.pr.template.sections).forEach(
      ([section, enabled]) => {
        output.push(`    • ${section}: ${formatEnabled(enabled)}`);
      },
    );
  }
  output.push(
    `  Max PR Size: ${formatConfigValue(config?.pr?.maxSize ?? "Not set")} lines`,
  );
  output.push(
    `  Required Approvals: ${formatConfigValue(config?.pr?.requireApprovals ?? "Not set")}`,
  );

  // Debug Mode
  output.push("\nDebug Mode:");
  output.push(`  Status: ${formatEnabled(config?.debug ?? false)}`);

  // Add Hook Configuration section
  output.push("\nHook Configuration:");
  output.push(
    `  Default Action: ${formatHookChoice(config?.hook?.defaultChoice)}`,
  );
  output.push(
    `  Timeout: ${formatConfigValue(config?.hook?.timeoutSeconds ?? 90)} seconds`,
  );

  return output;
}

// Add helper function to format hook choice
function formatHookChoice(choice?: string): string {
  const choices = {
    keep: "Keep original message",
    ai: "Generate with AI",
    format: "Use formatted message",
  };

  if (!choice) return chalk.gray("Not configured (defaults to keep)");
  return chalk.cyan(choices[choice as keyof typeof choices] || choice);
}

export async function status(options: StatusOptions): Promise<void> {
  const logger = new LoggerService({ debug: options.debug });

  try {
    logger.debug("Status options:", options);
    const status = await getConfigStatus();

    logger.debug("Status object:", JSON.stringify(status, null, 2));
    logger.debug(
      "Global config:",
      JSON.stringify(status.global.config, null, 2),
    );

    if (!options.hooksOnly) {
      logger.info(chalk.blue("\n📝 Configuration Status:"));

      if (status.global.exists) {
        logger.info(
          `\nGlobal config found at: ${chalk.cyan(status.global.path)}`,
        );

        if (!status.global.config) {
          logger.info(
            chalk.yellow(
              "Global config file exists but no configuration was loaded",
            ),
          );
          logger.info(
            chalk.gray(
              "Try running 'gitguard init -g' to create a new configuration",
            ),
          );
        } else {
          logger.info(chalk.yellow("\nGlobal Settings:"));
          const globalFeatures = displayConfigFeatures(status.global.config);
          globalFeatures.forEach((line) => logger.info(line));
        }
      } else {
        logger.info(chalk.yellow("\nNo global config found"));
      }

      if (status.local.exists) {
        logger.info(
          `\nLocal config found at: ${chalk.cyan(status.local.path)}`,
        );
        logger.info(chalk.yellow("\nLocal Settings (overrides global):"));
        const localFeatures = displayConfigFeatures(status.local.config);
        if (localFeatures.length > 0) {
          localFeatures.forEach((line) => logger.info(line));
        } else {
          logger.info(chalk.gray("No features configured"));
        }
      } else {
        logger.info(chalk.yellow("\nNo local config found"));
      }

      if (status.effective && status.local.exists) {
        logger.info(chalk.blue("\n⚡ Effective Configuration:"));
        displayConfigFeatures(status.effective).forEach((line) =>
          logger.info(line),
        );
      }
    }

    // Hook Status
    logger.info(chalk.blue("\n🔗 Git Hooks Status:"));
    const hookStatus = await getHookStatus();

    if (hookStatus.isRepo) {
      logger.info(`Local repository detected at: ${chalk.cyan(getGitRoot())}`);

      if (hookStatus.localHook.exists) {
        logger.info(chalk.green("• Local hook installed"));
        logger.info(`  Path: ${chalk.cyan(hookStatus.localHook.path)}`);
        logger.info(
          `  Hooks Directory: ${chalk.cyan(hookStatus.localHook.hooksPath)}`,
        );
      } else {
        logger.info(chalk.yellow("• No local hook installed"));
      }
    } else {
      logger.info(chalk.yellow("Not in a git repository"));
    }

    if (hookStatus.globalHook.exists) {
      logger.info(chalk.green("\n• Global hook installed"));
      logger.info(`  Path: ${chalk.cyan(hookStatus.globalHook.path)}`);
      logger.info(
        `  Hooks Directory: ${chalk.cyan(hookStatus.globalHook.hooksPath)}`,
      );
    } else {
      logger.info(chalk.yellow("\nNo global hook installed"));
    }

    // Quick Actions
    logger.info(chalk.blue("\n💡 Quick Actions"));
    logger.info("---------------");
    logger.info("• Install hooks:        gitguard hook install [-g]");
    logger.info("• Configure settings:   gitguard init [-g]");
    logger.info("• Enable debug:         GITGUARD_DEBUG=true");
    logger.info("• Skip hook:           SKIP_GITGUARD=true git commit");
  } catch (error) {
    logger.error("Failed to get status:", error);
    throw error;
  }
}
