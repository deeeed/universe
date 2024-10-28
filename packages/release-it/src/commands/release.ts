// packages/release-it/src/commands/release.ts
import { Command } from 'commander';
import { ReleaseService } from '../core/release';
import { loadConfig } from '../core/config';
import { Logger } from '../utils/logger';

export const releaseCommand = new Command()
  .name('release')
  .description('Release one or more packages')
  .argument('[packages...]', 'Package names to release')
  .option('-a, --all', 'Release all packages with changes')
  .option('-d, --dry-run', 'Show what would be done without actually doing it')
  .option('-v, --version <version>', 'Specify version explicitly')
  .option('--no-git-push', 'Skip git push')
  .option('--no-npm-publish', 'Skip npm publish')
  .action(async (packages: string[], options) => {
    const logger = new Logger();
    try {
      const config = await loadConfig();
      const releaseService = new ReleaseService(config, logger);

      if (options.all) {
        await releaseService.releaseAll(options);
      } else if (packages.length > 0) {
        await releaseService.releasePackages(packages, options);
      } else {
        logger.error('Please specify packages to release or use --all flag');
        process.exit(1);
      }
    } catch (error) {
      logger.error('Release failed:', error);
      process.exit(1);
    }
  });
