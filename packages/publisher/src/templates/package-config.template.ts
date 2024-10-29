import type {
  PackageManager,
  ReleaseConfig,
  PackageJson,
  PackageConfig,
} from "../types/config";

export interface GeneratePackageConfigOptions {
  packageJson: PackageJson;
  packageManager: PackageManager;
  changelogFile?: string;
  conventionalCommits?: boolean;
  changelogFormat?: "conventional" | "keep-a-changelog";
  versionStrategy?: ReleaseConfig["versionStrategy"];
  bumpStrategy?: ReleaseConfig["bumpStrategy"];
  bumpType?: ReleaseConfig["bumpType"];
  preReleaseId?: string;
  npm?: {
    publish: boolean;
    access: "public" | "restricted";
  };
}

export function generateDefaultConfig(
  options: GeneratePackageConfigOptions,
): PackageConfig {
  if (!options.packageJson.name) {
    throw new Error("Package name is required");
  }

  return {
    packageManager: options.packageManager,
    changelogFile: options.changelogFile ?? "CHANGELOG.md",
    conventionalCommits: options.conventionalCommits ?? true,
    changelogFormat: options.changelogFormat ?? "conventional",
    versionStrategy: options.versionStrategy ?? "independent",
    bumpStrategy: options.bumpStrategy ?? "prompt",
    bumpType: options.bumpType,
    preReleaseId: options.preReleaseId,
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
      publish: options.npm?.publish ?? true,
      registry: "https://registry.npmjs.org",
      tag: "latest",
      access: options.npm?.access ?? "public",
    },
    hooks: {},
  };
}

export function generatePackageConfig(
  options: GeneratePackageConfigOptions,
): string {
  const config = generateDefaultConfig(options);

  return `import type { ReleaseConfig, DeepPartial } from '@siteed/publisher';

const config: DeepPartial<ReleaseConfig> = ${JSON.stringify(config, null, 2)};

export default config;`;
}

// Export a default template string for backward compatibility
export const packageConfigTemplate = generatePackageConfig({
  packageJson: { name: "${packageName}" },
  packageManager: "yarn",
});
