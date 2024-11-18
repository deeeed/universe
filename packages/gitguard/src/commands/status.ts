import { Command } from "commander";
import chalk from "chalk";
import { LoggerService } from "../services/logger.service.js";
import { Config } from "../types/config.types.js";
import {
  getConfigStatus,
  getDefaultConfig,
  loadConfig,
} from "../utils/config.util.js";
import {
  PROBLEMATIC_FILE_PATTERNS,
  SECRET_PATTERNS,
} from "../types/security.types.js";

interface StatusCommandOptions {
  debug?: boolean;
  configPath?: string;
  global?: boolean;
  local?: boolean;
}

// Add icon constants for better readability
const ICONS = {
  INFO: "ℹ️",
  WARNING: "⚠️",
  SUCCESS: "✅",
  ERROR: "❌",
  BULLET: "•",
  NOTE: "📝",
  IMPORTANT: "🔔",
  CONFIG: "⚙️",
  SECURITY: "🔒",
  FILE: "📄",
  FOLDER: "📁",
  BINARY: "📦",
} as const;

function formatEnabled(enabled: boolean): string {
  if (enabled) return chalk.green(`${ICONS.SUCCESS} Enabled`);
  return chalk.gray(`${ICONS.ERROR} Disabled`);
}

function formatConfigValue(value: unknown, defaultValue?: unknown): string {
  if (value === undefined || value === null) {
    return defaultValue !== undefined
      ? chalk.gray(`Using default: ${String(defaultValue)}`)
      : chalk.gray("Not configured");
  }
  if (typeof value === "boolean") {
    return value ? chalk.green("Yes") : chalk.gray("No");
  }
  if (typeof value === "object") {
    try {
      return chalk.white(JSON.stringify(value));
    } catch {
      return chalk.gray("Complex object");
    }
  }
  return chalk.white(String(value));
}

