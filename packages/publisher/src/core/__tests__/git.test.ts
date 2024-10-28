import { GitService } from '../git';
import simpleGit from 'simple-git';
import type { GitConfig } from '../../types/config';

jest.mock('simple-git');

describe('GitService', () => {
  let gitService: GitService;
  const mockGit = {
    status: jest.fn(),
    fetch: jest.fn(),
    tag: jest.fn(),
    add: jest.fn(),
    commit: jest.fn(),
    push: jest.fn(),
    addAnnotatedTag: jest.fn()
  };

  beforeEach(() => {
    (simpleGit as jest.Mock).mockReturnValue(mockGit);
    const config: GitConfig = {
      tagPrefix: 'v',
      requireCleanWorkingDirectory: true,
      requireUpToDate: true,
      commit: true,
      push: true,
      commitMessage: 'chore(release): release ${packageName}@${version}',
      tag: true,
      allowedBranches: ['main'],
      remote: 'origin'
    };
    gitService = new GitService(config);
  });

  describe('validateStatus', () => {
    it('should pass validation for clean working directory on main branch', async () => {
      mockGit.status.mockResolvedValue({
        isClean: () => true,
        current: 'main',
        tracking: 'origin/main',
        behind: 0
      });

      await expect(gitService.validateStatus({
        git: {
          tagPrefix: 'v',
          requireCleanWorkingDirectory: true,
          requireUpToDate: true,
          commit: true,
          push: true,
          commitMessage: 'chore(release): release ${packageName}@${version}',
          tag: true,
          allowedBranches: ['main'],
          remote: 'origin'
        }
      })).resolves.not.toThrow();
    });

    it('should throw error for dirty working directory', async () => {
      mockGit.status.mockResolvedValue({
        isClean: () => false,
        current: 'main'
      });

      await expect(gitService.validateStatus({
        git: {
          tagPrefix: 'v',
          requireCleanWorkingDirectory: true,
          requireUpToDate: true,
          commit: true,
          push: true,
          commitMessage: 'chore(release): release ${packageName}@${version}',
          tag: true,
          allowedBranches: ['main'],
          remote: 'origin'
        }
      })).rejects.toThrow('Working directory is not clean');
    });
  });

  // Additional test helpers
  const createDefaultGitConfig = (): GitConfig => ({
    tagPrefix: 'v',
    requireCleanWorkingDirectory: true,
    requireUpToDate: true,
    commit: true,
    push: true,
    commitMessage: 'chore(release): release ${packageName}@${version}',
    tag: true,
    allowedBranches: ['main'],
    remote: 'origin'
  });

  describe('additional validation scenarios', () => {
    it('should throw error for non-allowed branch', async () => {
      mockGit.status.mockResolvedValue({
        isClean: () => true,
        current: 'feature',
        tracking: 'origin/feature',
        behind: 0
      });

      const config = createDefaultGitConfig();
      await expect(gitService.validateStatus({ git: config }))
        .rejects.toThrow('Current branch feature is not in allowed branches: main');
    });

    it('should throw error when branch is behind remote', async () => {
      mockGit.status.mockResolvedValue({
        isClean: () => true,
        current: 'main',
        tracking: 'origin/main',
        behind: 2
      });

      const config = createDefaultGitConfig();
      config.requireUpToDate = true;
      await expect(gitService.validateStatus({ git: config }))
        .rejects.toThrow('Branch main is behind origin/main by 2 commits');
    });
  });
});
