import { promises as fs } from "fs";

interface CheckFileParams {
  path: string;
}

export const FileUtil = {
  async mkdirp(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if ((error as { code?: string }).code !== "EEXIST") {
        throw error;
      }
    }
  },

  isTestFile(params: CheckFileParams): boolean {
    return /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(params.path);
  },

  isConfigFile(params: CheckFileParams): boolean {
    return (
      /\.(json|ya?ml|config\.(js|ts))$/.test(params.path) ||
      params.path.includes("tsconfig") ||
      params.path.includes(".eslintrc") ||
      params.path.includes(".prettierrc")
    );
  },

  isEnvironmentFile(params: CheckFileParams): boolean {
    return /\.env.*/.test(params.path);
  },

  isSecretFile(params: CheckFileParams): boolean {
    return /\.(pem|key|keystore|p12|rsa)$/.test(params.path);
  },

  getFileType(params: CheckFileParams): {
    isTest: boolean;
    isConfig: boolean;
    isSecret: boolean;
    isEnv: boolean;
  } {
    return {
      isTest: this.isTestFile({ path: params.path }),
      isConfig: this.isConfigFile({ path: params.path }),
      isSecret: this.isSecretFile({ path: params.path }),
      isEnv: this.isEnvironmentFile({ path: params.path }),
    };
  },
};
