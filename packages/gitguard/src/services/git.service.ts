import { GitConfig, GitCommandParams } from '../types/git.types';
import { CommitInfo, FileChange } from '../types/commit.types';
import { CommitParser } from '../utils/commit-parser.util';

export class GitService {
    private parser: CommitParser;
    private readonly gitConfig: GitConfig;
  
    constructor(params: { config: GitConfig }) {
      this.gitConfig = params.config;
      this.parser = new CommitParser();
    }
  
    // Add getter for config
    public get config(): GitConfig {
      return this.gitConfig;
    }

  async getCurrentBranch(): Promise<string> {
    const result = await this.execGit({ 
      command: 'rev-parse', 
      args: ['--abbrev-ref', 'HEAD'] 
    });
    return result.trim();
  }

  async getCommits(params: { 
    from: string; 
    to: string; 
  }): Promise<CommitInfo[]> {
    const output = await this.execGit({
      command: 'log',
      args: [
        '--format=%H%n%an%n%aI%n%B%n--END--',
        `${params.from}..${params.to}`
      ]
    });

    const commits = this.parser.parseCommitLog({ log: output });
    return this.attachFileChanges({ commits });
  }

  private async attachFileChanges(params: { 
    commits: Omit<CommitInfo, 'files'>[] 
  }): Promise<CommitInfo[]> {
    return Promise.all(
      params.commits.map(async commit => ({
        ...commit,
        files: await this.getFileChanges({ commit: commit.hash })
      }))
    );
  }

  private async getFileChanges(params: { 
    commit: string 
  }): Promise<FileChange[]> {
    const output = await this.execGit({
      command: 'show',
      args: ['--numstat', '--format=', params.commit]
    });

    return this.parser.parseFileChanges({ numstat: output });
  }

  private async execGit(params: GitCommandParams): Promise<string> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout, stderr } = await execAsync(
      `git ${params.command} ${params.args.join(' ')}`
    );

    if (stderr) {
      throw new Error(`Git error: ${stderr}`);
    }

    return stdout;
  }
}
