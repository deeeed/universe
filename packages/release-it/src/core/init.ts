import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../utils/logger';
import { WorkspaceService } from './workspace';
import type { ReleaseConfig } from '../types/config';
import type execaType from 'execa';

export class InitService {
  constructor(
    private logger: Logger,
    private workspaceService: WorkspaceService = new WorkspaceService(), // Default value for production code
  ) {}

  async initialize(packages: string[], options: { force?: boolean } = {}): Promise<void> {
    try {
      // Get packages to initialize
      const packagesToInit = packages.length > 0
        ? await this.workspaceService.getPackages(packages)
        : await this.workspaceService.getPackages(); // No argument when packages array is empty

      if (packagesToInit.length === 0) {
        throw new Error('No packages found to initialize');
      }

      // Initialize each package
      for (const pkg of packagesToInit) {
        this.logger.info(`\nInitializing ${pkg.name}...`);

        const configPath = path.join(pkg.path, 'release-it.config.ts');

        // Check if config already exists
        try {
          await fs.access(configPath);
          if (!options.force) {
            this.logger.warning(
              `Config already exists for ${pkg.name}. Use --force to overwrite.`,
            );
            continue;
          }
        } catch {
          // File doesn't exist, continue with creation
        }

        // Generate config
        const config = this.generateConfig(pkg.name);

        // Write config file
        await this.writeConfig(configPath, config);

        // Create or update changelog
        await this.initializeChangelog(pkg.path);

        this.logger.success(`Initialized ${pkg.name}`);
      }

      // Create root config if it doesn't exist
      await this.initializeRootConfig(options.force);

      this.logger.success('\nInitialization completed successfully!');
      this.logger.info('\nNext steps:');
      this.logger.info('1. Review and adjust the generated configurations');
      this.logger.info('2. Update CHANGELOG.md files with your initial content');
      this.logger.info('3. Commit the changes');
    } catch (error) {
      this.logger.error('Initialization failed:', error);
      throw error;
    }
  }

  private generateConfig(packageName: string): ReleaseConfig {
    return {
      packageManager: 'yarn',
      changelogFile: 'CHANGELOG.md',
      conventionalCommits: true,
      versionStrategy: 'independent', // Added missing property
      bumpStrategy: 'prompt',         // Added missing property
      git: {
        tagPrefix: `${packageName.replace('@', '').replace('/', '-')}-v`,
        requireCleanWorkingDirectory: true,
        requireUpToDate: true,
        commit: true,
        push: true,
        commitMessage: `chore(${packageName}): release v\${version}`,
        tag: true,
        allowedBranches: ['main', 'master'],
        remote: 'origin',
      },
      npm: {
        publish: true,
        registry: 'https://registry.npmjs.org',
        tag: 'latest',
        access: 'public',
      },
      hooks: {
        preRelease: async (): Promise<void> => {
          await exec('yarn typecheck');
          await exec('yarn test');
          await exec('yarn build');
        },
      },
    };
  }

  private async writeConfig(
    configPath: string,
    config: ReleaseConfig,
  ): Promise<void> {
    const configContent = `import type { ReleaseConfig } from '@siteed/release-it';

const config: ReleaseConfig = ${JSON.stringify(config, null, 2)};

export default config;
`;
    await fs.writeFile(configPath, configContent);
  }

  private async initializeChangelog(packagePath: string): Promise<void> {
    const changelogPath = path.join(packagePath, 'CHANGELOG.md');

    try {
      await fs.access(changelogPath);
      // Changelog exists, skip
      return;
    } catch {
      // Create new changelog
      const content = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Removed

[unreleased]: https://github.com/deeeed/universe/compare/HEAD
`;
      await fs.writeFile(changelogPath, content);
    }
  }

  private async initializeRootConfig(force?: boolean): Promise<void> {
    const rootConfigPath = path.join(process.cwd(), 'release-it.config.ts');

    try {
      await fs.access(rootConfigPath);
      if (!force) {
        this.logger.info('Root config already exists. Use --force to overwrite.');
        return;
      }
    } catch {
      // File doesn't exist, continue
    }

    const rootConfig = `import type { MonorepoConfig } from '@siteed/release-it';

const config: MonorepoConfig = {
  packageManager: 'yarn',
  conventionalCommits: true,
  versionStrategy: 'independent',
  packages: {
    'packages/*': {
      // Default package configuration
      changelogFile: 'CHANGELOG.md',
      npm: {
        publish: true,
        access: 'public',
      },
    },
  },
  ignorePackages: [],
  maxConcurrency: 4,
};

export default config;
`;

    await fs.writeFile(rootConfigPath, rootConfig);
    this.logger.success('Created root configuration');
  }
}


async function exec(command: string): Promise<void> {
  const execaModule = await import('execa');
  const execa: typeof execaType = execaModule.default;
  await execa(command.split(' ')[0], command.split(' ').slice(1));
}
