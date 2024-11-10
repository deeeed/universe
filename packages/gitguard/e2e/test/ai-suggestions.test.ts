import { readFile } from "fs/promises";
import { join } from "path";
import { LoggerService } from "../../src/services/logger.service.js";
import { AIConfig, DeepPartial } from "../../src/types/config.types.js";
import { E2ETest, TestResult, TestScenario } from "../tests.types.js";
import { runScenario } from "../tests.utils.js";

// Create base configurations that can be reused
const baseAIConfig: DeepPartial<AIConfig> = {
  enabled: true,
  provider: "azure",
  maxPromptTokens: 4000,
  azure: {
    endpoint: "",
    deployment: "",
    apiVersion: "",
    apiKey: "",
  },
};

const baseButtonComponent = {
  path: "src/components/Button.tsx",
  content: "export const Button = () => <button>Click</button>;",
};

const enhancedButtonComponent = {
  path: "src/components/Button.tsx",
  content: `
export interface ButtonProps {
  variant: 'primary' | 'secondary';
  size: 'sm' | 'md' | 'lg';
  label: string;
  onClick: () => void;
}

export const Button = ({ variant, size, label, onClick }: ButtonProps) => {
  return (
    <button
      className={\`btn btn-\${variant} btn-\${size}\`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};`,
};

// Create a function to generate common scenario structure
function createScenario(params: {
  id: string;
  name: string;
  setup: Partial<TestScenario["setup"]>;
  input: TestScenario["input"];
}): TestScenario {
  return {
    id: params.id,
    name: params.name,
    setup: {
      files: [],
      config: {
        debug: true,
        git: {
          monorepoPatterns: ["packages/*"],
        },
        ai: {
          ...baseAIConfig,
          maxPromptTokens: 4000,
        },
      },
      ...params.setup,
    },
    input: params.input,
  };
}

