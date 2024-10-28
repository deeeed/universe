import simpleGit, { SimpleGit } from 'simple-git';
import type { GitConfig } from '../types/config';
import type { PackageContext } from '../types/config';

export class GitService {
  private git: SimpleGit;

  constructor(_config: GitConfig) {
    this.git = simpleGit();
  }

  async validateStatus(config: { git: GitConfig }): Promise<void> {
    const status = await this.git.status();

    if (config.git.requireCleanWorkingDirectory && !status.isClean()) {
      throw new Error('Working directory is not clean');
    }

    if (config.git.requireUpToDate) {
      await this.git.fetch();
      const currentBranch = status.current || '';
      const tracking = status.tracking;

      if (!currentBranch) {
        throw new Error('Not currently on any branch');
      }

      if (!tracking) {
        throw new Error(`Branch ${currentBranch} is not tracking a remote branch`);
      }

      if (status.behind > 0) {
        throw new Error(`Branch ${currentBranch} is behind ${tracking} by ${status.behind} commits`);
      }
    }

    if (config.git.allowedBranches?.length > 0) {
      const currentBranch = status.current || '';

      if (!currentBranch) {
        throw new Error('Not currently on any branch');
      }

      if (!config.git.allowedBranches.includes(currentBranch)) {
        throw new Error(`Current branch ${currentBranch} is not in allowed branches: ${config.git.allowedBranches.join(', ')}`);
      }
    }
  }

  async createTag(context: PackageContext, config: { git: GitConfig }): Promise<string> {
    if (!context.newVersion) {
      throw new Error('New version is required to create a tag');
    }

    const tagName = `${config.git.tagPrefix}${context.newVersion}`;
    const message = config.git.tagMessage ?? `Release ${context.name}@${context.newVersion}`;
    await this.git.addAnnotatedTag(tagName, message);
    return tagName;
  }

  async commitChanges(context: PackageContext, config: { git: GitConfig }): Promise<string> {
    if (!context.newVersion) {
      throw new Error('New version is required to create a commit message');
    }

    const message = config.git.commitMessage
      .replace('${packageName}', context.name)
      .replace('${version}', context.newVersion);

    await this.git.add('.');
    const result = await this.git.commit(message);
    return result.commit;
  }

  async push(config: { git: GitConfig }): Promise<void> {
    await this.git.push(config.git.remote, undefined, ['--follow-tags']);
  }
}
