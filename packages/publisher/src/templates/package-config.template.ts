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
    packValidation: {
      enabled: true,
      validateFiles: true,
      validateBuildArtifacts: true,
    },
    git: {
      tagPrefix: ``,
      requireCleanWorkingDirectory: true,
      requireUpToDate: true,
      requireUpstreamTracking: true,
      commit: true,
      push: true,
      commitMessage: `chore(${options.packageJson.name}): release \${version}`,
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
    updateDependenciesOnRelease: false,
    dependencyUpdateStrategy: "none",
  };
}

export interface GenerateFileFormat {
  format: "json" | "typescript";
}

export interface GeneratePackageConfigParams {
  options: GeneratePackageConfigOptions;
  format?: GenerateFileFormat["format"];
}

export function generatePackageConfig({
  options,
  format = "json",
}: GeneratePackageConfigParams): string {
  const config = generateDefaultConfig(options);

  if (format === "json") {
    return JSON.stringify(config, null, 2);
  }

  return `import type { ReleaseConfig, DeepPartial } from '@siteed/publisher';

const config: DeepPartial<ReleaseConfig> = ${JSON.stringify(config, null, 2)};

export default config;`;
}

// Export a default template string for backward compatibility
export const packageConfigTemplate = generatePackageConfig({
  options: {
    packageJson: { name: "${packageName}" },
    packageManager: "yarn",
  },
});
