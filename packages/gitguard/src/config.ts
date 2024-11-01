import { Config } from "./types/config.types";

export async function loadConfig(): Promise<Config> {
  // TODO: Implement proper config loading from file or env
  await Promise.resolve(); // Dummy await to satisfy TypeScript
  return {
    git: {
      baseBranch: "main", // or detect from repo
      ignorePatterns: ["*.lock", "dist/*"],
    },
    analysis: {
      maxCommitSize: 500,
      maxFileSize: 800,
      checkConventionalCommits: true,
    },
  };
}
