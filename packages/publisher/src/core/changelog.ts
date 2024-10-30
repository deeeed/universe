import conventionalChangelog from "conventional-changelog";
import { promises as fs } from "fs";
import path from "path";
import semver from "semver";
import type { Transform } from "stream";
import type { PackageContext, ReleaseConfig } from "../types/config";
import { Logger } from "../utils/logger";
import { WorkspaceService } from "./workspace";

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
  versionHeaderPattern: RegExp;
  unreleasedHeaderPattern: RegExp;
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
  versionHeaderPattern:
    /^##\s*\[(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?$/i,
  unreleasedHeaderPattern: /^##\s*\[unreleased\]/i,
};

const CONVENTIONAL_CHANGELOG_FORMAT: ChangelogFormat = {
  name: "conventional",
  template: `# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
`,
  sectionHeaders: [],
  versionRegex: /^\[([\d.]+(?:-[a-zA-Z0-9.]+)?)\]$/,
  formatVersion: (version: string, _date: string) => `## [${version}]`,
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
  versionHeaderPattern: /^##\s*\[(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\]$/i,
  unreleasedHeaderPattern: /^##\s*\[unreleased\]/i,
};

interface ChangelogConfig extends ReleaseConfig {
  fallbackRepoUrl?: string;
}

export class ChangelogService {
  private readonly workspaceService: WorkspaceService;

  constructor(
    private readonly logger: Logger = new Logger(),
    workspaceService?: WorkspaceService,
  ) {
    this.workspaceService = workspaceService ?? new WorkspaceService();
  }

