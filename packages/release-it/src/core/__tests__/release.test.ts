import type { MonorepoConfig, PackageContext } from '../../types/config';
import { Logger } from '../../utils/logger';
import { ReleaseService } from '../release';

// Mock dependencies
jest.mock('../git');
jest.mock('../npm');
jest.mock('../version');
jest.mock('../workspace');
jest.mock('../changelog');
jest.mock('../../utils/prompt');

describe('ReleaseService', () => {
  let releaseService: ReleaseService;
  let config: MonorepoConfig;
  let logger: Logger;

  beforeEach(() => {
    config = {
      packageManager: 'yarn',
      conventionalCommits: true,
      versionStrategy: 'independent',
      git: {
        tagPrefix: 'v',
        requireCleanWorkingDirectory: true,
        requireUpToDate: true,
        commit: true,
        push: true,
        commitMessage: 'chore(release): release ${packageName}@${version}',
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
      hooks: {},
      packages: {},
      ignorePackages: [],
      maxConcurrency: 4,
      bumpStrategy: 'prompt',
      changelogFile: 'CHANGELOG.md'
    };
    logger = new Logger();
    releaseService = new ReleaseService(config, logger);
  });

  describe('releasePackages', () => {
    it('should throw error when no packages found', async () => {
      jest.spyOn(releaseService['workspace'], 'getPackages').mockResolvedValue([]);

      await expect(releaseService.releasePackages(['pkg1'], {}))
        .rejects.toThrow('No packages found to release');
    });

    it('should successfully release multiple packages', async () => {
      const mockPackages: PackageContext[] = [
        { name: 'pkg1', path: '/path/to/pkg1', currentVersion: '1.0.0' },
        { name: 'pkg2', path: '/path/to/pkg2', currentVersion: '1.0.0' }
      ];

      jest.spyOn(releaseService['workspace'], 'getPackages').mockResolvedValue(mockPackages);
      jest.spyOn(releaseService['workspace'], 'getPackageConfig').mockResolvedValue(config);
      jest.spyOn(releaseService['version'], 'determineVersion').mockReturnValue('1.0.1');
      jest.spyOn(releaseService['changelog'], 'generate').mockResolvedValue('Changelog entry');
      jest.spyOn(releaseService['prompts'], 'confirmRelease').mockResolvedValue(true);
      jest.spyOn(releaseService['git'], 'createTag').mockResolvedValue('v1.0.1');
      jest.spyOn(releaseService['git'], 'commitChanges').mockResolvedValue('commit-hash');

      const results = await releaseService.releasePackages(['pkg1', 'pkg2'], {});

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({
        packageName: 'pkg1',
        version: '1.0.1',
        git: { tag: 'v1.0.1', commit: 'commit-hash' }
      });
    });
  });

  describe('releaseAll', () => {
    it('should handle no changed packages', async () => {
      jest.spyOn(releaseService['workspace'], 'getChangedPackages').mockResolvedValue([]);

      const results = await releaseService.releaseAll({});

      expect(results).toEqual([]);
    });

    it('should release all changed packages', async () => {
      const changedPackages = [
        { name: 'pkg1', path: '/path/to/pkg1', currentVersion: '1.0.0' }
      ];

      jest.spyOn(releaseService['workspace'], 'getChangedPackages').mockResolvedValue(changedPackages);
      const releasePackagesSpy = jest.spyOn(releaseService, 'releasePackages')
        .mockResolvedValue([{ 
          packageName: 'pkg1', 
          version: '1.0.1', 
          changelog: 'Changelog',
          git: { tag: 'v1.0.1', commit: 'commit-hash' }
        }]);

      await releaseService.releaseAll({});

      expect(releasePackagesSpy).toHaveBeenCalledWith(['pkg1'], {});
    });
  });
});
