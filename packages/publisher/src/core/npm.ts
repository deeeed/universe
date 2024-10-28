import type { ExecaReturnValue } from 'execa';
import type { NpmConfig, PackageContext } from '../types/config';
import { PackageManagerService } from './package-manager';

export class NpmService implements PackageManagerService {
  constructor(private readonly config: NpmConfig) {}

  private getEffectiveConfig(providedConfig?: { npm: NpmConfig }): NpmConfig {
    return providedConfig?.npm ?? this.config;
  }

  async validateAuth(config?: { npm: NpmConfig }): Promise<void> {
    const effectiveConfig = this.getEffectiveConfig(config);
    try {
      const execa = (await import('execa')).default;
      const result: ExecaReturnValue<string | Buffer> = await execa('npm', ['whoami', '--registry', effectiveConfig.registry]);

      const output = result.stdout.toString().trim();
      if (!output) {
        throw new Error('Not authenticated to npm registry');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`npm authentication failed: ${error.message}`);
      }
      throw new Error('npm authentication failed: Unknown error occurred');
    }
  }

  async publish(context: PackageContext, config?: { npm: NpmConfig }): Promise<{ published: boolean; registry: string }> {
    const effectiveConfig = this.getEffectiveConfig(config);
    const publishArgs = [
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
      await execa('npm', publishArgs, { cwd: context.path });

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
      const result: ExecaReturnValue<string | Buffer> = await execa('npm', [
        'view',
        packageName,
        'version',
        '--registry',
        effectiveConfig.registry
      ]);
      
      return result.stdout.toString().trim();
    } catch {
      return '0.0.0';
    }
  }

  async checkWorkspaceIntegrity(): Promise<boolean> {
    try {
      const execa = (await import('execa')).default;
      await execa('npm', ['install', '--dry-run']);
      return true;
    } catch {
      return false;
    }
  }

  async updateDependencies(context: PackageContext, dependencies: string[]): Promise<void> {
    try {
      const execa = (await import('execa')).default;
      await execa('npm', ['install', ...dependencies], {
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
      const result: ExecaReturnValue<string | Buffer> = await execa('npm', ['pack'], {
        cwd: context.path
      });
      
      return result.stdout.toString().trim();
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
      await execa('npm', ['run', script], {
        cwd: context.path
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to run script ${script}: ${error.message}`);
      }
      throw new Error(`Failed to run script ${script}: Unknown error occurred`);
    }
  }
}
