export interface GitCommandParams {
  command: string;
  args: string[];
}

export interface GitConfig {
  baseBranch: string;
  ignorePatterns?: string[];
}
