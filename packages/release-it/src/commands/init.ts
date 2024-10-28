// packages/release-it/src/commands/init.ts
import { Command } from 'commander';
import { InitService } from '../core/init';
import { Logger } from '../utils/logger';

export const initCommand = new Command()
  .name('init')
  .description('Initialize release configuration')
  .argument('[packages...]', 'Package names to initialize')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (packages: string[], options) => {
    const logger = new Logger();
    try {
      const initService = new InitService(logger);
      await initService.initialize(packages, options);
    } catch (error) {
      logger.error('Initialization failed:', error);
      process.exit(1);
    }
  });
