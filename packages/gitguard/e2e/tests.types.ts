import { LoggerService } from "../src/services/logger.service.js";
import { Config, DeepPartial } from "../src/types/config.types.js";

export interface TestScenario {
  name: string;
  setup: {
    files: Array<{
      path: string;
      content: string;
    }>;
    monorepo?: boolean;
    config?: DeepPartial<Config>;
  };
  input: {
    message: string;
  };
  expected: {
    message: string;
    securityIssues?: boolean;
    splitSuggestion?: boolean;
    aiSuggestions?: boolean;
  };
}

export interface TestResult {
  success: boolean;
  message: string;
  error?: Error;
  details?: {
    input: string;
    output: string;
    warnings?: string[];
  };
}

export interface E2ETest {
  name: string;
  scenarios: TestScenario[];
  run: (logger: LoggerService) => Promise<TestResult[]>;
}
