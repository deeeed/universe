import { exec } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { Config } from "../types/config.types.js";
import { Logger } from "../types/logger.types.js";
import { SecurityService } from "./security.service.js";

const execPromise = promisify(exec);

interface TestEnvironment {
  tempDir: string;
  securityService: SecurityService;
  mockLogger: Logger;
  config: Config;
  createFiles: (
    files: Array<{ path: string; content: string }>,
  ) => Promise<void>;
  stageFiles: () => Promise<string>;
}

describe("SecurityService Integration Tests", () => {
  let env: TestEnvironment;

  async function setupTestEnvironment(
    customConfig?: Partial<Config>,
  ): Promise<TestEnvironment> {
    const tempDir = await mkdtemp(join(tmpdir(), "gitguard-security-test-"));

    // Initialize git repo
    await execPromise("git init", { cwd: tempDir });
    await execPromise("git config user.email 'test@example.com'", {
      cwd: tempDir,
    });
    await execPromise("git config user.name 'Test User'", { cwd: tempDir });
    await execPromise("git config core.autocrlf false", { cwd: tempDir });

    const mockLogger: Logger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
      warning: jest.fn(),
      raw: jest.fn(),
      newLine: jest.fn(),
      table: jest.fn(),
      isDebug: jest.fn(),
    };

    const defaultConfig: Config = {
      git: {
        baseBranch: "main",
        monorepoPatterns: [],
        ignorePatterns: [],
      },
      security: {
        enabled: true,
        rules: {
          secrets: {
            enabled: true,
            severity: "high",
          },
          files: {
            enabled: true,
            severity: "high",
          },
        },
      },
      analysis: {
        maxCommitSize: 100,
        maxFileSize: 1000,
        checkConventionalCommits: true,
      },
      debug: true,
      colors: true,
      ai: { enabled: false, provider: null },
      pr: {
        template: {
          path: "",
          required: false,
          sections: {
            description: false,
            breaking: false,
            testing: false,
            checklist: false,
          },
        },
        maxSize: 100,
        requireApprovals: 1,
      },
    };

    const config = { ...defaultConfig, ...customConfig };
    const securityService = new SecurityService({ config, logger: mockLogger });

    const createFiles = async (
      files: Array<{ path: string; content: string }>,
    ): Promise<void> => {
      for (const file of files) {
        const fullPath = join(tempDir, file.path);
        const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
        if (dir !== tempDir) {
          await execPromise(`mkdir -p ${dir}`);
        }
        await writeFile(fullPath, file.content);
      }
    };

    const stageFiles = async (): Promise<string> => {
      await execPromise("git add .", { cwd: tempDir });
      const { stdout } = await execPromise("git diff --cached", {
        cwd: tempDir,
      });
      return stdout;
    };

    return {
      tempDir,
      securityService,
      mockLogger,
      config,
      createFiles,
      stageFiles,
    };
  }

  beforeEach(async () => {
    env = await setupTestEnvironment();
  });

  afterEach(async () => {
    await rm(env.tempDir, { recursive: true, force: true });
  });

  describe("analyzeSecurity", () => {
    describe("Secret Detection", () => {
      it("should detect Stripe API key", async () => {
        await env.createFiles([
          {
            path: "app.js",
            content: 'const key = "sk_live_abcdefghijklmnopqrstuvwx";',
          },
        ]);

        const diff = await env.stageFiles();
        const result = env.securityService.analyzeSecurity({
          files: [
            {
              path: "app.js",
              additions: 1,
              deletions: 0,
              isTest: false,
              isConfig: false,
            },
          ],
          diff,
        });

        expect(result.secretFindings).toHaveLength(1);
        expect(result.secretFindings[0].type).toBe("secret");
        expect(result.secretFindings[0].severity).toBe("high");
        expect(result.shouldBlock).toBe(true);
      });

      it("should detect AWS credentials", async () => {
        await env.createFiles([
          {
            path: "config.js",
            content: `
              const config = {
                aws_secret: "abcdefghijklmnopqrstuvwxyz1234567890ABCD",
                accessKeyId: "AKIAIOSFODNN7EXAMPLE"
              };
            `,
          },
        ]);

        const diff = await env.stageFiles();
        const result = env.securityService.analyzeSecurity({
          files: [
            {
              path: "config.js",
              additions: 6,
              deletions: 0,
              isTest: false,
              isConfig: true,
            },
          ],
          diff,
        });

        expect(result.secretFindings).toHaveLength(2);
        expect(
          result.secretFindings.some((f) => f.match?.includes("AKIA")),
        ).toBe(true);
        expect(
          result.secretFindings.some((f) =>
            f.suggestion.includes("AWS Secret Access Key"),
          ),
        ).toBe(true);
      });

      it("should detect private keys", async () => {
        const privateKeyContent = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdefghijklmnopqrstuvwxyz
ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnop
QRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdef
-----END RSA PRIVATE KEY-----`;

        await env.createFiles([
          {
            path: "deploy/keys.ts",
            content: privateKeyContent,
          },
        ]);

        const diff = await env.stageFiles();
        console.log("Generated diff:", diff);

        const files = [
          {
            path: "deploy/keys.ts",
            additions: 5,
            deletions: 0,
            isTest: false,
            isConfig: false,
          },
        ];

        const result = env.securityService.analyzeSecurity({
          files,
          diff,
        });

        console.log("Security findings:", result.secretFindings);

        expect(result.secretFindings).toHaveLength(1);
        expect(result.secretFindings[0].type).toBe("secret");
        expect(result.secretFindings[0].suggestion).toContain("Private Key");
      });
    });

    describe("Problematic File Detection", () => {
      it("should detect environment files", async () => {
        await env.createFiles([
          { path: ".env", content: "SECRET_KEY=test" },
          { path: ".env.production", content: "PROD_KEY=test" },
        ]);

        const diff = await env.stageFiles();
        const result = env.securityService.analyzeSecurity({
          files: [
            {
              path: ".env",
              additions: 1,
              deletions: 0,
              isTest: false,
              isConfig: true,
            },
            {
              path: ".env.production",
              additions: 1,
              deletions: 0,
              isTest: false,
              isConfig: true,
            },
          ],
          diff,
        });

        expect(result.fileFindings).toHaveLength(2);
        expect(
          result.fileFindings.every((f) => f.type === "sensitive_file"),
        ).toBe(true);
        expect(result.fileFindings.every((f) => f.severity === "high")).toBe(
          true,
        );
      });

      it("should detect key and certificate files", async () => {
        await env.createFiles([
          { path: "certs/server.key", content: "key content" },
          { path: "certs/server.crt", content: "cert content" },
          { path: "deploy/id_rsa", content: "ssh key" },
        ]);

        const diff = await env.stageFiles();
        const result = env.securityService.analyzeSecurity({
          files: [
            {
              path: "certs/server.key",
              additions: 1,
              deletions: 0,
              isTest: false,
              isConfig: true,
            },
            {
              path: "certs/server.crt",
              additions: 1,
              deletions: 0,
              isTest: false,
              isConfig: true,
            },
            {
              path: "deploy/id_rsa",
              additions: 1,
              deletions: 0,
              isTest: false,
              isConfig: true,
            },
          ],
          diff,
        });

        expect(result.fileFindings).toHaveLength(3);
        expect(result.fileFindings.every((f) => f.severity === "high")).toBe(
          true,
        );
      });
    });

    describe("Ignore Patterns", () => {
      it("should ignore files matching patterns", async () => {
        const customConfig: Config = {
          ...env.config,
          git: {
            ...env.config.git,
            ignorePatterns: ["build/*", "**/*.test.ts"],
          },
        };

        const customEnv = await setupTestEnvironment(customConfig);

        await customEnv.createFiles([
          {
            path: "src/config.js",
            content: 'const key = "sk_live_abcdefghijklmnopqrstuvwx";',
          },
          {
            path: "build/output.js",
            content: 'const key = "sk_live_zyxwvutsrqponmlkjihgfed";',
          },
          {
            path: "src/service.test.ts",
            content: 'const key = "sk_live_testabcdefghijklmnopqrst";',
          },
        ]);

        const diff = await customEnv.stageFiles();

        const result = customEnv.securityService.analyzeSecurity({
          files: [
            {
              path: "src/config.js",
              additions: 1,
              deletions: 0,
              isTest: false,
              isConfig: false,
            },
            {
              path: "build/output.js",
              additions: 1,
              deletions: 0,
              isTest: false,
              isConfig: false,
            },
            {
              path: "src/service.test.ts",
              additions: 1,
              deletions: 0,
              isTest: true,
              isConfig: false,
            },
          ],
          diff,
        });

        expect(result.secretFindings).toHaveLength(1);
        expect(result.secretFindings[0].path).toBe("src/config.js");
        expect(
          result.secretFindings.some((f) => f.path.startsWith("build/")),
        ).toBe(false);
        expect(
          result.secretFindings.some((f) => f.path.endsWith(".test.ts")),
        ).toBe(false);
      });
    });

    describe("Custom Patterns", () => {
      it("should detect secrets matching custom patterns", async () => {
        const customEnv = await setupTestEnvironment({
          security: {
            ...env.config.security,
            rules: {
              ...env.config.security.rules,
              secrets: {
                enabled: true,
                severity: "high",
                patterns: ["CUSTOM_SECRET_[A-Z0-9]{32}", "INTERNAL_KEY_\\d{6}"],
              },
            },
          },
        });

        await customEnv.createFiles([
          {
            path: "config.js",
            content: `
              const secrets = {
                key1: "CUSTOM_SECRET_12345678901234567890123456789012",
                key2: "INTERNAL_KEY_123456"
              };
            `,
          },
        ]);

        const diff = await customEnv.stageFiles();
        const result = customEnv.securityService.analyzeSecurity({
          files: [
            {
              path: "config.js",
              additions: 5,
              deletions: 0,
              isTest: false,
              isConfig: true,
            },
          ],
          diff,
        });

        expect(result.secretFindings).toHaveLength(2);
        expect(result.secretFindings.every((f) => f.severity === "high")).toBe(
          true,
        );
      });
    });
  });
});
