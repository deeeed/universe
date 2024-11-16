import { Command } from "commander";
import chalk from "chalk";
import { LoggerService } from "../services/logger.service.js";
import { Config } from "../types/config.types.js";
import { getConfigStatus } from "../utils/config.util.js";

interface StatusCommandOptions {
  debug?: boolean;
  configPath?: string;
  global?: boolean;
  local?: boolean;
}

interface StatusAnalyzeParams {
  options: StatusCommandOptions;
}

function formatEnabled(enabled: boolean): string {
  if (enabled) {
    return chalk.green("✓ Enabled");
  }
  return chalk.gray("✗ Disabled");
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
    output.push(
      `  API Clipboard: ${formatEnabled(config.ai?.apiClipboard ?? true)}`,
    );

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
    } else if (config.ai.provider === "anthropic" && config.ai.anthropic) {
      output.push("  Anthropic:");
      output.push(`    Model: ${formatConfigValue(config.ai.anthropic.model)}`);
    } else if (config.ai.provider === "custom" && config.ai.custom) {
      output.push("  Custom:");
      output.push(`    Host: ${formatConfigValue(config.ai.custom.host)}`);
      output.push(`    Model: ${formatConfigValue(config.ai.custom.model)}`);
    }
  }

  // Security Features
  output.push("\nSecurity Features:");
  const securityEnabled = config?.security?.enabled ?? false;
  output.push(`  Status: ${formatEnabled(securityEnabled)}`);

  // Safely access nested security properties with fallbacks
  const secretsEnabled = config?.security?.rules?.secrets?.enabled ?? false;
  const filesEnabled = config?.security?.rules?.files?.enabled ?? false;

  output.push(`  Secret Detection: ${formatEnabled(secretsEnabled)}`);
  output.push(`  File Checks: ${formatEnabled(filesEnabled)}`);

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

  return output;
}

async function analyzeStatus({ options }: StatusAnalyzeParams): Promise<void> {
  const logger = new LoggerService({ debug: options.debug });

  try {
    logger.debug("Status options:", options);
    const status = await getConfigStatus();

    logger.debug("Status object:", JSON.stringify(status, null, 2));
    logger.debug(
      "Global config:",
      JSON.stringify(status.global.config, null, 2),
    );

    logger.info(chalk.blue("\n📝 Configuration Status:"));

    if (status.global.exists && (!options.local || options.global)) {
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
    } else if (!options.local) {
      logger.info(chalk.yellow("\nNo global config found"));
    }

    if (status.local.exists && (!options.global || options.local)) {
      logger.info(`\nLocal config found at: ${chalk.cyan(status.local.path)}`);
      logger.info(chalk.yellow("\nLocal Settings (overrides global):"));
      const localFeatures = displayConfigFeatures(status.local.config);
      if (localFeatures.length > 0) {
        localFeatures.forEach((line) => logger.info(line));
      } else {
        logger.info(chalk.gray("No features configured"));
      }
    } else if (!options.global) {
      logger.info(chalk.yellow("\nNo local config found"));
    }

    if (status.effective && status.local.exists && !options.global) {
      logger.info(chalk.blue("\n⚡ Effective Configuration:"));
      displayConfigFeatures(status.effective).forEach((line) =>
        logger.info(line),
      );
    }

    logger.info(chalk.blue("\n💡 Quick Actions"));
    logger.info("---------------");
    logger.info("• Configure settings:   gitguard init [-g]");
    logger.info("• Enable debug:         GITGUARD_DEBUG=true");
  } catch (error) {
    logger.error("Failed to get status:", error);
    throw error;
  }
}

// Subcommands
const show = new Command("show")
  .description("Show configuration status")
  .option("--global", "Show only global configuration")
  .option("--local", "Show only local configuration")
  .action(async (cmdOptions: StatusCommandOptions) => {
    await analyzeStatus({ options: cmdOptions });
  });

// Main status command
export const statusCommand = new Command("status")
  .description("Show GitGuard configuration status")
  .option("-d, --debug", "Enable debug mode")
  .addHelpText(
    "after",
    `
${chalk.blue("Examples:")}
  ${chalk.yellow("$")} gitguard status              # Show all configurations
  ${chalk.yellow("$")} gitguard status --global     # Show only global config
  ${chalk.yellow("$")} gitguard status --local      # Show only local config`,
  );

// Add subcommands
statusCommand
  .addCommand(show)
  .action(async (cmdOptions: StatusCommandOptions) => {
    await analyzeStatus({ options: cmdOptions });
  });

// Keep original export for backward compatibility
export async function statusLegacy(params: StatusAnalyzeParams): Promise<void> {
  return analyzeStatus(params);
}