function displayConfigFeatures(
  config: Partial<Config> | null,
  defaultConfig: Config,
): string[] {
  const output: string[] = [];

  // Git Configuration
  output.push(chalk.blue("\nGit Configuration:"));
  output.push(
    `  ${ICONS.CONFIG} Base Branch: ${formatConfigValue(config?.git?.baseBranch, defaultConfig.git.baseBranch)}`,
    `    Purpose: The default branch to compare changes against`,
  );
  output.push(
    `  Monorepo Patterns: ${formatConfigValue(config?.git?.monorepoPatterns, JSON.stringify(defaultConfig.git.monorepoPatterns))}`,
    `    Purpose: Patterns to identify package directories in monorepos`,
  );
  output.push(chalk.gray("\n  Ignore Patterns:"));
  output.push(
    `    ${ICONS.FILE} Status: ${formatConfigValue(config?.git?.ignorePatterns, JSON.stringify(defaultConfig.git.ignorePatterns))}`,
    `    Purpose: Patterns to exclude from analysis and AI prompts`,
    `\n    ${ICONS.IMPORTANT} ${chalk.yellow("Important:")} Properly configured ignore patterns are crucial for:`,
    `      ${ICONS.BULLET} Reducing noise in diffs and analysis`,
    `      ${ICONS.BULLET} Preventing binary files from being processed`,
    `      ${ICONS.BULLET} Optimizing AI token usage`,
    `      ${ICONS.BULLET} Focusing on relevant source code changes`,
    `\n    ${ICONS.NOTE} ${chalk.cyan("Recommended patterns to ignore:")}`,
    `      ${ICONS.BINARY} Binary files (images, pdfs, etc.)`,
    `      ${ICONS.FOLDER} Build artifacts and dependencies`,
    `      ${ICONS.FILE} Large generated files`,
    `      ${ICONS.FOLDER} Temporary and cache files`,
    `      ${ICONS.FILE} System-specific files`,
    `\n    ${ICONS.INFO} ${chalk.gray(" Common patterns:")}`,
    `      ${ICONS.BULLET} *.{png,jpg,gif,ico,pdf,zip,tar.gz}`,
    `      ${ICONS.BULLET} build/`,
    `      ${ICONS.BULLET} dist/`,
    `      ${ICONS.BULLET} node_modules/`,
    `      ${ICONS.BULLET} .cache/`,
    `      ${ICONS.BULLET} *.log`,
  );

  if (!config?.git?.ignorePatterns || config.git.ignorePatterns.length === 0) {
    output.push(
      `\n    ${ICONS.WARNING} ${chalk.yellow("Warning:")} No ignore patterns configured.`,
      `    This may impact performance and token usage.`,
    );
  }

  if (config?.git?.github) {
    output.push(
      `  GitHub Integration:`,
      `    Token: ${config.git.github.token ? chalk.green("Configured") : chalk.gray("Not configured")}`,
      `    Enterprise URL: ${formatConfigValue(config.git.github.enterprise?.url)}`,
    );
  }

  // Analysis Features
  output.push(chalk.blue("\nAnalysis Features:"));
  const defaultAnalysis = defaultConfig.analysis;

  output.push(
    `  Conventional Commits: ${formatEnabled(config?.analysis?.checkConventionalCommits ?? false)}`,
    `    Purpose: Enforce conventional commit message format`,
    `    Default: ${defaultAnalysis.checkConventionalCommits}`,
  );
  output.push(
    `  Max Commit Size: ${formatConfigValue(config?.analysis?.maxCommitSize, defaultAnalysis.maxCommitSize)}`,
    `    Purpose: Maximum number of lines changed in a single commit`,
  );
  output.push(
    `  Max File Size: ${formatConfigValue(config?.analysis?.maxFileSize, defaultAnalysis.maxFileSize)}`,
    `    Purpose: Maximum number of lines in a single file`,
  );

  // Complexity Analysis
  output.push(chalk.blue("\nComplexity Analysis:"));
  const defaultComplexity = defaultConfig.analysis.complexity;

  // Structure Thresholds
  output.push(
    `  Score Threshold: ${formatConfigValue(
      config?.analysis?.complexity?.structureThresholds?.scoreThreshold,
      defaultComplexity.structureThresholds.scoreThreshold,
    )}`,
    `    Purpose: Total complexity score threshold for restructuring`,
  );

  output.push(
    `  Reasons Threshold: ${formatConfigValue(
      config?.analysis?.complexity?.structureThresholds?.reasonsThreshold,
      defaultComplexity.structureThresholds.reasonsThreshold,
    )}`,
    `    Purpose: Number of complexity reasons before requiring restructuring`,
  );

  // File Size Thresholds
  output.push(chalk.gray("\n  File Size Thresholds:"));
  output.push(
    `    Large File: ${formatConfigValue(
      config?.analysis?.complexity?.thresholds?.largeFile,
      defaultComplexity.thresholds.largeFile,
    )} lines`,
    `    Very Large File: ${formatConfigValue(
      config?.analysis?.complexity?.thresholds?.veryLargeFile,
      defaultComplexity.thresholds.veryLargeFile,
    )} lines`,
    `    Huge File: ${formatConfigValue(
      config?.analysis?.complexity?.thresholds?.hugeFile,
      defaultComplexity.thresholds.hugeFile,
    )} lines`,
    `    Multiple Files: ${formatConfigValue(
      config?.analysis?.complexity?.thresholds?.multipleFiles,
      defaultComplexity.thresholds.multipleFiles,
    )} files`,
    `    Many Files: ${formatConfigValue(
      config?.analysis?.complexity?.thresholds?.manyFiles,
      defaultComplexity.thresholds.manyFiles,
    )} files`,
  );

  // Scoring Weights
  output.push(chalk.gray("\n  Scoring Weights:"));
  const scoring = defaultComplexity.scoring;
  output.push(
    `    Base File Score: ${formatConfigValue(config?.analysis?.complexity?.scoring?.baseFileScore, scoring.baseFileScore)}`,
    `    Large File Score: ${formatConfigValue(config?.analysis?.complexity?.scoring?.largeFileScore, scoring.largeFileScore)}`,
    `    Very Large File Score: ${formatConfigValue(config?.analysis?.complexity?.scoring?.veryLargeFileScore, scoring.veryLargeFileScore)}`,
    `    Huge File Score: ${formatConfigValue(config?.analysis?.complexity?.scoring?.hugeFileScore, scoring.hugeFileScore)}`,
    `    Source File Score: ${formatConfigValue(config?.analysis?.complexity?.scoring?.sourceFileScore, scoring.sourceFileScore)}`,
    `    Test File Score: ${formatConfigValue(config?.analysis?.complexity?.scoring?.testFileScore, scoring.testFileScore)}`,
    `    Config File Score: ${formatConfigValue(config?.analysis?.complexity?.scoring?.configFileScore, scoring.configFileScore)}`,
    `    API File Score: ${formatConfigValue(config?.analysis?.complexity?.scoring?.apiFileScore, scoring.apiFileScore)}`,
    `    Migration File Score: ${formatConfigValue(config?.analysis?.complexity?.scoring?.migrationFileScore, scoring.migrationFileScore)}`,
    `    Component File Score: ${formatConfigValue(config?.analysis?.complexity?.scoring?.componentFileScore, scoring.componentFileScore)}`,
    `    Hook File Score: ${formatConfigValue(config?.analysis?.complexity?.scoring?.hookFileScore, scoring.hookFileScore)}`,
    `    Utility File Score: ${formatConfigValue(config?.analysis?.complexity?.scoring?.utilityFileScore, scoring.utilityFileScore)}`,
    `    Critical File Score: ${formatConfigValue(config?.analysis?.complexity?.scoring?.criticalFileScore, scoring.criticalFileScore)}`,
  );

  // AI Features
  output.push(chalk.blue("\nAI Features:"));
  const aiEnabled = config?.ai?.enabled ?? false;
  output.push(`  ${ICONS.CONFIG} Status: ${formatEnabled(aiEnabled)}`);

  if (aiEnabled) {
    const provider = config?.ai?.provider;
    output.push(
      `  ${ICONS.CONFIG} Provider: ${formatConfigValue(provider ?? "Not configured")}`,
    );
    output.push(chalk.gray("\n  Available Providers:"));
    output.push(
      `    ${provider === "azure" ? ICONS.SUCCESS : ICONS.BULLET} Azure OpenAI: ${provider === "azure" ? chalk.green("Active") : chalk.gray("Inactive")}`,
      `    ${provider === "openai" ? ICONS.SUCCESS : ICONS.BULLET} OpenAI: ${provider === "openai" ? chalk.green("Active") : chalk.gray("Inactive")}`,
      `    ${provider === "anthropic" ? ICONS.SUCCESS : ICONS.BULLET} Anthropic: ${provider === "anthropic" ? chalk.green("Active") : chalk.gray("Inactive")}`,
      `    ${provider === "custom" ? ICONS.SUCCESS : ICONS.BULLET} Custom: ${provider === "custom" ? chalk.green("Active") : chalk.gray("Inactive")}`,
    );

    output.push(
      `\n  API Clipboard: ${formatEnabled(config?.ai?.apiClipboard ?? true)}`,
      `    Purpose: Enable copying API responses to clipboard`,
    );
    output.push(
      `  Max Prompt Tokens: ${formatConfigValue(config?.ai?.maxPromptTokens, defaultConfig.ai.maxPromptTokens)}`,
      `    Purpose: Maximum number of tokens allowed in prompts`,
    );
    output.push(
      `  Max Prompt Cost: ${formatConfigValue(config?.ai?.maxPromptCost, defaultConfig.ai.maxPromptCost)}`,
      `    Purpose: Maximum cost allowed per prompt in USD`,
    );

    // Provider-specific configurations
    if (provider === "azure" && config?.ai?.azure) {
      output.push(chalk.gray("\n  Azure OpenAI Configuration:"));
      output.push(
        `    Endpoint: ${formatConfigValue(config.ai.azure.endpoint)}`,
        `    Deployment: ${formatConfigValue(config.ai.azure.deployment)}`,
        `    API Version: ${formatConfigValue(config.ai.azure.apiVersion)}`,
      );
    } else if (provider === "openai" && config?.ai?.openai) {
      output.push(chalk.gray("\n  OpenAI Configuration:"));
      output.push(
        `    Model: ${formatConfigValue(config.ai.openai.model)}`,
        `    Organization: ${formatConfigValue(config.ai.openai.organization)}`,
      );
    } else if (provider === "anthropic" && config?.ai?.anthropic) {
      output.push(chalk.gray("\n  Anthropic Configuration:"));
      output.push(`    Model: ${formatConfigValue(config.ai.anthropic.model)}`);
    } else if (provider === "custom" && config?.ai?.custom) {
      output.push(chalk.gray("\n  Custom Configuration:"));
      output.push(
        `    Host: ${formatConfigValue(config.ai.custom.host)}`,
        `    Model: ${formatConfigValue(config.ai.custom.model)}`,
      );
    }
  } else {
    output.push(
      chalk.gray("  No AI provider configured - AI features disabled"),
    );
  }

  // Security Features
  output.push(chalk.blue("\nSecurity Features:"));
  const securityEnabled = config?.security?.enabled ?? false;
  output.push(`  ${ICONS.SECURITY} Status: ${formatEnabled(securityEnabled)}`);

  if (securityEnabled) {
    // Secret Detection
    const secretsEnabled = config?.security?.rules?.secrets?.enabled ?? false;
    output.push(
      `\n  Secret Detection: ${formatEnabled(secretsEnabled)}`,
      `    Severity: ${formatConfigValue(config?.security?.rules?.secrets?.severity, "high")}`,
      `    Block PR: ${formatConfigValue(config?.security?.rules?.secrets?.blockPR, true)}`,
    );

    if (secretsEnabled) {
      output.push(chalk.gray("    Active Patterns:"));
      SECRET_PATTERNS.forEach((pattern) => {
        output.push(`      • ${pattern.name} (${pattern.severity})`);
      });
    }

    // File Checks
    const filesEnabled = config?.security?.rules?.files?.enabled ?? false;
    output.push(
      `\n  File Checks: ${formatEnabled(filesEnabled)}`,
      `    Severity: ${formatConfigValue(config?.security?.rules?.files?.severity, "high")}`,
    );

    if (filesEnabled) {
      output.push(chalk.gray("    Active Patterns:"));
      PROBLEMATIC_FILE_PATTERNS.forEach((category) => {
        output.push(`      • ${category.category} (${category.severity})`);
      });
    }
  }

  // PR Features
  output.push(chalk.blue("\nPull Request Features:"));
  output.push(
    `  Template Required: ${formatEnabled(config?.pr?.template?.required ?? false)}`,
    `    Purpose: Enforce PR template usage`,
  );
  output.push(
    `  Template Path: ${formatConfigValue(config?.pr?.template?.path, defaultConfig.pr.template.path)}`,
    `    Purpose: Location of PR template file`,
  );

  if (config?.pr?.template?.sections) {
    output.push(chalk.gray("\n  Required Sections:"));
    Object.entries(config.pr.template.sections).forEach(
      ([section, enabled]) => {
        output.push(`    • ${section}: ${formatEnabled(enabled)}`);
      },
    );
  }

  output.push(
    `\n  Max PR Size: ${formatConfigValue(config?.pr?.maxSize, defaultConfig.pr.maxSize)} lines`,
    `    Purpose: Maximum number of lines changed in a PR`,
  );
  output.push(
    `  Required Approvals: ${formatConfigValue(config?.pr?.requireApprovals, defaultConfig.pr.requireApprovals)}`,
    `    Purpose: Number of approvals required before merging`,
  );

  // Debug Mode
  output.push(chalk.blue("\nDebug Mode:"));
  output.push(`  Status: ${formatEnabled(config?.debug ?? false)}`);

  return output;
}

