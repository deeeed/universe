import { CommitInfo } from "./commit.types";

export interface AnalysisResult {
    branch: string;
    baseBranch: string;
    commits: CommitInfo[];
    stats: AnalysisStats;
    warnings: AnalysisWarning[];
  }
  
  export interface AnalysisStats {
    totalCommits: number;
    filesChanged: number;
    additions: number;
    deletions: number;
  }
  
  export interface AnalysisWarning {
    type: 'commit' | 'file' | 'general';
    message: string;
    severity: 'info' | 'warning' | 'error';
  }
  
  export interface AnalysisOptions {
    branch?: string;
    includeDrafts?: boolean;
  }
