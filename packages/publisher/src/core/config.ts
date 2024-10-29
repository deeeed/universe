import fs from "fs";
import path from "path";
import { z } from "zod";
import { generateDefaultConfig } from "../templates/package-config.template";
import type { MonorepoConfig } from "../types/config";
import { MonorepoConfigSchema } from "../types/config";

const CONFIG_FILES = [
  "publisher.config.js",
  "publisher.config.ts",
  ".publisher.js",
  ".publisher.ts",
];

export async function loadConfig(): Promise<MonorepoConfig> {
  const configPath = findConfigFile();

  if (!configPath) {
    return getDefaultConfig();
  }

  try {
    const module = (await import(configPath)) as { default: unknown };
    const config = validateConfig(module.default);
    return config;
  } catch (error) {
    throw new Error(
      `Failed to load config from ${configPath}: ${(error as Error).message}`,
    );
  }
}

function findConfigFile(): string | undefined {
  const cwd = process.cwd();

  for (const fileName of CONFIG_FILES) {
    const filePath = path.join(cwd, fileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return undefined;
}

function validateConfig(config: unknown): MonorepoConfig {
  try {
    const validatedConfig = MonorepoConfigSchema.parse(config);
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
      throw new Error(`Invalid configuration:\n${issues}`);
    }
    throw error;
  }
}

function getDefaultConfig(): MonorepoConfig {
  const baseConfig = generateDefaultConfig({
    packageJson: { name: "root" },
    packageManager: "yarn",
    conventionalCommits: true,
    changelogFormat: "conventional",
    versionStrategy: "independent",
    bumpStrategy: "prompt",
    npm: {
      publish: true,
      access: "public",
    },
  });

  return {
    ...baseConfig,
    packages: {},
    ignorePackages: [],
    maxConcurrency: 4,
  };
}
