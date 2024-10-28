import { promises as fs } from 'fs';
import path from 'path';
import conventionalChangelog from 'conventional-changelog';
import type { Transform } from 'stream';
import type { PackageContext, ReleaseConfig } from '../types/config';

export class ChangelogService {
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