const scenarios: TestScenario[] = [
  createScenario({
    id: "commit-ai-basic",
    name: "Basic commit with AI suggestions",
    setup: {
      files: [
        {
          path: "src/api/auth.ts",
          content: "export const auth = () => console.log('auth');",
        },
      ],
      commit: "Initial auth implementation",
      changes: [
        {
          path: "src/api/auth.ts",
          content: `// Updated auth implementation...`,
        },
        {
          path: "src/api/oauth.ts",
          content: `// OAuth implementation...`,
        },
      ],
      stageOnly: true,
    },
    input: {
      message: "implement oauth authentication",
      command: {
        name: "commit",
        subcommand: "suggest",
        args: ["--staged"],
      },
    },
  }),

  createScenario({
    id: "commit-ai-large",
    name: "Commit with large changes (should exceed limits)",
    setup: {
      files: [{ path: "src/generated.ts", content: "// Initial content" }],
      config: {
        ai: {
          ...baseAIConfig,
          maxPromptTokens: 2000,
          maxPromptCost: 0.01,
        },
      },
      changes: [
        {
          path: "src/generated.ts",
          content: Array.from({ length: 100 }, (_, i) =>
            generateTypeAndService(i),
          ).join("\n"),
        },
      ],
      stageOnly: true,
    },
    input: {
      message: "update generated types",
      command: {
        name: "commit",
        subcommand: "create",
        args: ["--ai"],
      },
    },
  }),

  createScenario({
    id: "branch-ai-analyze",
    name: "Branch analysis with AI suggestions",
    setup: {
      files: [baseButtonComponent],
      config: {
        ...baseAIConfig,
        git: { baseBranch: "main" },
      },
      commit: "Initial button component",
      branch: "feature/ui-components",
      changes: [{ ...enhancedButtonComponent }],
    },
    input: {
      message: "analyze branch changes",
      command: {
        name: "branch",
        subcommand: "analyze",
        args: ["--ai"],
      },
    },
  }),

  createScenario({
    id: "branch-ai-pr",
    name: "Create PR with AI suggestions",
    setup: {
      files: [baseButtonComponent],
      branch: "feature/ui-components",
      changes: [{ ...enhancedButtonComponent }],
    },
    input: {
      message: "create PR with AI description",
      command: {
        name: "branch",
        subcommand: "pr",
        args: ["--ai", "--draft"],
      },
    },
  }),

  createScenario({
    id: "complex-commit-split",
    name: "Complex commit with AI split suggestions",
    setup: {
      stageOnly: true,
      files: [
        {
          path: "packages/app/src/features/user/profile.ts",
          content: "export const Profile = () => null;",
        },
        {
          path: "packages/app/src/features/user/settings.ts",
          content: "export const Settings = () => null;",
        },
        {
          path: "packages/app/src/types/user.ts",
          content: "export type User = { id: string; };",
        },
        {
          path: "packages/app/tests/user/profile.test.ts",
          content: "test('profile', () => {});",
        },
        {
          path: "packages/core/src/auth/service.ts",
          content: "export const authenticate = () => false;",
        },
        {
          path: "packages/core/src/auth/types.ts",
          content: "export type AuthToken = string;",
        },
        {
          path: "packages/shared/src/logging/logger.ts",
          content: "export const logger = { log: console.log };",
        },
        {
          path: "packages/shared/src/logging/types.ts",
          content: "export type LogLevel = 'info' | 'error';",
        },
      ],
      config: {
        debug: true,
        git: {
          monorepoPatterns: ["packages/*"],
        },
        ai: {
          ...baseAIConfig,
          maxPromptTokens: 4000,
        },
      },
      changes: [
        {
          path: "packages/app/src/features/user/profile.ts",
          content: `
export interface ProfileProps {
  userId: string;
  onUpdate: () => void;
}

export const Profile = ({ userId, onUpdate }: ProfileProps) => {
  return <div>Profile Component</div>;
};`,
        },
        {
          path: "packages/app/src/features/user/settings.ts",
          content: `
export interface SettingsProps {
  config: Record<string, unknown>;
}

export const Settings = ({ config }: SettingsProps) => {
  return <div>Settings Component</div>;
};`,
        },
        {
          path: "packages/app/src/types/user.ts",
          content: `
export interface User {
  id: string;
  email: string;
  profile: {
    name: string;
    avatar: string;
  };
  settings: Record<string, unknown>;
}`,
        },
        {
          path: "packages/app/tests/user/profile.test.ts",
          content: `
import { render } from '@testing-library/react';
import { Profile } from '../../src/features/user/profile';

test('Profile renders correctly', () => {
  render(<Profile userId="123" onUpdate={() => {}} />);
});`,
        },
        {
          path: "packages/core/src/auth/service.ts",
          content: `
export interface AuthOptions {
  provider: 'google' | 'github';
  clientId: string;
}

export class AuthService {
  constructor(private options: AuthOptions) {}
  
  async authenticate(token: string): Promise<boolean> {
    console.log('Authenticating with', this.options.provider);
    return true;
  }
  
  async validateToken(token: string): Promise<boolean> {
    return token.length > 0;
  }
}`,
        },
        {
          path: "packages/core/src/auth/types.ts",
          content: `
export interface AuthToken {
  value: string;
  expiresAt: Date;
  provider: string;
}

export interface AuthUser {
  id: string;
  email: string;
  provider: string;
  lastLogin: Date;
}`,
        },
        {
          path: "packages/shared/src/logging/logger.ts",
          content: `
import { LogLevel, LogConfig } from './types';

export class Logger {
  constructor(private config: LogConfig) {}
  
  log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    console.log(\`[\${timestamp}] [\${level}] \${message}\`, meta);
  }
  
  error(message: string, error?: Error) {
    this.log('error', message, { error: error?.message });
  }
}`,
        },
        {
          path: "packages/shared/src/logging/types.ts",
          content: `
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
}`,
        },
      ],
    },
    input: {
      message: "implement user profile and settings",
      command: {
        name: "commit",
        subcommand: "create",
        args: ["-m", "implement user profile and settings", "--staged", "--ai"],
      },
      options: {
        staged: true,
        ai: true,
      },
    },
  }),

  createScenario({
    id: "branch-ai-split",
    name: "Branch analysis with AI split suggestions",
    setup: {
      files: [
        {
          path: "packages/app/src/features/auth/login.tsx",
          content: `
export const Login = () => <div>Login</div>;`,
        },
        {
          path: "packages/app/src/features/auth/register.tsx",
          content: `
export const Register = () => <div>Register</div>;`,
        },
        {
          path: "packages/core/src/services/auth.service.ts",
          content: `
export class AuthService {
  login() { return true; }
  register() { return true; }
}`,
        },
        {
          path: "packages/shared/src/components/Button.tsx",
          content: `
export const Button = () => <button>Click</button>;`,
        },
        {
          path: "packages/shared/src/components/Input.tsx",
          content: `
export const Input = () => <input />;`,
        },
      ],
      config: {
        debug: true,
        git: {
          monorepoPatterns: ["packages/*"],
        },
        ai: {
          ...baseAIConfig,
          maxPromptTokens: 4000,
        },
      },
      branch: "feature/auth-and-ui",
      commit: "Initial commit",
      changes: [
        {
          path: "packages/app/src/features/auth/login.tsx",
          content: `
export interface LoginProps {
  onSuccess: () => void;
}

export const Login = ({ onSuccess }: LoginProps) => {
  return (
    <div>
      <h1>Login</h1>
      <Input placeholder="Email" />
      <Input type="password" placeholder="Password" />
      <Button onClick={onSuccess}>Login</Button>
    </div>
  );
};`,
        },
        {
          path: "packages/app/src/features/auth/register.tsx",
          content: `
export interface RegisterProps {
  onSuccess: () => void;
}

export const Register = ({ onSuccess }: RegisterProps) => {
  return (
    <div>
      <h1>Register</h1>
      <Input placeholder="Email" />
      <Input type="password" placeholder="Password" />
      <Input type="password" placeholder="Confirm Password" />
      <Button onClick={onSuccess}>Register</Button>
    </div>
  );
};`,
        },
        {
          path: "packages/core/src/services/auth.service.ts",
          content: `
interface AuthCredentials {
  email: string;
  password: string;
}

export class AuthService {
  async login(credentials: AuthCredentials) {
    // Implement login logic
    return { success: true, token: 'mock-token' };
  }

  async register(credentials: AuthCredentials) {
    // Implement registration logic
    return { success: true, userId: 'mock-user-id' };
  }

  async validateToken(token: string) {
    return token === 'mock-token';
  }
}`,
        },
        {
          path: "packages/shared/src/components/Button.tsx",
          content: `
export interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button = ({ children, onClick, variant = 'primary' }: ButtonProps) => {
  return (
    <button 
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};`,
        },
        {
          path: "packages/shared/src/components/Input.tsx",
          content: `
export interface InputProps {
  type?: 'text' | 'password' | 'email';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export const Input = ({ 
  type = 'text',
  placeholder,
  value,
  onChange
}: InputProps) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="input"
    />
  );
};`,
        },
      ],
    },
    input: {
      message: "analyze branch changes",
      command: {
        name: "branch",
        subcommand: "analyze",
        args: [],
      },
      options: {
        ai: true,
        split: true,
      },
    },
  }),
];

