import { LoggerService } from "../../src/services/logger.service.js";
import { E2ETest, TestResult, TestScenario } from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

interface TemplateContentParams {
  type: string;
  format: string;
  id: string;
  title: string;
  template?: string;
  ai?: { provider: string; model: string };
}

interface ExpectedFileResult {
  path: string;
  exists: boolean;
  content?: RegExp;
}

// Common template content builders
function createTemplateContent(params: TemplateContentParams): string {
  const { type, format, id, title, template, ai } = params;
  return `
type: ${type}
format: ${format}
id: ${id}
title: ${title}
${
  ai
    ? `ai:
  provider: ${ai.provider}
  model: ${ai.model}`
    : ""
}
${
  template
    ? `template: |
  ${template}`
    : ""
}`;
}

// Common expected file checker
function createExpectedFile(
  path: string,
  contentRegex?: RegExp,
): ExpectedFileResult {
  return {
    path,
    exists: true,
    ...(contentRegex && { content: contentRegex }),
  };
}

const DEFAULT_TEMPLATE_TYPES = [
  "commit",
  "pr",
  "split-commit",
  "split-pr",
] as const;
const DEFAULT_FORMATS = ["api", "human"] as const;

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
        // Generate expected files for all default templates
        ...DEFAULT_TEMPLATE_TYPES.flatMap((type) =>
          DEFAULT_FORMATS.map((format) =>
            createExpectedFile(
              `.gitguard/templates/${type}.${format}.yml`,
              new RegExp(`type:\\s*${type}\\s*\\nformat:\\s*${format}`),
            ),
          ),
        ).filter(
          (file) =>
            !file.path.includes("split-") || file.path.includes(".api."),
        ),
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
          content: createTemplateContent({
            type: "commit",
            format: "api",
            id: "commit-conventional",
            title: "Conventional Commit Format",
            ai: { provider: "openai", model: "gpt-4" },
            template:
              "{{#if files}}\nfeat: update {{files.0.path}}\n{{else}}\nfeat: initial commit\n{{/if}}",
          }),
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
      files: [createExpectedFile(".gitguard/templates/commit.api.yml")],
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
      files: [createExpectedFile(".gitguard/templates/invalid.api.yml")],
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
          content: createTemplateContent({
            type: "commit",
            format: "api",
            id: "commit-conventional",
            title: "Conventional Commit Format",
            ai: { provider: "openai", model: "gpt-4" },
            template:
              "{{#if files}}\nfeat: update {{files.0.path}}\n{{else}}\nfeat: initial commit\n{{/if}}",
          }),
        },
        {
          path: ".gitguard/templates/pr.api.yml",
          content: createTemplateContent({
            type: "pr",
            format: "api",
            id: "pr-description",
            title: "PR Description Template",
            ai: { provider: "openai", model: "gpt-4" },
            template: "## Changes\n{{#each files}}\n- {{this.path}}\n{{/each}}",
          }),
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
        createExpectedFile(".gitguard/templates/commit.api.yml"),
        createExpectedFile(".gitguard/templates/pr.api.yml"),
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
      files: DEFAULT_FORMATS.map((format) =>
        createExpectedFile(
          `custom-templates/commit.${format}.yml`,
          new RegExp(`type:\\s*commit\\s*\\nformat:\\s*${format}`),
        ),
      ),
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
        runScenario({ scenario, logger }),
      ),
    );
  },
};
