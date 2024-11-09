import { LoggerService } from "../../src/services/logger.service.js";
import { Config, DeepPartial } from "../../src/types/config.types.js";
import {
  CreateCommandParams,
  CreateSecurityConfigParams,
  E2ETest,
  TestResult,
  TestScenario,
} from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

function createSecurityConfig({
  rules = {},
  debug,
}: CreateSecurityConfigParams = {}): DeepPartial<Config> {
  return {
    ...(debug && { debug: true }),
    security: {
      enabled: true,
      rules: {
        secrets: {
          enabled: true,
          severity: "high",
          ...rules.secrets,
        },
        files: {
          enabled: true,
          severity: "high",
          ...rules.files,
        },
      },
    },
  };
}

function createCommand({
  name,
  subcommand,
  args,
}: CreateCommandParams): NonNullable<TestScenario["input"]["command"]> {
  return { name, subcommand, args };
}

const scenarios: TestScenario[] = [
  {
    id: "secrets-detection",
    name: "Security check - AWS credentials",
    setup: {
      files: [
        {
          path: ".env",
          content: "AWS_SECRET_KEY=AKIAXXXXXXXXXXXXXXXX",
        },
      ],
      config: {
        debug: true,
        ...createSecurityConfig(),
      },
    },
    input: {
      message: "add config",
      command: createCommand({
        name: "commit",
        subcommand: "analyze",
        args: ["--unstaged", "--debug"],
      }),
    },
  },
  {
    id: "token-detection",
    name: "Security check - Environment variables",
    setup: {
      files: [
        {
          path: ".env.local",
          content: "DATABASE_URL=postgresql://user:password@localhost:5432/db",
        },
      ],
      config: createSecurityConfig(),
    },
    input: {
      message: "add database config",
      command: createCommand({
        name: "commit",
        subcommand: "analyze",
        args: ["--all", "--debug"],
      }),
    },
  },
  {
    id: "branch-security",
    name: "Branch Security - PR Creation with Secrets",
    setup: {
      files: [
        {
          path: "src/dummy.ts",
          content: "// Initial file",
        },
      ],
      branch: "feature/credentials",
      changes: [
        {
          path: "config/credentials.json",
          content: '{"aws_key": "AKIA123456789ABCDEF"}',
        },
        {
          path: "src/config.ts",
          content: 'export const DB_PASSWORD = "super_secret_123";',
        },
      ],
      commit: "Add credentials configuration",
      config: createSecurityConfig(),
    },
    input: {
      message: "analyze branch changes",
      command: createCommand({
        name: "branch",
        subcommand: "analyze",
        args: ["--security", "--debug"],
      }),
    },
  },
  {
    id: "branch-security-push",
    name: "Branch Security - Push with Sensitive Files",
    setup: {
      branch: "feature/sensitive-config",
      files: [
        {
          path: "src/config.ts",
          content: `
export const config = {
  privateKey: '-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkq',
  password: 'super_secret_123'
};`,
        },
      ],
      commit: "Update configuration with sensitive data",
      config: createSecurityConfig({
        rules: {
          secrets: {
            patterns: ["private.*key", "password\\s*=\\s*['\"].*['\"]"],
          },
        },
      }),
    },
    input: {
      message: "update configuration",
      command: createCommand({
        name: "branch",
        subcommand: "analyze",
        args: ["--security"],
      }),
    },
  },
];

export const securityTest: E2ETest = {
  name: "Security Checks",
  scenarios,
  async run(
    logger: LoggerService,
    selectedScenarios?: TestScenario[],
  ): Promise<TestResult[]> {
    return Promise.all(
      (selectedScenarios || scenarios).map((scenario) =>
        runScenario(scenario, logger),
      ),
    );
  },
};
