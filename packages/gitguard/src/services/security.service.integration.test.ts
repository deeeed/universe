import {
  defaultConfig,
  setupBaseTestEnvironment,
} from "../test/test-integration.utils.js";
import { Config } from "../types/config.types.js";
import { SecurityService } from "./security.service.js";

interface SecurityTestEnvironment {
  tempDir: string;
  securityService: SecurityService;
  createFiles: (
    files: Array<{ path: string; content: string }>,
  ) => Promise<void>;
  stageFiles: () => Promise<string>;
  cleanup: () => Promise<void>;
}

const TEST_FILES = {
  secrets: {
    stripe: {
      path: "app.js",
      content: 'const key = "sk_live_abcdefghijklmnopqrstuvwx";',
    },
    aws: {
      path: "config.js",
      content: `
        const config = {
          aws_secret: "abcdefghijklmnopqrstuvwxyz1234567890ABCD",
          accessKeyId: "AKIAIOSFODNN7EXAMPLE"
        };
      `,
    },
    privateKey: {
      path: "deploy/keys.ts",
      content: `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdefghijklmnopqrstuvwxyz
ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnop
QRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdef
-----END RSA PRIVATE KEY-----`,
    },
  },
  sensitive: {
    env: {
      path: ".env",
      content: "SECRET_KEY=test",
    },
    envProd: {
      path: ".env.production",
      content: "PROD_KEY=test",
    },
    serverKey: {
      path: "certs/server.key",
      content: "key content",
    },
    serverCert: {
      path: "certs/server.crt",
      content: "cert content",
    },
    sshKey: {
      path: "deploy/id_rsa",
      content: "ssh key",
    },
  },
} as const;

describe("SecurityService Integration Tests", () => {
  let env: SecurityTestEnvironment;

  async function setupSecurityTestEnvironment(
    customConfig?: Partial<Config>,
  ): Promise<SecurityTestEnvironment> {
    const baseEnv = await setupBaseTestEnvironment(customConfig);

    const securityService = new SecurityService({
      config: baseEnv.config,
      logger: baseEnv.logger,
    });

    return {
      tempDir: baseEnv.tempDir,
      securityService,
      createFiles: baseEnv.createFiles,
      stageFiles: baseEnv.stageFiles,
      cleanup: baseEnv.cleanup,
    };
  }

  beforeEach(async () => {
    env = await setupSecurityTestEnvironment();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe("analyzeSecurity", () => {
    describe("Secret Detection", () => {
      it.each([
        {
          name: "should detect Stripe API key",
          file: TEST_FILES.secrets.stripe,
          expectedFindings: {
            count: 1,
            type: "secret",
            severity: "high",
            shouldBlock: true,
          },
        },
        {
          name: "should detect AWS credentials",
          file: TEST_FILES.secrets.aws,
          expectedFindings: {
            count: 2,
            matches: ["AKIA"],
            suggestions: ["AWS Secret Access Key"],
          },
        },
        {
          name: "should detect private keys",
          file: TEST_FILES.secrets.privateKey,
          expectedFindings: {
            count: 1,
            type: "secret",
            suggestion: "Private Key",
          },
        },
      ])("$name", async ({ file, expectedFindings }) => {
        await env.createFiles([file]);
        const diff = await env.stageFiles();

        const result = env.securityService.analyzeSecurity({
          files: [
            {
              path: file.path,
              additions: file.content.split("\n").length,
              deletions: 0,
              isTest: false,
              isConfig: false,
            },
          ],
          diff,
        });

        expect(result.secretFindings).toHaveLength(expectedFindings.count);

        if (expectedFindings.type) {
          expect(result.secretFindings[0].type).toBe(expectedFindings.type);
        }
        if (expectedFindings.severity) {
          expect(result.secretFindings[0].severity).toBe(
            expectedFindings.severity,
          );
        }
        if (expectedFindings.shouldBlock !== undefined) {
          expect(result.shouldBlock).toBe(expectedFindings.shouldBlock);
        }
        if (expectedFindings.matches) {
          expectedFindings.matches.forEach((match) => {
            expect(
              result.secretFindings.some((f) => f.match?.includes(match)),
            ).toBe(true);
          });
        }
        if (expectedFindings.suggestions) {
          expectedFindings.suggestions.forEach((suggestion) => {
            expect(
              result.secretFindings.some((f) =>
                f.suggestion.includes(suggestion),
              ),
            ).toBe(true);
          });
        }
      });
    });

    describe("Problematic File Detection", () => {
      it("should detect sensitive files", async () => {
        const files = Object.values(TEST_FILES.sensitive);
        await env.createFiles(files);
        const diff = await env.stageFiles();

        const result = env.securityService.analyzeSecurity({
          files: files.map((file) => ({
            path: file.path,
            additions: 1,
            deletions: 0,
            isTest: false,
            isConfig: true,
          })),
          diff,
        });

        expect(result.fileFindings).toHaveLength(files.length);
        expect(
          result.fileFindings.every((f) => f.type === "sensitive_file"),
        ).toBe(true);
        expect(result.fileFindings.every((f) => f.severity === "high")).toBe(
          true,
        );
      });
    });

    describe("Ignore Patterns", () => {
      it("should respect ignore patterns", async () => {
        const customConfig: Config = {
          ...defaultConfig,
          git: {
            ...defaultConfig.git,
            ignorePatterns: ["build/*", "**/*.test.ts"] as string[],
          },
        };

        const testFiles = [
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
        ];

        const customEnv = await setupSecurityTestEnvironment(customConfig);

        try {
          await customEnv.createFiles(testFiles);
          const diff = await customEnv.stageFiles();

          const result = customEnv.securityService.analyzeSecurity({
            files: testFiles.map((file) => ({
              path: file.path,
              additions: 1,
              deletions: 0,
              isTest: file.path.endsWith(".test.ts"),
              isConfig: false,
            })),
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
        } finally {
          await customEnv.cleanup();
        }
      });
    });

    describe("Custom Patterns", () => {
      it("should detect secrets matching custom patterns", async () => {
        const customConfig: Config = {
          ...defaultConfig,
          security: {
            ...defaultConfig.security,
            rules: {
              ...defaultConfig.security.rules,
              secrets: {
                enabled: true,
                severity: "high",
                patterns: ["CUSTOM_SECRET_[A-Z0-9]{32}", "INTERNAL_KEY_\\d{6}"],
              },
            },
          },
        };

        const customEnv = await setupSecurityTestEnvironment(customConfig);

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

        await customEnv.cleanup();
      });
    });
  });
});
