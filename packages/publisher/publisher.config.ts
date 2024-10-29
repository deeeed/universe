import type { ReleaseConfig } from "@siteed/publisher";

const config: Partial<ReleaseConfig> = {
  packageManager: "npm",
  changelogFile: "CHANGELOG.md",
  conventionalCommits: true,
  changelogFormat: "conventional",
  versionStrategy: "independent",
  bumpStrategy: "prompt",
  git: {
    tagPrefix: "@siteed/publisher@",
    requireCleanWorkingDirectory: true,
    requireUpToDate: true,
    commit: true,
    push: true,
    commitMessage: "chore(release): release @siteed/publisher@${version}",
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

export default config;
