// templates/monorepo-config.ts
export const monorepoConfigTemplate = `import type { MonorepoConfig } from '@siteed/publisher';

const config: MonorepoConfig = {
  packageManager: 'yarn',
  conventionalCommits: true,
  versionStrategy: 'independent',
  bumpStrategy: 'prompt',
  git: {
    tagPrefix: 'v',
    requireCleanWorkingDirectory: true,
    requireUpToDate: true,
    commit: true,
    push: true,
    commitMessage: 'chore(release): release \${packageName}@\${version}',
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
  packages: {
    'packages/*': {
      changelogFile: 'CHANGELOG.md',
      conventionalCommits: true,
      npm: {
        publish: true,
        access: 'public'
      }
    }
  },
  ignorePackages: [],
  maxConcurrency: 4
};

export default config;`;
