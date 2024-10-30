/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import inquirer from "inquirer";
import type { BumpType, PackageContext } from "../types/config";
import { Logger } from "./logger";
import { VersionService } from "../core/version";

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

  async getVersionBump(
    context: PackageContext,
    versionService: VersionService,
  ): Promise<BumpType> {
    // Calculate all possible versions
    const currentVersion = context.currentVersion;
    const options = [
      {
        type: "patch" as const,
        label: "Patch",
        version: versionService.determineVersion(context, "patch"),
        description: "Bug fixes",
      },
      {
        type: "minor" as const,
        label: "Minor",
        version: versionService.determineVersion(context, "minor"),
        description: "New features",
      },
      {
        type: "major" as const,
        label: "Major",
        version: versionService.determineVersion(context, "major"),
        description: "Breaking changes",
      },
    ];

    const choices = [
      ...options.map((opt) => ({
        name: `${opt.label} (${opt.description}) ${currentVersion} → ${opt.version}`,
        value: opt.type,
      })),
      { name: "Custom version", value: "custom" as const },
    ];

    const { bumpType }: VersionBumpResponse = await inquirer.prompt([
      {
        type: "list",
        name: "bumpType",
        message: "Select version bump type:",
        choices,
      },
    ]);

    if (bumpType === "custom") {
      const { version }: CustomVersionResponse = await inquirer.prompt([
        {
          type: "input",
          name: "version",
          message: "Enter custom version:",
          validate: (input: string): boolean | string => {
            if (/^\d+\.\d+\.\d+(-\w+(\.\d+)?)?$/.test(input)) {
              return true;
            }
            return "Please enter a valid semver version (e.g., 1.2.3 or 1.2.3-beta.1)";
          },
        },
      ]);
      return version as BumpType;
    }

    return bumpType;
  }

  async confirmRelease(): Promise<boolean> {
    const { confirm }: ConfirmResponse = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Are you sure you want to proceed with the release?",
        default: false,
      },
    ]);

    return confirm;
  }

  async selectPackages(availablePackages: string[]): Promise<string[]> {
    const { packages }: PackagesResponse = await inquirer.prompt([
      {
        type: "checkbox",
        name: "packages",
        message: "Select packages to release:",
        choices: availablePackages,
        validate: (answer: string[]): boolean | string => {
          if (answer.length < 1) {
            return "You must choose at least one package.";
          }
          return true;
        },
      },
    ]);

    return packages;
  }

  async confirmWorkingDirectory(): Promise<boolean> {
    this.logger.warning(
      "You have uncommitted changes in your working directory.",
    );

    const { confirm }: ConfirmResponse = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Do you want to proceed anyway?",
        default: false,
      },
    ]);

    return confirm;
  }

  async confirmChangelogCreation(packageName: string): Promise<boolean> {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: "confirm",
        name: "confirm",
        message: `No changelog found for ${packageName}. Would you like to create one?`,
        default: true,
      },
    ]);
    return confirm;
  }

  async confirmTagOverwrite(
    packageName: string,
    version: string,
  ): Promise<boolean> {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: "confirm",
        name: "confirm",
        message: `Tag ${packageName}@${version} already exists. Would you like to overwrite it?`,
        default: false,
      },
    ]);

    return confirm;
  }

  async confirmChangelogContent(preview: string): Promise<boolean> {
    this.logger.info("\nProposed changelog entries:");
    this.logger.info("----------------------------------------");
    this.logger.info(preview);
    this.logger.info("----------------------------------------\n");

    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: "confirm",
        name: "confirmed",
        message:
          "Would you like to use these changelog entries? (No will open editor for manual entry)",
        default: true,
      },
    ]);
    return confirmed;
  }

  async getManualChangelogEntry(currentChanges?: string): Promise<string> {
    const { content } = await inquirer.prompt<{ content: string }>([
      {
        type: "editor",
        name: "content",
        message: "Enter changelog content (opens in your default editor):",
        default: currentChanges || `### Added\n\n### Changed\n\n### Fixed\n`,
        postfix: ".md",
        validate: (input: string): boolean | string => {
          if (input.trim().length === 0) {
            return "Changelog content cannot be empty";
          }
          if (!input.includes("###")) {
            return "Changelog must contain at least one section (e.g., ### Added)";
          }
          return true;
        },
      },
    ]);
    return content;
  }

  async confirmDependencyUpdates(
    packageName: string,
    dependencies: Array<{
      name: string;
      currentVersion: string;
      newVersion: string;
    }>,
  ): Promise<boolean> {
    if (dependencies.length === 0) {
      return false;
    }

    this.logger.info("\nDependency updates available for", packageName);
    this.logger.info("----------------------------------------");

    for (const dep of dependencies) {
      this.logger.info(
        `${dep.name}: ${dep.currentVersion} → ${dep.newVersion}`,
      );
    }

    this.logger.info("----------------------------------------\n");

    const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
      {
        type: "confirm",
        name: "confirmed",
        message: "Would you like to update these dependencies?",
        default: false,
      },
    ]);

    return confirmed;
  }
}
