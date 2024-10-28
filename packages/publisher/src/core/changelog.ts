import conventionalChangelog from 'conventional-changelog';
import { promises as fs } from 'fs';
import path from 'path';
import * as semver from 'semver';
import type { Transform } from 'stream';
import type { PackageContext, ReleaseConfig } from '../types/config';
import { Logger } from '../utils/logger';

export class ChangelogService {
  private static readonly VERSION_REGEX = /^\[([\d.]+(?:-[a-zA-Z0-9.]+)?)\] - (\d{4}-\d{2}-\d{2})$/;

  constructor(private logger: Logger = new Logger()) {}

  async generate(context: PackageContext, _config: ReleaseConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      let changelog = '';

      const stream = conventionalChangelog({
        preset: 'angular',
        pkg: {
          path: path.join(context.path, 'package.json')
        }
      }) as Transform;

      stream
        .on('data', (chunk: Buffer) => {
          changelog += chunk.toString('utf-8');
        })
        .on('error', (err: Error) => {
          reject(err);
        })
        .on('end', () => {
          resolve(changelog.trim());
        });
    });
  }

  async update(
    context: PackageContext,
    newContent: string,
    config: ReleaseConfig
  ): Promise<void> {
    const changelogPath = path.join(context.path, config.changelogFile || 'CHANGELOG.md');
    let currentContent = '';

    try {
      currentContent = await fs.readFile(changelogPath, 'utf-8');
    } catch (error) {
      // File doesn't exist yet
      currentContent = '# Changelog\n\n';
    }

    const versionHeader = `\n## [${context.newVersion}]`;
    const dateStr = new Date().toISOString().split('T')[0];
    const newEntry = `${versionHeader} - ${dateStr}\n\n${newContent}`;

    // Update the content
    const updatedContent = this.insertNewEntry(currentContent, newEntry);

    // Update the comparison links
    const finalContent = this.updateComparisonLinks(
      updatedContent,
      context,
      config
    );

    await fs.writeFile(changelogPath, finalContent);
  }

  async validate(context: PackageContext, config: ReleaseConfig): Promise<void> {
    const changelogPath = path.join(context.path, config.changelogFile || 'CHANGELOG.md');

    try {
      // Check file exists
      const exists = await fs.access(changelogPath)
        .then(() => true)
        .catch(() => false);
      
      if (!exists) {
        throw new Error('Changelog file not found');
      }

      // Read file content
      const content = await fs.readFile(changelogPath, 'utf8');
      
      // Basic validation
      if (!content.includes('# Changelog')) {
        throw new Error('Invalid changelog format: missing header');
      }

      if (!content.includes('## [Unreleased]')) {
        throw new Error('Invalid changelog format: missing Unreleased section');
      }

      // Validate version entries
      const sections = content.split(/^## /m).slice(1); // Skip header
      const versions: string[] = [];

      for (const section of sections) {
        const lines = section.split('\n');
        const firstLine = lines[0].trim();
        
        if (firstLine.toLowerCase() !== '[unreleased]') {
          const match = firstLine.match(ChangelogService.VERSION_REGEX);
          if (!match) {
            throw new Error('Invalid version header format');
          }
          const [, version, dateStr] = match;
          
          // Validate date format
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            throw new Error(`Invalid date format for version ${version}: ${dateStr}`);
          }

          versions.push(version);
        }
      }

      // Validate version ordering
      for (let i = 0; i < versions.length - 1; i++) {
        if (!semver.gt(versions[i], versions[i + 1])) {
          throw new Error(
            `Version ordering error: ${versions[i]} should be greater than ${versions[i + 1]}`
          );
        }
      }

      this.logger.success('Changelog validation: OK');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Changelog validation failed: ${errorMessage}`);
      throw error;
    }
  }

  private insertNewEntry(currentContent: string, newEntry: string): string {
    const unreleasedMatch = currentContent.match(/## \[Unreleased\]/i);

    if (unreleasedMatch) {
      // Insert after the Unreleased section
      const parts = currentContent.split(/## \[Unreleased\]/i);
      return `${parts[0]}## [Unreleased]\n\n${newEntry}\n\n${parts[1]}`;
    }

    // No Unreleased section, insert at the top after the header
    const parts = currentContent.split('\n');
    const headerEnd = parts.findIndex(line => line.startsWith('# ')) + 1;
    return [
      ...parts.slice(0, headerEnd),
      '',
      '## [Unreleased]',
      '',
      newEntry,
      '',
      ...parts.slice(headerEnd)
    ].join('\n');
  }

  private updateComparisonLinks(
    content: string,
    context: PackageContext,
    config: ReleaseConfig
  ): string {
    const tagPrefix = config.git.tagPrefix || 'v';
    const repoUrl = 'https://github.com/deeeed/universe';

    const links = [
      `[unreleased]: ${repoUrl}/compare/${tagPrefix}${context.newVersion}...HEAD`,
      `[${context.newVersion}]: ${repoUrl}/compare/${tagPrefix}${context.currentVersion}...${tagPrefix}${context.newVersion}`
    ];

    // Replace or append links
    const linksSection = content.match(/\[unreleased\]: .+$/m);
    if (linksSection) {
      return content.replace(/\[.+\]: .+$/gm, '') + '\n' + links.join('\n');
    }

    return content + '\n\n' + links.join('\n');
  }
}
