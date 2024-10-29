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
  "publisher.config.json",
  ".publisher.json",
];

interface ConfigModule {
  default?: MonorepoConfig;
  [key: string]: unknown;
}

export async function loadConfig(): Promise<MonorepoConfig> {
  const configPath = findConfigFile();

  if (!configPath) {
    return getDefaultConfig();
  }

  try {
    const extension = path.extname(configPath);
    let config: unknown;

    if (extension === ".json") {
      const jsonContent = await fs.promises.readFile(configPath, "utf-8");
      config = JSON.parse(jsonContent);
    } else if (extension === ".ts") {
      // For TypeScript files, register ts-node with proper configuration
      const tsNode = await import("ts-node");
      tsNode.register({
        transpileOnly: true,
        compilerOptions: {
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          allowJs: true,
        },
      });

      // Delete require cache to ensure fresh load
      const resolvedPath = require.resolve(configPath);
      delete require.cache[resolvedPath];

      // Load the TypeScript config file
      const tsModule = (await import(configPath)) as ConfigModule;
      config = tsModule.default ?? tsModule;
    } else if (extension === ".js") {
      const jsModule = (await import(configPath)) as ConfigModule;
      config = jsModule.default ?? jsModule;
    } else {
      throw new Error(`Unsupported config file extension: ${extension}`);
    }

    return validateConfig(config);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to load config from ${configPath}: ${error.message}`,
      );
    }
    throw new Error(`Failed to load config from ${configPath}`);
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
