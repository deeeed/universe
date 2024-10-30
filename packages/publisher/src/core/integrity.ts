import { PackageManagerService } from "./package-manager";
import { Logger } from "../utils/logger";
import type {
  DependencyUpdate,
  DependencyValidationReport,
} from "../types/config";

export class WorkspaceIntegrityService {
  constructor(
    private packageManager: PackageManagerService,
    private logger: Logger,
  ) {}

  async check(): Promise<boolean> {
    const result = await this.checkWithDetails(false);
    return result.isValid;
  }

  async checkWithDetails(
    verbose: boolean = false,
  ): Promise<DependencyValidationReport> {
    const issues: Array<{
      message: string;
      solution?: string;
      severity: "error" | "warning";
    }> = [];
    const updates: DependencyUpdate[] = [];

    try {
      if (verbose) {
        this.logger.info("Starting workspace dependency check...");
      }

      const startTime = performance.now();

      // Check basic workspace integrity
      const integrityCheck =
        await this.packageManager.checkWorkspaceIntegrity();

      if (!integrityCheck) {
        issues.push({
          message: "Workspace dependencies are out of sync",
          solution: "Run 'yarn install' or 'npm install' to sync dependencies",
          severity: "error",
        });
      }

      // Get dependency updates
      const dependencyUpdates =
        await this.packageManager.getDependencyUpdates();
      updates.push(...dependencyUpdates);

      // Analyze updates and create warnings
      for (const update of updates) {
        if (update.updateAvailable) {
          const message = update.isWorkspaceDependency
            ? `Workspace dependency ${update.name} can be updated from ${update.currentVersion} to ${update.latestVersion}`
            : `External dependency ${update.name} can be updated from ${update.currentVersion} to ${update.latestVersion}`;

          issues.push({
            message,
            solution: `Run 'yarn up ${update.name}' to update this dependency`,
            severity: "warning",
          });
        }
      }

      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      if (verbose) {
        this.logger.info(`Dependency check completed in ${duration}s`);
      }

      // Calculate summary
      const summary = {
        total: updates.length,
        outdated: updates.filter((u) => u.updateAvailable).length,
        workspaceUpdates: updates.filter(
          (u) => u.isWorkspaceDependency && u.updateAvailable,
        ).length,
        externalUpdates: updates.filter(
          (u) => !u.isWorkspaceDependency && u.updateAvailable,
        ).length,
      };

      return {
        isValid: issues.filter((i) => i.severity === "error").length === 0,
        issues,
        updates,
        summary,
      };
    } catch (error) {
      issues.push({
        message: error instanceof Error ? error.message : String(error),
        severity: "error",
      });
      return {
        isValid: false,
        issues,
        updates: [],
        summary: {
          total: 0,
          outdated: 0,
          workspaceUpdates: 0,
          externalUpdates: 0,
        },
      };
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