async function analyzeStatus({
  options,
}: {
  options: StatusCommandOptions;
}): Promise<void> {
  const logger = new LoggerService({ debug: options.debug });

  try {
    const status = await getConfigStatus();
    const defaultConfig = getDefaultConfig();
    const runtimeConfig = await loadConfig({ configPath: options.configPath });

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
        displayConfigFeatures(status.global.config, defaultConfig).forEach(
          (line) => logger.info(line),
        );
      }
    }

    if (status.local.exists && (!options.global || options.local)) {
      logger.info(`\nLocal config found at: ${chalk.cyan(status.local.path)}`);
      logger.info(chalk.yellow("\nLocal Settings (overrides global):"));
      const localFeatures = displayConfigFeatures(
        status.local.config,
        defaultConfig,
      );
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
      displayConfigFeatures(runtimeConfig, defaultConfig).forEach((line) =>
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

// Main status command
export const statusCommand = new Command("status")
  .description("Show GitGuard configuration status")
  .option("-d, --debug", "Enable debug mode")
  .option("-g, --global", "Show only global configuration")
  .option("-l, --local", "Show only local configuration")
  .addHelpText(
    "after",
    `
${chalk.blue("Examples:")}
  ${chalk.yellow("$")} gitguard status          # Show all configurations
  ${chalk.yellow("$")} gitguard status --global # Show only global config
  ${chalk.yellow("$")} gitguard status --local  # Show only local config

${chalk.blue("Configuration Locations:")}
  Global: ~/.gitguard/config.json
  Local:  ./.gitguard/config.json (in git root)

${chalk.blue("Available Options:")}
  -d, --debug    Enable debug mode
  -g, --global   Show only global configuration
  -l, --local    Show only local configuration
  -h, --help     Display help for command`,
  )
  .showHelpAfterError(
    `\n${chalk.yellow("Tip:")} Use ${chalk.cyan("gitguard status --help")} to see all available options.`,
  )
  .showSuggestionAfterError(true)
  .action(async (cmdOptions: StatusCommandOptions) => {
    try {
      await analyzeStatus({ options: cmdOptions });
    } catch (error) {
      const logger = new LoggerService({ debug: cmdOptions.debug });
      logger.error("Failed to get status:", error);
      logger.info(
        `\n${chalk.yellow("Need help?")} Run ${chalk.cyan("gitguard status --help")} to see usage instructions.`,
      );
      process.exit(1);
    }
  });
