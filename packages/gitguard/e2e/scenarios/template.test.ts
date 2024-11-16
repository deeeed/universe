import { LoggerService } from "../../src/services/logger.service.js";
import { E2ETest, TestResult, TestScenario } from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

const scenarios: TestScenario[] = [
  {
    id: "template-init-basic",
    name: "Template Init - Create Default Templates",
    setup: {
      files: [],
      config: {},
    },
    input: {
      message: "initialize default templates",
      command: {
        name: "template",
        args: ["--init"],
      },
    },
    expected: {
      files: [
        {
          path: ".gitguard/templates/commit.api.yml",
          exists: true,
          content: /type:\s*commit\s*\nformat:\s*api/,
        },
        {
          path: ".gitguard/templates/commit.human.yml",
          exists: true,
          content: /type:\s*commit\s*\nformat:\s*human/,
        },
        {
          path: ".gitguard/templates/pr.api.yml",
          exists: true,
          content: /type:\s*pr\s*\nformat:\s*api/,
        },
        {
          path: ".gitguard/templates/split-commit.api.yml",
          exists: true,
          content: /type:\s*split-commit\s*\nformat:\s*api/,
        },
        {
          path: ".gitguard/templates/split-pr.api.yml",
          exists: true,
          content: /type:\s*split-pr\s*\nformat:\s*api/,
        },
      ],
      git: {
        status: {
          untracked: [".gitguard/templates/"],
        },
      },
    },
  },
  {
    id: "template-validate-valid",
    name: "Template Validate - Valid Templates",
    setup: {
      files: [
        {
          path: ".gitguard/templates/commit.api.yml",
          content: `
type: commit
format: api
id: commit-conventional
title: Conventional Commit Format
ai:
  provider: openai
  model: gpt-4
template: |
  {{#if files}}
  feat: update {{files.0.path}}
  {{else}}
  feat: initial commit
  {{/if}}`,
        },
      ],
      config: {},
    },
    input: {
      message: "validate existing templates",
      command: {
        name: "template",
        args: ["--validate"],
      },
    },
    expected: {
      files: [
        {
          path: ".gitguard/templates/commit.api.yml",
          exists: true,
        },
      ],
      git: {
        status: {
          untracked: [".gitguard/templates/"],
        },
      },
    },
  },
  {
    id: "template-validate-invalid",
    name: "Template Validate - Invalid Templates",
    setup: {
      files: [
        {
          path: ".gitguard/templates/invalid.api.yml",
          content: `
type: invalid
format: api
id: invalid-template
title: Invalid Template
# Missing template field and invalid type
`,
        },
      ],
      config: {},
    },
    input: {
      message: "validate invalid templates",
      command: {
        name: "template",
        args: ["--validate"],
      },
    },
    expected: {
      files: [
        {
          path: ".gitguard/templates/invalid.api.yml",
          exists: true,
        },
      ],
      error: {
        message: /Invalid template|Missing required fields/,
        code: 1,
      },
    },
  },
  {
    id: "template-list",
    name: "Template List - Show Available Templates",
    setup: {
      files: [
        {
          path: ".gitguard/templates/commit.api.yml",
          content: `
type: commit
format: api
id: commit-conventional
title: Conventional Commit Format
ai:
  provider: openai
  model: gpt-4
template: |
  {{#if files}}
  feat: update {{files.0.path}}
  {{else}}
  feat: initial commit
  {{/if}}`,
        },
        {
          path: ".gitguard/templates/pr.api.yml",
          content: `
type: pr
format: api
id: pr-description
title: PR Description Template
ai:
  provider: openai
  model: gpt-4
template: |
  ## Changes
  {{#each files}}
  - {{this.path}}
  {{/each}}`,
        },
      ],
      config: {},
    },
    input: {
      message: "list available templates",
      command: {
        name: "template",
        args: ["--list"],
      },
    },
    expected: {
      files: [
        {
          path: ".gitguard/templates/commit.api.yml",
          exists: true,
        },
        {
          path: ".gitguard/templates/pr.api.yml",
          exists: true,
        },
      ],
    },
  },
  {
    id: "template-custom-path",
    name: "Template Init - Custom Path",
    setup: {
      files: [],
      config: {},
    },
    input: {
      message: "initialize templates in custom path",
      command: {
        name: "template",
        args: ["--init", "--path", "./custom-templates"],
      },
    },
    expected: {
      files: [
        {
          path: "custom-templates/commit.api.yml",
          exists: true,
          content: /type:\s*commit\s*\nformat:\s*api/,
        },
        {
          path: "custom-templates/commit.human.yml",
          exists: true,
          content: /type:\s*commit\s*\nformat:\s*human/,
        },
      ],
      git: {
        status: {
          untracked: ["custom-templates/"],
        },
      },
    },
  },
];

export const templateTest: E2ETest = {
  name: "Template Commands",
  scenarios,
  async run(
    logger: LoggerService,
    selectedScenarios?: TestScenario[],
  ): Promise<TestResult[]> {
    return Promise.all(
      (selectedScenarios ?? scenarios).map((scenario) =>
        runScenario(scenario, logger),
      ),
    );
  },
};
