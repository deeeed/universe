import { LoggerService } from "../src/services/logger.service.js";
import { Config, DeepPartial } from "../src/types/config.types.js";
import { Severity } from "../src/types/security.types.js";

export type CommandName = "commit" | "branch" | "status" | "init" | "template";
export type CommandSubcommand =
  | "pr"
  | "analyze"
  | "create"
  | "suggest"
  | "edit";

export interface ExpectedResult {
  files?: Array<{
    path: string;
    exists: boolean;
    content?: string | RegExp;
  }>;
  git?: {
    status?: {
      staged?: string[];
      unstaged?: string[];
      untracked?: string[];
    };
    commits?: Array<{
      message: string;
      files?: string[];
    }>;
    currentBranch?: string;
  };
  error?: {
    message: string | RegExp;
    code?: number;
  };
}

export interface TestScenario {
  id: string;
  name: string;
  setup: {
    files: Array<{
      path: string;
      content: string;
    }>;
    changes?: Array<{
      path: string;
      content: string;
    }>;
    monorepo?: boolean;
    config?: DeepPartial<Config>;
    branch?: string;
    commit?: string;
    stageOnly?: boolean;
  };
  input: {
    message: string;
    options?: {
      ai?: boolean;
      staged?: boolean;
      unstaged?: boolean;
      all?: boolean;
      debug?: boolean;
      execute?: boolean;
      split?: boolean;
    };
    command?: {
      name: CommandName;
      subcommand?: CommandSubcommand;
      args?: string[];
    };
  };
  expected?: ExpectedResult;
}

export interface RepoState {
  status: string;
  log: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  config?: Record<string, unknown>;
}

export interface TestResult {
  success: boolean;
  message: string;
  error?: Error;
  details?: {
    input: string;
    command: string;
    initialState?: RepoState;
    finalState?: RepoState;
  };
}

export interface E2ETest {
  name: string;
  scenarios: TestScenario[];
  run: (
    logger: LoggerService,
    selectedScenarios?: TestScenario[],
  ) => Promise<TestResult[]>;
}

export const TestSuites = {
  COMMIT_MESSAGE: "commit-message",
  SECURITY: "security",
  AI_SUGGESTIONS: "ai-suggestions",
  LARGE_COMMITS: "large-commits",
  BRANCH_FEATURES: "branch-features",
  INIT: "init",
  STATUS: "status",
  TEMPLATE: "template",
  AI_PROVIDERS: "ai-providers",
} as const;

export type TestSuiteKey = (typeof TestSuites)[keyof typeof TestSuites];

export interface CreateSecurityConfigParams {
  rules?: {
    secrets?: {
      enabled?: boolean;
      severity?: Severity;
      patterns?: string[];
    };
    files?: {
      enabled?: boolean;
      severity?: Severity;
    };
  };
  debug?: boolean;
}

export interface CreateCommandParams {
  name: CommandName;
  subcommand: CommandSubcommand;
  args: string[];
}
