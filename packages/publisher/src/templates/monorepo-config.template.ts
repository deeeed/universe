// templates/monorepo-config.ts
import type {
  PackageManager,
  MonorepoConfig,
  PackageJson,
} from "../types/config";

interface GenerateMonorepoConfigOptions {
  packageJson: PackageJson;
  packageManager: PackageManager;
  conventionalCommits?: boolean;
  versionStrategy?: MonorepoConfig["versionStrategy"];
  bumpStrategy?: MonorepoConfig["bumpStrategy"];
  packagesGlob?: string;
}

export function generateMonorepoConfig(
  options: GenerateMonorepoConfigOptions,
): string {
  if (!options.packageJson.name) {
    throw new Error("Package name is required");
  }

  const defaultConfig: MonorepoConfig = {
    packageManager: options.packageManager,
    conventionalCommits: options.conventionalCommits ?? true,
    versionStrategy: options.versionStrategy ?? "independent",
    bumpStrategy: options.bumpStrategy ?? "prompt",
    git: {
      tagPrefix: `${options.packageJson.name}@`,
      requireCleanWorkingDirectory: true,
      requireUpToDate: true,
      commit: true,
      push: true,
      commitMessage: `chore(release): release ${options.packageJson.name}@\${version}`,
      tag: true,
      allowedBranches: ["main", "master"],
      remote: "origin",
    },
    npm: {
      publish: true,
      registry: "https://registry.npmjs.org",
      tag: "latest",
      access: "public",
    },
    packages: options.packagesGlob
      ? {
          [options.packagesGlob]: {
            changelogFile: "CHANGELOG.md",
          },
        }
      : {},
    ignorePackages: [],
    maxConcurrency: 4,
    changelogFile: "CHANGELOG.md",
    hooks: {},
  };

  return `import type { MonorepoConfig } from '@siteed/publisher';

const config: MonorepoConfig = ${JSON.stringify(defaultConfig, null, 2)};

export default config;`;
}
