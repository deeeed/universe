import type { ReleaseConfig, DeepPartial } from "@siteed/publisher";

const config: DeepPartial<ReleaseConfig> = {
  packageManager: "yarn",
  changelogFile: "CHANGELOG.md",
  conventionalCommits: true,
  changelogFormat: "conventional",
  versionStrategy: "independent",
  bumpStrategy: "prompt",
  packValidation: {
    enabled: true,
    validateFiles: true,
    validateBuildArtifacts: true,
  },
  git: {
    tagPrefix: "gitguard@",
    requireCleanWorkingDirectory: true,
    requireUpToDate: true,
    requireUpstreamTracking: true,
    commit: true,
    push: true,
    commitMessage: "chore(release): release gitguard@${version}",
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
  updateDependenciesOnRelease: false,
  dependencyUpdateStrategy: "none",
};

export default config;
