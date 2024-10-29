import type { ReleaseConfig, DeepPartial } from "@siteed/publisher";

const config: DeepPartial<ReleaseConfig> = {
  packageManager: "npm",
  changelogFile: "CHANGELOG.md",
  conventionalCommits: true,
  changelogFormat: "conventional",
  versionStrategy: "independent",
  bumpStrategy: "prompt",
  git: {
    tagPrefix: "@siteed/publisher@",
    requireCleanWorkingDirectory: false,
    requireUpToDate: false,
    commit: true,
    push: true,
    commitMessage: "chore(release): release @siteed/publisher@${version}",
    tag: true,
    allowedBranches: ["main", "master", "releaseit"],
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

export default config;
