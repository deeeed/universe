import type {
  PackageManager,
  ReleaseConfig,
  PackageJson,
} from "../types/config";

interface GeneratePackageConfigOptions {
  packageJson: PackageJson;
  packageManager: PackageManager;
  changelogFile?: string;
  conventionalCommits?: boolean;
  versionStrategy?: ReleaseConfig["versionStrategy"];
  bumpStrategy?: ReleaseConfig["bumpStrategy"];
}

export function generatePackageConfig(
  options: GeneratePackageConfigOptions,
): string {
  if (!options.packageJson.name) {
    throw new Error("Package name is required");
  }

  const defaultConfig: ReleaseConfig = {
    packageManager: options.packageManager,
    changelogFile: options.changelogFile ?? "CHANGELOG.md",
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
    hooks: {},
  };

  return `import type { ReleaseConfig } from '@siteed/publisher';

const config: ReleaseConfig = ${JSON.stringify(defaultConfig, null, 2)};

export default config;`;
}

// Export a default template string for backward compatibility
export const packageConfigTemplate = generatePackageConfig({
  packageJson: { name: "${packageName}" },
  packageManager: "yarn",
});