  private getFormat(config: ReleaseConfig): ChangelogFormat {
    if (!config.changelogFormat) {
      throw new Error("Changelog format is not defined in the configuration.");
    }
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
    const changelogPath = path.resolve(
      process.cwd(),
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

    // Generate the new entry
    const dateStr = new Date().toISOString().split("T")[0];
    const versionEntry = format.formatVersion(context.newVersion, dateStr);
    const newEntry = [versionEntry, newContent].join("\n\n");

    // Insert the new entry into the changelog
    const updatedContent = this.insertNewEntry(
      currentContent,
      newEntry,
      context.newVersion,
      config,
    );

    // Update the version comparison links
    const finalContent = await this.updateVersionComparisonLinks(
      updatedContent,
      context,
      config,
    );

    await fs.writeFile(changelogPath, finalContent);
  }

  private insertNewEntry(
    currentContent: string,
    newEntry: string,
    version: string,
    config: ReleaseConfig,
  ): string {
    const format = this.getFormat(config);
    const lines: string[] = currentContent.split("\n");
    const newLines: string[] = [];

    let hasAddedNewEntry = false;
    let isSkippingExistingVersion = false;
    let hasUnreleasedSection = false;

    // Helper function to check if a line is a version header (with or without date)
    const isVersionHeader = (line: string, targetVersion: string): boolean => {
      const withDateMatch = line.match(format.versionHeaderPattern);
      const withoutDateMatch = line.match(
        /^##\s*\[(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\]$/,
      );
      return (
        withDateMatch?.[1] === targetVersion ||
        withoutDateMatch?.[1] === targetVersion
      );
    };

    for (let i = 0; i < lines.length; i++) {
      const line: string = lines[i];
      const trimmedLine = line.trim();

      // Always include header section
      if (i === 0 || /^#\s+Changelog/i.test(trimmedLine)) {
        newLines.push(line);
        continue;
      }

      // Handle Unreleased section
      if (format.unreleasedHeaderPattern.test(trimmedLine)) {
        hasUnreleasedSection = true;
        newLines.push(line);
        // Only add new entry after Unreleased if we haven't already
        if (!hasAddedNewEntry) {
          newLines.push("");
          newLines.push(newEntry.trim());
          newLines.push("");
          hasAddedNewEntry = true;
        }
        continue;
      }

      // Check for existing version entries (both with and without date)
      if (isVersionHeader(trimmedLine, version)) {
        // Skip this version and its content as we're adding it new
        isSkippingExistingVersion = true;
        continue;
      }

      // If we hit a different version header, stop skipping
      if (
        trimmedLine.startsWith("## [") &&
        !isVersionHeader(trimmedLine, version)
      ) {
        isSkippingExistingVersion = false;
      }

      if (!isSkippingExistingVersion) {
        newLines.push(line);
      }
    }

    // If no Unreleased section was found, create a new changelog
    if (!hasUnreleasedSection) {
      newLines.unshift("");
      newLines.unshift(newEntry.trim());
      newLines.unshift("## [Unreleased]");
      newLines.unshift(format.template);
    }

    return this.normalizeContent(newLines);
  }

  /**
   * Normalizes the content by removing consecutive empty lines and ensuring proper spacing
   */
  private normalizeContent(lines: string[]): string {
    return (
      lines
        .reduce((acc: string[], line: string) => {
          const lastLine = acc[acc.length - 1];
          if (line.trim() === "" && lastLine?.trim() === "") {
            return acc;
          }
          acc.push(line);
          return acc;
        }, [])
        .join("\n")
        .trim() + "\n"
    );
  }

  private async getRepositoryUrl(
    context: PackageContext,
    config: ChangelogConfig,
  ): Promise<string> {
    try {
      const pkgJson = await this.workspaceService.readPackageJson(context.path);

      // Try to get the repository URL from various sources
      const repoUrl =
        (typeof pkgJson.repository === "string"
          ? pkgJson.repository
          : pkgJson.repository?.url) ??
        config.repository?.url ??
        config.fallbackRepoUrl;

      if (!repoUrl) {
        throw new Error(
          "Repository URL could not be determined. Please specify it in package.json or in the release configuration.",
        );
      }

      // Clean up the repository URL
      return repoUrl.replace(/^git\+/, "").replace(/\.git$/, "");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to determine repository URL: ${errorMessage}`);
    }
  }

  private async updateVersionComparisonLinks(
    content: string,
    context: PackageContext,
    config: ChangelogConfig,
  ): Promise<string> {
    if (!context.newVersion) {
      throw new Error("New version is required to update changelog");
    }

    try {
      const repoUrl = await this.getRepositoryUrl(context, config);
      const tagPrefix = config.git?.tagPrefix ?? "";
      const packagePrefix = context.name ? `${context.name}@` : "";

      // Update only the unreleased and current version links
      const currentVersionLinks: string[] = [
        `[unreleased]: ${repoUrl}/compare/${tagPrefix}${packagePrefix}${context.newVersion}...HEAD`,
      ];

      if (context.currentVersion) {
        // When there is a previous version, create a compare link
        currentVersionLinks.push(
          `[${context.newVersion}]: ${repoUrl}/compare/${tagPrefix}${packagePrefix}${context.currentVersion}...${tagPrefix}${packagePrefix}${context.newVersion}`,
        );
      } else {
        // If no previous version, link directly to the new version tag
        currentVersionLinks.push(
          `[${context.newVersion}]: ${repoUrl}/releases/tag/${tagPrefix}${packagePrefix}${context.newVersion}`,
        );
      }

      // Keep existing links except for unreleased and current version
      const existingLinks: string[] = this.extractExistingLinks(
        content,
        context,
      );

      // Combine new and existing links
      const allLinks: string[] = [...currentVersionLinks, ...existingLinks];

      // Replace or append links section
      const contentWithoutLinks: string = content
        .replace(/\[.+\]: .+$/gm, "")
        .trim();
      return `${contentWithoutLinks}\n\n${allLinks.join("\n")}\n`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to update version comparison links: ${errorMessage}`,
      );
    }
  }

