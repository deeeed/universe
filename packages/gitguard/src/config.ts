import execa from "execa";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { Config } from "./types/config.types.js";

const defaultConfig: Config = {
  git: {
    baseBranch: "main",
    ignorePatterns: ["*.lock", "dist/*"],
  },
  analysis: {
    maxCommitSize: 500,
    maxFileSize: 800,
    checkConventionalCommits: true,
  },
  debug: false,
  ai: {
    enabled: true,
    provider: "azure",
    azure: {
      endpoint: "",
      deployment: "gpt-4",
      apiVersion: "2024-02-15-preview",
    },
    ollama: {
      host: "http://localhost:11434",
      model: "codellama",
    },
  },
};

async function loadJsonFile(path: string): Promise<Partial<Config>> {
  try {
    const content = await readFile(path, "utf-8");
    const parsed = JSON.parse(content) as Partial<Config>;
    return parsed;
  } catch {
    return {};
  }
}

async function getGitRoot(): Promise<string> {
  try {
    const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"]);
    return stdout;
  } catch {
    return process.cwd();
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

export async function loadConfig(): Promise<Config> {
  try {
    // 1. Load global config from home directory
    const homeConfig = await loadJsonFile(
      join(homedir(), ".gitguard", "config.json"),
    );

    // 2. Load local config from git repository
    const gitRoot = await getGitRoot();
    const localConfig = await loadJsonFile(
      join(gitRoot, ".gitguard", "config.json"),
    );

    // 3. Load environment variables
    const envConfig = getEnvConfig();

    // Merge configurations in order: default -> global -> local -> env
    return {
      ...defaultConfig,
      ...homeConfig,
      ...localConfig,
      ...envConfig,
    };
  } catch (error) {
    console.error("Failed to load configuration:", error);
    return defaultConfig;
  }
}
