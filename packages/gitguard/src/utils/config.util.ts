import { promises as fs } from "fs";
import { parse as parseJsonc } from "jsonc-parser";
import { homedir } from "os";
import { join } from "path";
import {
  DEFAULT_COMPLEXITY_OPTIONS,
  DEFAULT_MAX_CLIPBOARD_TOKENS,
  DEFAULT_MAX_PROMPT_TOKENS,
} from "../constants.js";
import { Config, DeepPartial } from "../types/config.types.js";
import { Severity } from "../types/security.types.js";
import { deepMerge } from "./deep-merge.js";
import { getGitRootSync, isGitRepositorySync } from "./git.util.js";

export interface ConfigStatus {
  global: {
    exists: boolean;
    path: string;
    config: Partial<Config> | null;
  };
  local: {
    exists: boolean;
    path: string;
    config: Partial<Config> | null;
  };
  effective: Config | null;
}

export interface LoadConfigOptions {
  interactive?: boolean;
  configPath?: string;
}

async function loadJsonFile(path: string): Promise<Partial<Config>> {
  try {
    const content = await fs.readFile(path, "utf-8");
    const parsed = parseJsonc(content) as Partial<Config>;

    // Check if parsing returned a valid object
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Invalid JSON: must be an object");
    }

    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    // Rethrow parsing errors
    throw error;
  }
}

function getEnvConfig(): DeepPartial<Config> {
  const config: DeepPartial<Config> = {};

  // AI Configuration
  if (process.env.GITGUARD_USE_AI) {
    config.ai = {
      enabled: process.env.GITGUARD_USE_AI.toLowerCase() === "true",
    };
  }

  // Azure OpenAI Configuration
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION;

  if (azureEndpoint ?? azureDeployment ?? azureApiVersion) {
    if (!config.ai) config.ai = {};
    config.ai.provider = "azure";
    config.ai.azure = {
      endpoint: azureEndpoint ?? "",
      deployment: azureDeployment ?? "",
      apiVersion: azureApiVersion ?? "",
    };
  }

  // GitHub Configuration
  const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (githubToken) {
    config.git = {
      github: {
        token: githubToken,
      },
    };
  }

  // Security Configuration
  if (process.env.GITGUARD_SECURITY_ENABLED) {
    config.security = {
      enabled: process.env.GITGUARD_SECURITY_ENABLED.toLowerCase() === "true",
      rules: {
        secrets: {
          enabled:
            process.env.GITGUARD_SECURITY_SECRETS?.toLowerCase() === "true",
          severity:
            (process.env.GITGUARD_SECURITY_SECRETS_SEVERITY as Severity) ||
            "high",
        },
        files: {
          enabled:
            process.env.GITGUARD_SECURITY_FILES?.toLowerCase() === "true",
          severity:
            (process.env.GITGUARD_SECURITY_FILES_SEVERITY as Severity) ||
            "high",
        },
      },
    };
  }

  return config;
}

export async function getConfigStatus(): Promise<ConfigStatus> {
  const globalConfigPath = join(homedir(), ".gitguard", "config.json");
  const isRepo = isGitRepositorySync({ cwd: process.cwd() });
  const gitRoot = isRepo ? getGitRootSync({ cwd: process.cwd() }) : null;
  const localConfigPath = gitRoot
    ? join(gitRoot, ".gitguard", "config.json")
    : join(process.cwd(), ".gitguard", "config.json");

  const [globalConfig, localConfig] = await Promise.all([
    loadJsonFile(globalConfigPath),
    localConfigPath ? loadJsonFile(localConfigPath) : Promise.resolve(null),
  ]);

  const envConfig = getEnvConfig();
  const effectiveConfig = deepMerge<Config>(
    getDefaultConfig(),
    globalConfig ?? {},
    localConfig ?? {},
    envConfig,
  );

  return {
    global: {
      exists: Object.keys(globalConfig ?? {}).length > 0,
      path: globalConfigPath,
      config: Object.keys(globalConfig ?? {}).length > 0 ? globalConfig : null,
    },
    local: {
      exists: Object.keys(localConfig ?? {}).length > 0,
      path: localConfigPath || "",
      config: Object.keys(localConfig ?? {}).length > 0 ? localConfig : null,
    },
    effective: effectiveConfig,
  };
}

export function getDefaultConfig(): Config {
  return {
    git: {
      baseBranch: "main",
      monorepoPatterns: ["packages/", "apps/", "libs/"],
      ignorePatterns: ["*.lock", "dist/*"],
    },
    analysis: {
      multiPackageDetection: true,
      complexityDetection: true,
      maxCommitSize: 500,
      maxFileSize: 800,
      checkConventionalCommits: true,
      complexity: { ...DEFAULT_COMPLEXITY_OPTIONS },
    },
    debug: false,
    colors: true,
    security: {
      enabled: true,
      rules: {
        secrets: {
          enabled: true,
          severity: "high",
          blockPR: true,
          patterns: [], // Will use default patterns if empty
        },
        files: {
          enabled: true,
          severity: "high",
          patterns: [], // Will use default patterns if empty
        },
      },
    },
    ai: {
      enabled: false,
      provider: null,
      maxPromptTokens: DEFAULT_MAX_PROMPT_TOKENS,
      maxPromptCost: 0.1,
      maxClipboardTokens: DEFAULT_MAX_CLIPBOARD_TOKENS,
      apiClipboard: true,
    },
    pr: {
      template: {
        path: ".github/pull_request_template.md",
        required: false,
        sections: {
          description: true,
          breaking: true,
          testing: true,
          checklist: true,
        },
      },
      maxSize: 800,
      requireApprovals: 1,
    },
  };
}