  private extractExistingLinks(
    content: string,
    context: PackageContext,
  ): string[] {
    const linkPattern = /\[.+\]: .+$/gm;
    const allLinks = content.match(linkPattern) || [];
    const filteredLinks = allLinks.filter((link) => {
      // Exclude unreleased and current version links
      if (
        link.startsWith("[unreleased]:") ||
        link.startsWith(`[${context.newVersion}]:`)
      ) {
        return false;
      }
      return true;
    });
    return filteredLinks;
  }

  /**
   * Validates the changelog for the given package context and configuration.
   * @param context - The package context.
   * @param config - The release configuration.
   * @param monorepoRoot - The root directory of the monorepo.
   */
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
      const stats = await fs.stat(changelogPath);
      if (!stats.isFile()) {
        throw new Error(`${changelogPath} exists but is not a file`);
      }

      const content = await fs.readFile(changelogPath, "utf8");
      this.logger.debug("Raw changelog content:", content);

      if (!content.trim()) {
        throw new Error(`Changelog is empty at ${changelogPath}`);
      }

      // Basic validation with debug logs
      this.logger.debug("Checking for header...");
      if (!content.includes("# Changelog")) {
        throw new Error(
          `Invalid changelog format in ${context.name}: missing header`,
        );
      }

      this.logger.debug("Checking for Unreleased section...");
      if (!content.includes("## [Unreleased]")) {
        throw new Error(
          `Invalid changelog format in ${context.name}: missing Unreleased section`,
        );
      }

      // Format-specific validation with improved debugging
      if (format.name === "keep-a-changelog") {
        this.logger.debug("Validating Keep a Changelog format...");

        const unreleasedSection = this.extractUnreleasedSection(content);
        this.logger.debug("Extracted unreleased section:", unreleasedSection);

        this.validateUnreleasedSections(
          context.name,
          unreleasedSection,
          format,
        );
      }

      // Validate version entries with debug info
      this.logger.debug("Validating version entries...");
      this.validateVersionEntries(context.name, content);

