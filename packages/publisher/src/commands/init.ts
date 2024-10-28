import { Command } from 'commander';
import { InitService } from '../core/init';
import { Logger } from '../utils/logger';

interface InitOptions {
  force?: boolean;
}

export const initCommand = new Command()
  .name('init')
  .description('Initialize release configuration')
  .argument('[packages...]', 'Package names to initialize')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (packages: string[], commandOptions: InitOptions) => {
    const logger = new Logger();
    try {
      const initService = new InitService(logger);
      
      // Extract only the options we care about
      const options: { force?: boolean } = {
        force: commandOptions.force
      };
      
      await initService.initialize(packages, options);
    } catch (error) {
      logger.error('Initialization failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
