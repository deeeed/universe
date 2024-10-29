import conventionalChangelog from "conventional-changelog";
import { promises as fs, Stats } from "fs";
import path from "path";
import * as semver from "semver";
import type { Transform } from "stream";
import type { PackageContext, ReleaseConfig } from "../types/config";
import { Logger } from "../utils/logger";

interface ChangelogFormat {
  name: string;
  template: string;
  sectionHeaders: string[];
  versionRegex: RegExp;
  formatVersion: (version: string, date: string) => string;
  formatLinks: (
    versions: { current: string; previous: string },
    config: { repoUrl: string; tagPrefix: string },
  ) => string[];
  parseConventionalContent?: (content: string) => string;
}

const KEEP_A_CHANGELOG_FORMAT: ChangelogFormat = {
  name: "keep-a-changelog",
  template: `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
`,
  sectionHeaders: [
    "### Added",
    "### Changed",
    "### Deprecated",
    "### Removed",
    "### Fixed",
    "### Security",
  ],
  versionRegex: /^\[([\d.]+(?:-[a-zA-Z0-9.]+)?)\] - (\d{4}-\d{2}-\d{2})$/,
  formatVersion: (version: string, date: string) => `## [${version}] - ${date}`,
  formatLinks: (versions, config) => [
    `[unreleased]: ${config.repoUrl}/compare/${config.tagPrefix}${versions.current}...HEAD`,
    `[${versions.current}]: ${config.repoUrl}/compare/${config.tagPrefix}${versions.previous}...${config.tagPrefix}${versions.current}`,
  ],
};

const CONVENTIONAL_CHANGELOG_FORMAT: ChangelogFormat = {
  name: "conventional",
  template: `# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
`,
  sectionHeaders: [],
  versionRegex: /^\[([\d.]+(?:-[a-zA-Z0-9.]+)?)\]$/,
  formatVersion: (version: string) => `## [${version}]`,
  formatLinks: (versions, config) => [
    `[unreleased]: ${config.repoUrl}/compare/${config.tagPrefix}${versions.current}...HEAD`,
    `[${versions.current}]: ${config.repoUrl}/compare/${config.tagPrefix}${versions.previous}...${config.tagPrefix}${versions.current}`,
  ],
  parseConventionalContent: (content: string): string => {
    // Convert conventional-changelog format to keep-a-changelog sections
    const sections: Record<string, string[]> = {
      Added: [],
      Changed: [],
      Deprecated: [],
      Removed: [],
      Fixed: [],
      Security: [],
    };

    // Parse conventional commits and map to Keep a Changelog sections
    const lines = content.split("\n");

    for (const line of lines) {
      if (line.startsWith("* ")) {
        const commit = line.substring(2);
        if (commit.startsWith("feat")) {
          sections.Added.push(commit.replace(/^feat(\([^)]+\))?:/, "").trim());
        } else if (commit.startsWith("fix")) {
          sections.Fixed.push(commit.replace(/^fix(\([^)]+\))?:/, "").trim());
        } else if (commit.startsWith("chore")) {
          sections.Changed.push(
            commit.replace(/^chore(\([^)]+\))?:/, "").trim(),
          );
        } else if (commit.startsWith("refactor")) {
          sections.Changed.push(
            commit.replace(/^refactor(\([^)]+\))?:/, "").trim(),
          );
        } else if (commit.startsWith("docs")) {
          sections.Changed.push(
            commit.replace(/^docs(\([^)]+\))?:/, "").trim(),
          );
        } else if (commit.startsWith("deprecated")) {
          sections.Deprecated.push(
            commit.replace(/^deprecated(\([^)]+\))?:/, "").trim(),
          );
        } else if (commit.startsWith("removed")) {
          sections.Removed.push(
            commit.replace(/^removed(\([^)]+\))?:/, "").trim(),
          );
        } else if (commit.startsWith("security")) {
          sections.Security.push(
            commit.replace(/^security(\([^)]+\))?:/, "").trim(),
          );
        } else {
          sections.Changed.push(commit.trim());
        }
      }
    }

    // Build the final content
    const result: string[] = [];
    for (const [section, items] of Object.entries(sections)) {
      if (items.length > 0) {
        result.push(`### ${section}`);
        items.forEach((item) => result.push(`- ${item}`));
        result.push("");
      }
    }

    return result.join("\n");
  },
};

