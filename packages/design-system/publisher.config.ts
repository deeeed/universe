import type { ReleaseConfig, DeepPartial } from '@siteed/publisher';

const config: DeepPartial<ReleaseConfig> = {
  packageManager: 'yarn',
  changelogFile: 'CHANGELOG.md',
  conventionalCommits: true,
  changelogFormat: 'keep-a-changelog',
  versionStrategy: 'independent',
  bumpStrategy: 'prompt',
  packValidation: {
    enabled: true,
    validateFiles: true,
    validateBuildArtifacts: true,
  },
  git: {
    tagPrefix: '@siteed/design-system@',
    requireCleanWorkingDirectory: true,
    requireUpToDate: true,
    requireUpstreamTracking: true,
    commit: true,
    push: true,
    commitMessage: 'chore(release): release @siteed/design-system@${version}',
    tag: true,
    allowedBranches: ['main'],
    remote: 'origin',
  },
  npm: {
    publish: true,
    registry: 'https://registry.npmjs.org',
    tag: 'latest',
    access: 'public',
  },
  hooks: {},
};

export default config;
