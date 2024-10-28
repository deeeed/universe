/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import conventionalChangelog from 'conventional-changelog';
import { promises as fs } from 'fs';
import { PassThrough } from 'stream';
import type { PackageContext, ReleaseConfig } from '../../types/config';
import { ChangelogService } from '../changelog';

// Mock the fs promises API
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

// Mock conventional-changelog
jest.mock('conventional-changelog', () => jest.fn());

describe('ChangelogService', () => {
  let service: ChangelogService;
  let mockContext: PackageContext;
  let mockConfig: ReleaseConfig;

  beforeEach(() => {
    service = new ChangelogService();
    jest.clearAllMocks();
    
    mockContext = {
      name: 'test-package',
      path: '/test/path',
      currentVersion: '1.0.0',
      newVersion: '1.1.0',
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
    };

    mockConfig = {
      packageManager: 'yarn',
      changelogFile: 'CHANGELOG.md',
      conventionalCommits: true,
      git: {
        tagPrefix: 'v',
        requireCleanWorkingDirectory: true,
        requireUpToDate: true,
        commit: true,
        push: true,
        commitMessage: 'chore(release): release ${packageName}@${version}',
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
      hooks: {},
      versionStrategy: 'independent',
      bumpStrategy: 'prompt',
    };
  });

  describe('generate', () => {
    it('should generate changelog content', async () => {
      const mockStream = new PassThrough();
      (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);

      const changelogPromise = service.generate(mockContext, mockConfig);
      mockStream.write('## Changes\n\n* Feature: New stuff\n');
      mockStream.end();

      const result = await changelogPromise;
      expect(result).toBe('## Changes\n\n* Feature: New stuff');
    });

    it('should handle errors during generation', async () => {
      const mockStream = new PassThrough();
      (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);

      const changelogPromise = service.generate(mockContext, mockConfig);
      mockStream.emit('error', new Error('Generation failed'));

      await expect(changelogPromise).rejects.toThrow('Generation failed');
    });
  });

  describe('update', () => {
    it('should create new changelog file if it doesnt exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));

      const newContent = '* Feature: Something new';
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall?.[1] as string;
      
      // Check essential parts instead of exact format
      expect(content).toContain('# Changelog');
      expect(content).toContain('## [Unreleased]');
      expect(content).toContain('## [1.1.0]');
      expect(content).toContain('* Feature: Something new');
      expect(content).toContain('[unreleased]: https://github.com/deeeed/universe/compare/v1.1.0...HEAD');
    });

    it('should update existing changelog file', async () => {
      const existingContent = '# Changelog\n\n## [1.0.0] - 2024-01-01\n\n* Initial release\n';
      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const newContent = '* Feature: Something new';
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall?.[1] as string;
      expect(content).toContain('## [1.1.0]');
      expect(content).toContain('* Feature: Something new');
      expect(content).toContain('## [1.0.0]');
    });

    it('should insert new entry after Unreleased section', async () => {
      const existingContent = '# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2024-01-01\n';
      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const newContent = '* Feature: Something new';
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall?.[1] as string;
      
      // Handle string operations in a type-safe way
      const sections = {
        unreleased: content.indexOf('## [Unreleased]'),
        newVersion: content.indexOf('## [1.1.0]'),
        oldVersion: content.indexOf('## [1.0.0]')
      };

      expect(sections.unreleased).toBeLessThan(sections.newVersion);
      expect(sections.newVersion).toBeLessThan(sections.oldVersion);
    });
  });

  describe('comparison links', () => {
    it('should add comparison links', async () => {
      const existingContent = '# Changelog\n\n## [1.0.0] - 2024-01-01\n';
      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const newContent = '* Feature: Something new';
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall?.[1] as string;
      expect(content).toContain('[unreleased]: https://github.com/deeeed/universe/compare/v1.1.0...HEAD');
      expect(content).toContain('[1.1.0]: https://github.com/deeeed/universe/compare/v1.0.0...v1.1.0');
    });
  });
});