export class ChangelogService {
  constructor(private logger: Logger = new Logger()) {}

  private getFormat(config: ReleaseConfig): ChangelogFormat {
    return config.changelogFormat === "conventional"
      ? CONVENTIONAL_CHANGELOG_FORMAT
      : KEEP_A_CHANGELOG_FORMAT;
  }

  async generate(
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<string> {
    const format = this.getFormat(config);

    if (config.changelogFormat === "conventional") {
      const conventionalContent =
        await this.generateConventionalChangelog(context);
      return format.parseConventionalContent
        ? format.parseConventionalContent(conventionalContent)
        : conventionalContent;
    }

    // For Keep a Changelog format, return empty sections
    return format.sectionHeaders.join("\n\n") + "\n";
  }

  private async generateConventionalChangelog(
    context: PackageContext,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let changelog = "";

      const stream = conventionalChangelog({
        preset: "angular",
        pkg: {
          path: path.join(context.path, "package.json"),
        },
      }) as Transform;

      stream
        .on("data", (chunk: Buffer) => {
          changelog += chunk.toString("utf-8");
        })
        .on("error", (err: Error) => {
          reject(err);
        })
        .on("end", () => {
          resolve(changelog.trim());
        });
    });
  }

  async update(
    context: PackageContext,
    newContent: string,
    config: ReleaseConfig,
  ): Promise<void> {
    const format = this.getFormat(config);
    const changelogPath = path.join(
      context.path,
      config.changelogFile || "CHANGELOG.md",
    );

    let currentContent: string;
    try {
      currentContent = await fs.readFile(changelogPath, "utf-8");
    } catch (error) {
      currentContent = format.template;
    }

    if (!context.newVersion) {
      throw new Error("New version is required to update changelog");
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const newEntry = format.formatVersion(context.newVersion, dateStr);

    // Update the content
    const updatedContent = this.insertNewEntry(
      currentContent,
      `${newEntry}\n\n${newContent}`,
    );

    // Update the comparison links
    const finalContent = this.updateComparisonLinks(
      updatedContent,
      context,
      config,
      format,
    );

    await fs.writeFile(changelogPath, finalContent);
  }

  async validate(
    context: PackageContext,
    config: ReleaseConfig,
    monorepoRoot: string,
  ): Promise<void> {
    if (!context.path) {
      throw new Error(`Invalid package path for ${context.name}`);
    }

    const format = this.getFormat(config);
    const changelogPath = path.join(
      monorepoRoot,
      context.path,
      config.changelogFile || "CHANGELOG.md",
    );

    this.logger.debug(`Validating changelog at: ${changelogPath}`);

    try {
      // Fix Stats type and isFile check
      let stats: Stats;
      try {
        stats = await fs.stat(changelogPath);
        if (!stats.isFile()) {
          throw new Error(`${changelogPath} exists but is not a file`);
        }
      } catch (error) {
        throw new Error(`Changelog file not found at: ${changelogPath}`);
      }

      // Fix error type casting
      let content: string;
      try {
        content = await fs.readFile(changelogPath, "utf8");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(
          `Failed to read changelog at ${changelogPath}: ${errorMessage}`,
        );
      }

      if (!content || content.trim().length === 0) {
        throw new Error(`Changelog is empty at ${changelogPath}`);
      }

      // Basic validation
      if (!content.includes("# Changelog")) {
        throw new Error(
          `Invalid changelog format in ${context.name}: missing header`,
        );
      }

      if (!content.includes("## [Unreleased]")) {
        throw new Error(
          `Invalid changelog format in ${context.name}: missing Unreleased section`,
        );
      }

      // Format-specific validation
      if (format.name === "keep-a-changelog") {
        if (!content.includes("The format is based on [Keep a Changelog]")) {
          throw new Error(
            `Invalid changelog format in ${context.name}: missing Keep a Changelog reference`,
          );
        }

        // Validate that all required section headers exist in the unreleased section
        const unreleasedSection =
          content.split("## [Unreleased]")[1]?.split("## ")[0] || "";
        for (const header of format.sectionHeaders) {
          if (!unreleasedSection.includes(header)) {
            throw new Error(
              `Invalid changelog format in ${context.name}: missing required section ${header} in Unreleased`,
            );
          }
        }
      }

      // Validate version entries
      this.validateVersionEntries(content, format, context.name);

      this.logger.success(`Changelog validation for ${context.name}: OK`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Changelog validation failed for ${context.name}: ${errorMessage}`,
      );
      throw error;
    }
  }

  private validateVersionEntries(
    content: string,
    format: ChangelogFormat,
    packageName: string,
  ): void {
    const lines = content.split("\n");

    // Validate that there are no malformed headers (###asdf)
    const malformedHeaderRegex = /^#{1,6}[^#\s].*/;
    lines.forEach((line, index) => {
      if (malformedHeaderRegex.test(line)) {
        throw new Error(
          `Invalid header format in ${packageName} at line ${index + 1}: "${line}"`,
        );
      }
    });

    // Validate version headers format
    const versionHeaderRegex = /^## \[.*\](?:\s*-\s*\d{4}-\d{2}-\d{2})?$/;
    lines.forEach((line, index) => {
      if (line.startsWith("## ") && !line.startsWith("## [Unreleased]")) {
        if (!versionHeaderRegex.test(line)) {
          throw new Error(
            `Invalid version header format in ${packageName} at line ${index + 1}: "${line}"`,
          );
        }
      }
    });

    // Extract and validate versions
    const sections = content.split(/^## /m).slice(1);
    const versions: string[] = [];

    for (const section of sections) {
      const sectionLines = section.split("\n");
      const firstLine = sectionLines[0].trim();

      if (firstLine.toLowerCase() !== "[unreleased]") {
        const match = firstLine.match(format.versionRegex);
        if (!match) {
          throw new Error(
            `Invalid version header format in ${packageName}: "${firstLine}"`,
          );
        }

        const [, version, dateStr] = match;

        if (!semver.valid(version)) {
          throw new Error(
            `Invalid semver version in ${packageName}: ${version}`,
          );
        }

        if (format.name === "keep-a-changelog" && !dateStr) {
          throw new Error(
            `Missing date for version ${version} in ${packageName}`,
          );
        }

        versions.push(version);
      }
    }

    // Validate version ordering
    for (let i = 0; i < versions.length - 1; i++) {
      if (!semver.gt(versions[i], versions[i + 1])) {
        throw new Error(
          `Version ordering error in ${packageName}: ${versions[i]} should be greater than ${versions[i + 1]}`,
        );
      }
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
    const parts = currentContent.split("\n");
    const headerEnd = parts.findIndex((line) => line.startsWith("# ")) + 1;
    return [
      ...parts.slice(0, headerEnd),
      "",
      "## [Unreleased]",
      "",
      newEntry,
      "",
      ...parts.slice(headerEnd),
    ].join("\n");
  }

  private updateComparisonLinks(
    content: string,
    context: PackageContext,
    config: ReleaseConfig,
    format: ChangelogFormat,
  ): string {
    const repoUrl = "https://github.com/deeeed/universe";
    const tagPrefix = config.git.tagPrefix || "v";

    const links = format.formatLinks(
      {
        current: context.newVersion ?? "",
        previous: context.currentVersion,
      },
      {
        repoUrl,
        tagPrefix,
      },
    );

    // Replace or append links
    const linksSection = content.match(/\[unreleased\]: .+$/m);
    if (linksSection) {
      return content.replace(/\[.+\]: .+$/gm, "") + "\n" + links.join("\n");
    }

    return content + "\n\n" + links.join("\n");
  }

  async getUnreleasedChanges(
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<string[]> {
    const changelogPath = path.join(
      context.path,
      config.changelogFile || "CHANGELOG.md",
    );
    try {
      const content = await fs.readFile(changelogPath, "utf-8");
      const unreleasedSection = content
        .split("## [Unreleased]")[1]
        ?.split("## ")[0];
      if (!unreleasedSection) return [];

      return unreleasedSection
        .split("\n")
        .filter((line) => line.trim().startsWith("- "))
        .map((line) => line.trim().substring(2));
    } catch {
      return [];
    }
  }
}