// Helper function to generate type and service code
function generateTypeAndService(index: number): string {
  return `
export interface Type${index} {
  id: string;
  metadata: Record<string, unknown>;
  config: { enabled: boolean; settings: Record<string, unknown>; };
}
export class Service${index} {
  constructor(private config: Type${index}) {}
  async process(): Promise<void> {
    console.log('Processing', this.config);
  }
}`;
}

async function loadAITestConfig(
  logger: LoggerService,
): Promise<Required<NonNullable<AIConfig["azure"]>>> {
  try {
    const testEnvPath = join(process.cwd(), ".env.test");
    const envContent = await readFile(testEnvPath, "utf-8");

    const config = envContent.split("\n").reduce(
      (acc, line) => {
        const [key, value] = line.split("=").map((s) => s.trim());
        if (!key || !value) return acc;

        switch (key) {
          case "AZURE_OPENAI_ENDPOINT":
            acc.endpoint = value;
            break;
          case "AZURE_OPENAI_DEPLOYMENT":
            acc.deployment = value;
            break;
          case "AZURE_OPENAI_API_VERSION":
            acc.apiVersion = value;
            break;
          case "AZURE_OPENAI_API_KEY":
            acc.apiKey = value;
            break;
        }
        return acc;
      },
      {} as Required<NonNullable<AIConfig["azure"]>>,
    );

    logger.debug("Loaded AI test configuration:", {
      hasEndpoint: !!config.endpoint,
      hasDeployment: !!config.deployment,
      hasApiVersion: !!config.apiVersion,
      hasApiKey: !!config.apiKey,
    });

    return config;
  } catch (error) {
    logger.warn("Failed to load AI test configuration:", error);
    logger.warn(`
To run AI tests, create a .env.test file with the following variables:
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_API_KEY=your-api-key
    `);
    return {} as Required<NonNullable<AIConfig["azure"]>>;
  }
}

export const aiSuggestionsTest: E2ETest = {
  name: "AI Suggestions",
  scenarios,
  async run(
    logger: LoggerService,
    selectedScenarios?: TestScenario[],
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];
    const aiConfig = await loadAITestConfig(logger);

    if (
      !aiConfig.endpoint ||
      !aiConfig.deployment ||
      !aiConfig.apiVersion ||
      !aiConfig.apiKey
    ) {
      return (selectedScenarios || scenarios).map((scenario) => ({
        scenario,
        success: true,
        skipped: true,
        message: "Skipped - Missing Azure OpenAI configuration",
      }));
    }

    // Use selectedScenarios if provided, otherwise use all scenarios
    const scenariosToRun = selectedScenarios || scenarios;

    // Type assertion to ensure config is fully defined
    const enhancedScenarios = scenariosToRun.map((scenario) => ({
      ...scenario,
      setup: {
        ...scenario.setup,
        config: {
          ...scenario.setup.config,
          ai: {
            ...scenario.setup.config?.ai,
            azure: aiConfig,
          },
        },
      },
    }));

    for (const scenario of enhancedScenarios) {
      results.push(await runScenario(scenario, logger));
    }

    return results;
  },
};
