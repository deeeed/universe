import { promises as fs } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Config, DeepPartial } from "../types/config.types.js";
import { getGitRoot, isGitRepository } from "./git.util.js";
import { deepMerge } from "./deep-merge.js";

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
    return JSON.parse(content) as Partial<Config>;
  } catch {
    return {};
  }
}

function getEnvConfig(): Partial<Config> {
  const envMappings = {
    GITGUARD_USE_AI: (val: string) => ({
      ai: { enabled: val.toLowerCase() === "true" },
    }),
    AZURE_OPENAI_ENDPOINT: (val: string) => ({
      ai: { azure: { endpoint: val } },
    }),
    AZURE_OPENAI_DEPLOYMENT: (val: string) => ({
      ai: { azure: { deployment: val } },
    }),
    AZURE_OPENAI_API_VERSION: (val: string) => ({
      ai: { azure: { apiVersion: val } },
    }),
  };

  return Object.entries(envMappings).reduce((config, [envVar, transform]) => {
    const value = process.env[envVar];
    if (value) {
      return { ...config, ...transform(value) };
    }
    return config;
  }, {});
}

export async function getConfigStatus(): Promise<ConfigStatus> {
  const globalConfigPath = join(homedir(), ".gitguard", "config.json");
  const isRepo = isGitRepository();
  const gitRoot = isRepo ? getGitRoot() : null;
  const localConfigPath = gitRoot
    ? join(gitRoot, ".gitguard", "config.json")
    : "";

  const [globalConfig, localConfig] = await Promise.all([
    loadJsonFile(globalConfigPath),
    gitRoot ? loadJsonFile(localConfigPath) : Promise.resolve(null),
  ]);

  const envConfig = getEnvConfig();
  const effectiveConfig = deepMerge<Config>(
    defaultConfig,
    globalConfig || {},
    localConfig || {},
    envConfig,
  );

  return {
    global: {
      exists: Object.keys(globalConfig).length > 0,
      path: globalConfigPath,
      config: Object.keys(globalConfig).length > 0 ? globalConfig : null,
    },
    local: {
      exists: Object.keys(localConfig || {}).length > 0,
      path: localConfigPath,
      config: Object.keys(localConfig || {}).length > 0 ? localConfig : null,
    },
    effective: effectiveConfig,
  };
}

export const defaultConfig: Config = {
  git: {
    baseBranch: "main",
    ignorePatterns: ["*.lock", "dist/*"],
    cwd: process.cwd(),
  },
  analysis: {
    maxCommitSize: 500,
    maxFileSize: 800,
    checkConventionalCommits: true,
  },
  debug: false,
  security: {
    enabled: true,
    checkSecrets: true,
    checkFiles: true,
  },
  ai: {
    enabled: false,
    provider: null,
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
  hook: {
    defaultChoice: "keep",
    timeoutSeconds: 90,
  },
};

export async function loadConfig(
  options: LoadConfigOptions = {},
): Promise<Config> {
  const { configPath } = options;

  try {
    const status = await getConfigStatus();
    const customConfig = configPath ? await loadJsonFile(configPath) : {};

    // Merge configs with custom config taking precedence
    const finalConfig = deepMerge<Config>(
      defaultConfig,
      status.global.config || {},
      status.local.config || {},
      getEnvConfig(),
      customConfig,
    );

    // Type guard for AI config
    if (
      typeof finalConfig.ai === "object" &&
      finalConfig.ai &&
      !("azure" in finalConfig.ai && finalConfig.ai.azure?.endpoint) &&
      !("ollama" in finalConfig.ai && finalConfig.ai.ollama?.host)
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

interface ConfigPaths {
  global: string;
  local: string | null;
}

export function getConfigPaths(): ConfigPaths {
  const globalConfigPath = join(homedir(), ".gitguard", "config.json");
  const gitRoot = isGitRepository() ? getGitRoot() : null;
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
  cwd,
}: CreateConfigParams = {}): Config {
  const merged = deepMerge(defaultConfig, partial);

  if (cwd) {
    return {
      ...merged,
      git: {
        ...merged.git,
        cwd,
      },
    };
  }

  return merged;
}
