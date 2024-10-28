/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import inquirer from 'inquirer';
import type { BumpType } from '../types/config';
import { Logger } from './logger';

interface VersionBumpResponse {
  bumpType: BumpType;
}

interface CustomVersionResponse {
  version: string;
}

interface ConfirmResponse {
  confirm: boolean;
}

interface PackagesResponse {
  packages: string[];
}

export class Prompts {
  constructor(private logger: Logger) {}

  async getVersionBump(): Promise<BumpType> {
    const { bumpType }: VersionBumpResponse = await inquirer.prompt([
      {
        type: 'list',
        name: 'bumpType',
        message: 'Select version bump type:',
        choices: [
          { name: 'Patch (Bug fixes) 1.0.x', value: 'patch' },
          { name: 'Minor (New features) 1.x.0', value: 'minor' },
          { name: 'Major (Breaking changes) x.0.0', value: 'major' },
          { name: 'Custom version', value: 'custom' },
        ],
      },
    ]);

    if (bumpType === 'custom') {
      const { version }: CustomVersionResponse = await inquirer.prompt([
        {
          type: 'input',
          name: 'version',
          message: 'Enter custom version:',
          validate: (input: string): boolean | string  => {
            if (/^\d+\.\d+\.\d+(-\w+(\.\d+)?)?$/.test(input)) {
              return true;
            }
            return 'Please enter a valid semver version (e.g., 1.2.3 or 1.2.3-beta.1)';
          },
        },
      ]);
      return version as BumpType; // return a string here to cover custom versions
    }

    return bumpType;
  }

  async confirmRelease(): Promise<boolean> {
    const { confirm }: ConfirmResponse = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to proceed with the release?',
        default: false,
      },
    ]);

    return confirm;
  }

  async selectPackages(availablePackages: string[]): Promise<string[]> {
    const { packages }: PackagesResponse = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'packages',
        message: 'Select packages to release:',
        choices: availablePackages,
        validate: (answer: string[]): boolean | string  => {
          if (answer.length < 1) {
            return 'You must choose at least one package.';
          }
          return true;
        },
      },
    ]);

    return packages;
  }

  async confirmWorkingDirectory(): Promise<boolean> {
    this.logger.warning('You have uncommitted changes in your working directory.');

    const { confirm }: ConfirmResponse = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Do you want to proceed anyway?',
        default: false,
      },
    ]);

    return confirm;
  }
}