      this.logger.success(`Changelog validation for ${context.name}: OK`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Changelog validation failed for ${context.name}: ${errorMessage}`,
      );
      throw new Error(`Validation failed: ${errorMessage}`);
    }
  }

  /**
   * Extracts the "Unreleased" section from the changelog content.
   * @param content - The full changelog content as a string.
   * @returns The content of the "Unreleased" section.
   */
  private extractUnreleasedSection(content: string): string {
    const unreleasedMatch = content.match(
      /##\s*\[Unreleased\]([^]*?)(?=\n##\s*\[|$)/i,
    );
    return unreleasedMatch ? unreleasedMatch[1].trim() : "";
  }

  /**
   * Compares two semantic version strings.
   * @param a - The first version string.
   * @param b - The second version string.
   * @returns 1 if a > b, -1 if a < b, 0 if equal.
   */
  private compareVersions(a: string, b: string): number {
    if (semver.gt(a, b)) return 1;
    if (semver.lt(a, b)) return -1;
    return 0;
  }

  async getUnreleasedChanges(
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<string[]> {
    try {
      // Get root directory with proper type safety
      const rootDir = await this.workspaceService.getRootDir();

      const changelogPath = path.join(
        rootDir,
        context.path,
        config.changelogFile || "CHANGELOG.md",
      );

      // Log the path being used
      this.logger.debug("Reading changelog from:", changelogPath);

      const content = await fs.readFile(changelogPath, "utf-8");
      this.logger.debug("Changelog content:", content);

      // Rest of the code remains the same
      const unreleasedRegex = /## \[Unreleased\]([^]*?)(?=\n## \[|$)/;
      const unreleasedMatch = content.match(unreleasedRegex);

      if (!unreleasedMatch || !unreleasedMatch[1]) {
        this.logger.debug("No unreleased section found or section is empty");
        return [];
      }

      const unreleasedContent = unreleasedMatch[1].trim();
      this.logger.debug("Raw unreleased content:", unreleasedContent);

      const changes = unreleasedContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => {
          if (line.startsWith("###") || line.length === 0) return false;
          return line.startsWith("-") || line.startsWith("*");
        });

      this.logger.debug("Processed unreleased changes:", changes);
      return changes;
    } catch (error) {
      this.logger.debug("Error reading changelog:", error);
      return [];
    }
  }

  async getLatestVersion(context: PackageContext): Promise<string | null> {
    const changelogPath = path.join(context.path, "CHANGELOG.md");
    try {
      const content = await fs.readFile(changelogPath, "utf-8");
      const versionMatch = content.match(
        /## \[(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\]/,
      );
      return versionMatch ? versionMatch[1] : null;
    } catch {
      return null;
    }
  }

  private validateUnreleasedSections(
    packageName: string,
    unreleasedSection: string,
    format: ChangelogFormat,
  ): void {
    const hasContent = unreleasedSection
      .split("\n")
      .some((line) => line.trim() && !line.startsWith("###"));

    if (!hasContent) {
      throw new Error(
        `Invalid changelog format in ${packageName}: Unreleased section must contain at least one change`,
      );
    }

    const foundHeaders = unreleasedSection
      .split("\n")
      .filter((line) => line.startsWith("###"))
      .map((line) => line.trim());

    for (const header of foundHeaders) {
      if (!format.sectionHeaders.includes(header)) {
        throw new Error(
          `Invalid changelog format in ${packageName}: invalid section header "${header}" in Unreleased. Must be one of: ${format.sectionHeaders.join(", ")}`,
        );
      }
    }
  }

  private validateVersionEntries(packageName: string, content: string): void {
    // Get the unreleased section content
    const unreleasedMatch = content.match(
      /## \[Unreleased\]([^]*?)(?=\n## \[|$)/,
    );
    if (!unreleasedMatch) {
      throw new Error(
        `Invalid changelog format in ${packageName}: missing Unreleased section`,
      );
    }

    const unreleasedContent = unreleasedMatch[1];

    // Check if there are any changes in the unreleased section
    const changes = unreleasedContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("###"));

    if (changes.length === 0) {
      throw new Error(
        `Invalid changelog format in ${packageName}: Unreleased section must contain at least one change`,
      );
    }

    // Continue with version validation...
    const lines: string[] = content.split("\n");
    const versionRegex =
      /^## \[(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\](?: - (\d{4}-\d{2}-\d{2}))?$/;

    const versions: { version: string; date?: string; line: string }[] = [];

    // Collect all version entries
    for (const line of lines) {
      if (line.startsWith("## [") && !line.includes("[Unreleased]")) {
        const firstLine: string = line.trim();
        const match = firstLine.match(versionRegex);
        if (!match) {
          throw new Error(
            `Invalid version header format in ${packageName}: "${firstLine}"`,
          );
        }

        // If date is present, validate its format
        if (match[2]) {
          const date = new Date(match[2]);
          if (isNaN(date.getTime())) {
            throw new Error(
              `Invalid date format in version header in ${packageName}: "${firstLine}"`,
            );
          }
        }

        versions.push({
          version: match[1],
          date: match[2],
          line: firstLine,
        });
      }
    }

    // Add check for duplicate versions
    const versionSet = new Set<string>();
    for (const { version } of versions) {
      if (versionSet.has(version)) {
        throw new Error(
          `Duplicate version entry found in ${packageName} for version ${version}`,
        );
      }
      versionSet.add(version);
    }

    // Check version order (newer versions should come first)
    for (let i = 1; i < versions.length; i++) {
      const current = versions[i].version;
      const previous = versions[i - 1].version;

      if (this.compareVersions(current, previous) > 0) {
        throw new Error(
          `Version entries are not in descending order in ${packageName}. Found ${previous} before ${current}`,
        );
      }
    }
  }
}
