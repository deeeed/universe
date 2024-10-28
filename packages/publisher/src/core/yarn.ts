import type { ExecaReturnValue } from 'execa';
import type { NpmConfig, PackageContext } from '../types/config';
import { PackageManagerService } from './package-manager';

interface YarnInfoResponse {
  data?: string;
  version?: string;
  filename?: string;
}

export class YarnService implements PackageManagerService {
  constructor(private readonly config: NpmConfig) {}

  async validateAuth(config?: { npm: NpmConfig }): Promise<void> {
    const effectiveConfig = this.getEffectiveConfig(config);
    try {
      const execa = (await import('execa')).default;
      const result: ExecaReturnValue<string> = await execa('yarn', ['npm', 'whoami', '--registry', effectiveConfig.registry]);

      if (!result.stdout || result.stdout.toString().trim() === '') {
        throw new Error('Not authenticated to npm registry');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`yarn npm authentication failed: ${error.message}`);
      }
      throw new Error('yarn npm authentication failed: Unknown error occurred');
    }
  }

  async publish(context: PackageContext, config?: { npm: NpmConfig }): Promise<{ published: boolean; registry: string }> {
    const effectiveConfig = this.getEffectiveConfig(config);
    const publishArgs = [
      'npm',
      'publish',
      '--registry', effectiveConfig.registry,
      '--tag', effectiveConfig.tag,
      '--access', effectiveConfig.access
    ];

    if (effectiveConfig.otp) {
      publishArgs.push('--otp', effectiveConfig.otp);
    }

    try {
      const execa = (await import('execa')).default;
      await execa('yarn', publishArgs, { cwd: context.path });

      return {
        published: true,
        registry: effectiveConfig.registry
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to publish package: ${error.message}`);
      }
      throw new Error('Failed to publish package: Unknown error occurred');
    }
  }

  async getLatestVersion(packageName: string, config?: { npm: NpmConfig }): Promise<string> {
    const effectiveConfig = this.getEffectiveConfig(config);
    try {
      const execa = (await import('execa')).default;
      const result: ExecaReturnValue<string> = await execa('yarn', [
        'npm',
        'info',
        packageName,
        'version',
        '--registry',
        effectiveConfig.registry,
        '--json'
      ]);
      
      const parsed = this.parseJsonResponse<YarnInfoResponse>(result.stdout);
      return parsed.data ?? '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  async checkWorkspaceIntegrity(): Promise<boolean> {
    try {
      const execa = (await import('execa')).default;
      await execa('yarn', ['install', '--check-cache']);
      return true;
    } catch {
      return false;
    }
  }

  async getWorkspaceVersion(packageName: string): Promise<string> {
    try {
      const execa = (await import('execa')).default;
      const result: ExecaReturnValue<string> = await execa('yarn', [
        'workspaces',
        'info',
        packageName,
        '--json'
      ]);
      
      const parsed = this.parseJsonResponse<YarnInfoResponse>(result.stdout);
      return parsed.version ?? '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  async updateDependencies(context: PackageContext, dependencies: string[]): Promise<void> {
    try {
      const execa = (await import('execa')).default;
      await execa('yarn', ['up', ...dependencies], {
        cwd: context.path
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update dependencies: ${error.message}`);
      }
      throw new Error('Failed to update dependencies: Unknown error occurred');
    }
  }

  async pack(context: PackageContext): Promise<string> {
    try {
      const execa = (await import('execa')).default;
      const result: ExecaReturnValue<string> = await execa('yarn', ['pack', '--json'], {
        cwd: context.path
      });
      
      const parsed = this.parseJsonResponse<YarnInfoResponse>(result.stdout);
      return parsed.filename ?? '';
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to pack package: ${error.message}`);
      }
      throw new Error('Failed to pack package: Unknown error occurred');
    }
  }

  async runScript(context: PackageContext, script: string): Promise<void> {
    try {
      const execa = (await import('execa')).default;
      await execa('yarn', ['run', script], {
        cwd: context.path
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to run script ${script}: ${error.message}`);
      }
      throw new Error(`Failed to run script ${script}: Unknown error occurred`);
    }
  }

  private getEffectiveConfig(providedConfig?: { npm: NpmConfig }): NpmConfig {
    return providedConfig?.npm ?? this.config;
  }

  private parseJsonResponse<T>(stdout: string): T {
    try {
      return JSON.parse(stdout) as T;
    } catch {
      return {} as T;
    }
  }
}