export async function loadConfig(
  options: LoadConfigOptions = {},
): Promise<Config> {
  const { configPath } = options;

  try {
    const status = await getConfigStatus();
    const customConfig = configPath ? await loadJsonFile(configPath) : {};

    const finalConfig = deepMerge<Config>(
      getDefaultConfig(),
      status.global.config ?? {},
      status.local.config ?? {},
      getEnvConfig(),
      customConfig,
    );

    // Type guard for AI config
    if (
      typeof finalConfig.ai === "object" &&
      finalConfig.ai &&
      !("azure" in finalConfig.ai && finalConfig.ai.azure?.endpoint) &&
      !("anthropic" in finalConfig.ai && finalConfig.ai.anthropic?.apiKey) &&
      !("custom" in finalConfig.ai && finalConfig.ai.custom?.host)
    ) {
      finalConfig.ai.enabled = false;
    }

    return finalConfig;
  } catch (error) {
    throw new Error(`Failed to load configuration`, {
      cause: error,
    });
  }
}

export interface ConfigPaths {
  global: string;
  local: string | null;
}

export function getConfigPaths(params?: { cwd?: string }): ConfigPaths {
  const isRepo = isGitRepositorySync({ cwd: params?.cwd });
  const gitRoot = isRepo ? getGitRootSync({ cwd: params?.cwd }) : null;

  const globalConfigPath = join(homedir(), ".gitguard", "config.json");
  const localConfigPath = gitRoot
    ? join(gitRoot, ".gitguard", "config.json")
    : null;

  return {
    global: globalConfigPath,
    local: localConfigPath,
  };
}

interface CreateConfigParams {
  partial?: DeepPartial<Config>;
  cwd?: string;
}

export function createConfig({
  partial = {},
}: CreateConfigParams = {}): Config {
  const merged = deepMerge(getDefaultConfig(), partial);

  return merged;
}

interface ValidateConfigParams {
  config: Partial<Config>;
}

export function validateConfig({ config }: ValidateConfigParams): void {
  // Required fields validation
  if (!config.git?.baseBranch) {
    throw new Error("Configuration must include git.baseBranch");
  }

  validateAIConfig({ config });
  validateSecurityConfig({ config });
  validateAnalysisConfig({ config });
}

interface ValidateAIConfigParams {
  config: Partial<Config>;
}

function validateAIConfig({ config }: ValidateAIConfigParams): void {
  if (!config.ai?.enabled) return;

  if (!config.ai.provider) {
    throw new Error("AI provider must be specified when AI is enabled");
  }

  if (config.ai.provider === "openai" && !config.ai.openai) {
    throw new Error("OpenAI configuration missing");
  }

  if (config.ai.provider === "azure" && !config.ai.azure) {
    throw new Error("Azure configuration missing");
  }

  if (config.ai.provider === "anthropic" && !config.ai.anthropic) {
    throw new Error("Anthropic configuration missing");
  }

  if (config.ai.provider === "custom" && !config.ai.custom) {
    throw new Error("Custom configuration missing");
  }

  if (config.ai.maxPromptTokens && config.ai.maxPromptTokens < 1) {
    throw new Error("maxPromptTokens must be greater than 0");
  }

  if (config.ai.maxPromptCost && config.ai.maxPromptCost < 0) {
    throw new Error("maxPromptCost must be non-negative");
  }
}

interface ValidateSecurityConfigParams {
  config: Partial<Config>;
}

function validateSecurityConfig({
  config,
}: ValidateSecurityConfigParams): void {
  if (!config.security?.enabled) return;

  if (!config.security.rules) {
    throw new Error("Security rules must be defined when security is enabled");
  }

  if (
    config.security.rules.secrets?.enabled &&
    !config.security.rules.secrets.severity
  ) {
    throw new Error(
      "Secrets severity must be specified when secrets checking is enabled",
    );
  }

  if (
    config.security.rules.files?.enabled &&
    !config.security.rules.files.severity
  ) {
    throw new Error(
      "Files severity must be specified when file checking is enabled",
    );
  }
}

interface ValidateAnalysisConfigParams {
  config: Partial<Config>;
}

function validateAnalysisConfig({
  config,
}: ValidateAnalysisConfigParams): void {
  if (!config.analysis) return;

  if (config.analysis.maxCommitSize && config.analysis.maxCommitSize < 1) {
    throw new Error("maxCommitSize must be greater than 0");
  }

  if (config.analysis.maxFileSize && config.analysis.maxFileSize < 1) {
    throw new Error("maxFileSize must be greater than 0");
  }
}
