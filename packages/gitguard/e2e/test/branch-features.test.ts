import { LoggerService } from "../../src/services/logger.service.js";
import { E2ETest, TestResult, TestScenario } from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

const scenarios: TestScenario[] = [
  {
    id: "branch-split-suggestion",
    name: "Branch split suggestion for multiple packages",
    setup: {
      monorepo: true,
      files: [
        {
          path: "packages/app/src/features/auth/login.ts",
          content: "export const login = () => console.log('login');",
        },
        {
          path: "packages/core/src/utils/validation.ts",
          content: "export const validate = () => console.log('validate');",
        },
        {
          path: "packages/ui/src/components/Button.tsx",
          content: "export const Button = () => console.log('button');",
        },
      ],
      config: {
        analysis: {
          maxFileSize: 2,
          maxCommitSize: 100,
        },
        git: {
          monorepoPatterns: ["packages/"],
        },
      },
      branch: "feature/auth-and-ui",
      commit: "feat: add authentication and UI components",
    },
    input: {
      options: {
        split: true,
      },
      message: "feat: add authentication and UI components",
      command: {
        name: "branch",
        subcommand: "analyze",
        args: ["--ai"],
      },
    },
  },
  {
    id: "pr-template-parsing",
    name: "PR description generation with template",
    setup: {
      files: [
        {
          path: ".github/pull_request_template.md",
          content: `## Description
<!-- Describe your changes here -->

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change

## Testing
<!-- Describe the tests you ran -->`,
        },
        {
          path: "src/features/user/profile.ts",
          content:
            "export const profile = () => console.log('updated profile');",
        },
      ],
      config: {
        pr: {
          template: {
            path: ".github/pull_request_template.md",
          },
        },
      },
      branch: "feature/user-profile",
      commit: "feat: add user profile feature",
    },
    input: {
      message: "feat: add user profile feature",
      command: {
        name: "branch",
        subcommand: "analyze",
        args: ["--ai", "--debug"],
      },
    },
  },
  {
    id: "complex-branch-split",
    name: "Complex branch split with dependencies",
    setup: {
      monorepo: true,
      files: [
        {
          path: "packages/api/src/endpoints/user.ts",
          content:
            "export const userApi = () => console.log('updated user api');",
        },
        {
          path: "packages/core/src/models/user.ts",
          content:
            "export const userModel = () => console.log('updated user model');",
        },
        {
          path: "packages/app/src/features/user/list.tsx",
          content:
            "export const UserList = () => console.log('updated user list');",
        },
        {
          path: "packages/app/src/features/user/detail.tsx",
          content:
            "export const UserDetail = () => console.log('updated user detail');",
        },
      ],
      config: {
        git: {
          monorepoPatterns: ["packages/"],
        },
      },
      branch: "feature/user-management",
      commit: "feat: implement user management system",
    },
    input: {
      message: "feat: implement user management system",
      command: {
        name: "branch",
        subcommand: "analyze",
        args: ["--ai", "--split"],
      },
    },
  },
];

export const branchFeaturesTest: E2ETest = {
  name: "Branch Features",
  scenarios,
  async run(
    logger: LoggerService,
    selectedScenarios?: TestScenario[],
  ): Promise<TestResult[]> {
    const scenariosToRun = selectedScenarios ?? scenarios;
    const results: TestResult[] = [];

    for (const scenario of scenariosToRun) {
      results.push(await runScenario(scenario, logger));
    }

    return results;
  },
};
