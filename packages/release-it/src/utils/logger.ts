/* eslint-disable no-console */
import chalk from 'chalk';

export class Logger {
  info(message: string, ...args: unknown[]): void {
    console.log(chalk.blue('ℹ'), message, ...args);
  }

  success(message: string, ...args: unknown[]): void {
    console.log(chalk.green('✔'), message, ...args);
  }

  warning(message: string, ...args: unknown[]): void {
    console.log(chalk.yellow('⚠'), message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(chalk.red('✖'), message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🐛'), message, ...args);
    }
  }

  newLine(): void {
    console.log();
  }

  table(data: Record<string, unknown>[]): void {
    console.table(data);
  }
}
