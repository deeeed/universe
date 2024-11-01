import { GitConfig } from "./git.types";

export interface Config {
    git: GitConfig;
    analysis: {
      maxCommitSize: number;
      maxFileSize: number;
      checkConventionalCommits: boolean;
    };
  }
  