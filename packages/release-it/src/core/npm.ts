import type { ExecaReturnValue } from 'execa';
import type { NpmConfig, PackageContext } from '../types/config';

export class NpmService {
  constructor(private readonly config: NpmConfig) {}

  private getEffectiveConfig(providedConfig?: { npm: NpmConfig }): NpmConfig {
    return providedConfig?.npm ?? this.config;
  }

  async validateAuth(config?: { npm: NpmConfig }): Promise<void> {
    const effectiveConfig = this.getEffectiveConfig(config);
    try {
      const execa = (await import('execa')).default;
      const result: ExecaReturnValue<string | Buffer> = await execa('npm', ['whoami', '--registry', effectiveConfig.registry]);

      // Use `.toString().trim()` to handle Buffer or string output
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
      
      return result.stdout.toString().trim();  // Ensure consistent string output
    } catch {
      return '0.0.0';
    }
  }
}
