import type { ReleaseConfig } from '@siteed/publisher';

const config: ReleaseConfig = {
  packageManager: 'yarn',
  changelogFile: 'CHANGELOG.md',
  conventionalCommits: true,
  versionStrategy: 'independent',
  bumpStrategy: 'prompt',
  git: {
    tagPrefix: '@siteed/publisher-v',
    requireCleanWorkingDirectory: true,
    requireUpToDate: true,
    commit: true,
    push: true,
    commitMessage: 'chore(@siteed/publisher): release v${version}',
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
  hooks: {
    preRelease: async () => {
      // Add your pre-release checks here
      // await exec('yarn test');
      // await exec('yarn build');
    }
  }
};

export default config;