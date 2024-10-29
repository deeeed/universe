import { Logger } from "../utils/logger";
import { PackageManagerService } from "./package-manager";

interface IntegrityIssue {
  message: string;
  solution?: string;
  severity: "error" | "warning";
}

interface IntegrityResult {
  isValid: boolean;
  issues: IntegrityIssue[];
}

export class WorkspaceIntegrityService {
  constructor(
    private packageManager: PackageManagerService,
    private logger: Logger,
  ) {}

  async check(): Promise<boolean> {
    const result = await this.checkWithDetails(false);
    return result.isValid;
  }

  async checkWithDetails(verbose: boolean = false): Promise<IntegrityResult> {
    const issues: IntegrityIssue[] = [];

    try {
      if (verbose) {
        this.logger.info("Running dependency checks...");
      }

      const integrityCheck =
        await this.packageManager.checkWorkspaceIntegrity();

      if (!integrityCheck) {
        issues.push({
          message: "Workspace dependencies are out of sync",
          solution: "Run 'yarn install' to sync dependencies",
          severity: "error",
        });
      }

      // Additional checks can be added here

      return {
        isValid: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push({
        message: error instanceof Error ? error.message : String(error),
        severity: "error",
      });
      return { isValid: false, issues };
    }
  }

  async fix(): Promise<boolean> {
    try {
      await this.packageManager.install();
      const checkResult = await this.check();
      return checkResult;
    } catch {
      return false;
    }
  }
}
