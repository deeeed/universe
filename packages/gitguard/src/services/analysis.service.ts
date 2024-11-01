import { 
    AnalysisResult, 
    AnalysisOptions, 
    AnalysisStats,
    AnalysisWarning 
  } from '../types/analysis.types';
  import { Config } from '../types/config.types';
  import { CommitInfo } from '../types/commit.types';
  import { GitService } from './git.service';
  
  export class AnalysisService {
    private git: GitService;
  
    constructor(params: { config: Config }) {
      this.git = new GitService({ config: params.config.git });
    }
  
    async analyze(params: AnalysisOptions): Promise<AnalysisResult> {
      const branch = params.branch || await this.git.getCurrentBranch();
      const commits = await this.git.getCommits({ 
        from: this.git.config.baseBranch, 
        to: branch 
      });
  
      const stats = this.calculateStats({ commits });
      const warnings = this.generateWarnings({ 
        commits,
        stats
      });
  
      return {
        branch,
        baseBranch: this.git.config.baseBranch,
        commits,
        stats,
        warnings
      };
    }
  
    private calculateStats(params: { 
      commits: CommitInfo[] 
    }): AnalysisStats {
      const { commits } = params;
      const filesChanged = new Set<string>();
      let additions = 0;
      let deletions = 0;
  
      commits.forEach(commit => {
        commit.files.forEach(file => {
          filesChanged.add(file.path);
          additions += file.additions;
          deletions += file.deletions;
        });
      });
  
      return {
        totalCommits: commits.length,
        filesChanged: filesChanged.size,
        additions,
        deletions
      };
    }
  
    private generateWarnings(params: { 
      commits: CommitInfo[];
      stats: AnalysisStats;
    }): AnalysisWarning[] {
      const { commits, stats } = params;
      const warnings: AnalysisWarning[] = [];
  
      // Check for large PR
      if (stats.filesChanged > 10) {
        warnings.push({
          type: 'general',
          severity: 'warning',
          message: `Large PR detected: ${stats.filesChanged} files changed`
        });
      }
  
      // Check for large commits
      commits.forEach(commit => {
        const totalChanges = commit.files.reduce(
          (sum, file) => sum + file.additions + file.deletions, 
          0
        );
  
        if (totalChanges > 300) {
          warnings.push({
            type: 'commit',
            severity: 'warning',
            message: `Large commit detected: ${commit.hash.slice(0, 7)} with ${totalChanges} changes`
          });
        }
  
        // Check conventional commit format
        if (!this.isValidConventionalCommit(commit)) {
          warnings.push({
            type: 'commit',
            severity: 'error',
            message: `Invalid conventional commit format: ${commit.hash.slice(0, 7)}`
          });
        }
      });
  
      return warnings;
    }
  
    private isValidConventionalCommit(commit: CommitInfo): boolean {
      return Boolean(
        commit.parsed.type && 
        commit.parsed.description &&
        commit.message.match(/^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\([^)]+\))?: .+/)
      );
    }
  }
