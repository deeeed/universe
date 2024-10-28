import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import type { MonorepoConfig } from '../types/config';
import { MonorepoConfigSchema } from '../types/config';

const CONFIG_FILES = [
  'publisher.config.js',
  'publisher.config.ts',
  '.publisher.js',
  '.publisher.ts'
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
    throw new Error(`Failed to load config from ${configPath}: ${(error as Error).message}`);
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
    return MonorepoConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue =>
        `${issue.path.join('.')}: ${issue.message}`
      ).join('\n');
      throw new Error(`Invalid configuration:\n${issues}`);
    }
    throw error;
  }
}

function getDefaultConfig(): MonorepoConfig {
  return {
    packageManager: 'yarn',
    changelogFile: 'CHANGELOG.md',
    conventionalCommits: true,
    git: {
      tagPrefix: 'v',
      requireCleanWorkingDirectory: true,
      requireUpToDate: true, // Added missing property
      commit: true,
      push: true,
      commitMessage: 'chore(release): release ${packageName}@${version}',
      tag: true,
      allowedBranches: ['main', 'master'],
      remote: 'origin'
    },
    npm: {
      publish: true,
      registry: 'https://registry.npmjs.org',
      tag: 'latest',
      access: 'public'
    },
    hooks: {},
    packages: {},
    ignorePackages: [],
    maxConcurrency: 4,
    versionStrategy: 'independent',
    bumpStrategy: 'prompt'
  };
}
