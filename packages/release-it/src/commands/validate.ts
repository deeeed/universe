// packages/release-it/src/commands/validate.ts
import { Command } from 'commander';
import { loadConfig } from '../core/config';
import { Logger } from '../utils/logger';
import { GitService } from '../core/git';
import { NpmService } from '../core/npm';
import { WorkspaceService } from '../core/workspace';

export const validateCommand = new Command()
  .name('validate')
  .description('Validate package(s) release readiness')
  .argument('[packages...]', 'Package names to validate')
  .option('-a, --all', 'Validate all packages')
  .action(async (packages: string[], options) => {
    const logger = new Logger();

    try {
      const config = await loadConfig();
      const workspaceService = new WorkspaceService();
      const gitService = new GitService(config.git);
      const npmService = new NpmService(config.npm);

      // Get packages to validate
      const packagesToValidate = options.all 
        ? await workspaceService.getPackages()
        : await workspaceService.getPackages(packages);

      if (packagesToValidate.length === 0) {
        logger.error('No packages found to validate');
        process.exit(1);
      }

      logger.info('Validating packages...');

      for (const pkg of packagesToValidate) {
        logger.info(`\nValidating ${pkg.name}...`);
        const packageConfig = await workspaceService.getPackageConfig(pkg.name);

        // Git checks
        await gitService.validateStatus(packageConfig).then(() => {
          logger.success('Git status: OK');
        }).catch(error => {
          logger.error(`Git status: ${error.message}`);
          throw error;
        });

        // NPM checks
        if (packageConfig.npm.publish) {
          await npmService.validateAuth(packageConfig).then(() => {
            logger.success('NPM authentication: OK');
          }).catch(error => {
            logger.error(`NPM authentication: ${error.message}`);
            throw error;
          });
        }

        // Package.json validation
        await validatePackageJson(pkg, logger);

        // Changelog validation
        await validateChangelog(pkg, packageConfig, logger);
      }

      logger.success('\nAll validations passed successfully!');
    } catch (error) {
      logger.error('\nValidation failed:', error);
      process.exit(1);
    }
  });

async function validatePackageJson(pkg: { name: string; path: string }, logger: Logger): Promise<void> {
  const requiredFields = ['name', 'version', 'main', 'types', 'files'];
  const missingFields = [];

  for (const field of requiredFields) {
    try {
      const packageJson = require(`${pkg.path}/package.json`);
      if (!packageJson[field]) {
        missingFields.push(field);
      }
    } catch (error) {
      logger.error(`Unable to read package.json for ${pkg.name}`);
      throw error;
    }
  }

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields in package.json: ${missingFields.join(', ')}`);
  }

  logger.success('Package.json validation: OK');
}

async function validateChangelog(
  pkg: { name: string; path: string },
  config: { changelogFile: string },
  logger: Logger
): Promise<void> {
  const fs = require('fs');
  const path = require('path');

  const changelogPath = path.join(pkg.path, config.changelogFile);

  try {
    if (!fs.existsSync(changelogPath)) {
      throw new Error('Changelog file not found');
    }

    const content = fs.readFileSync(changelogPath, 'utf8');
    
    // Basic changelog validation
    if (!content.includes('# Changelog')) {
      throw new Error('Invalid changelog format: missing header');
    }

    if (!content.includes('## [Unreleased]')) {
      throw new Error('Invalid changelog format: missing Unreleased section');
    }

    logger.success('Changelog validation: OK');
  } catch (error) {
    logger.error(`Changelog validation failed: ${error.message}`);
    throw error;
  }
}
