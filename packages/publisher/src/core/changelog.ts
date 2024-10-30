import conventionalChangelog from "conventional-changelog";
import { promises as fs } from "fs";
import path from "path";
import type { Transform } from "stream";
import type { PackageContext, ReleaseConfig } from "../types/config";
import { Logger } from "../utils/logger";
import { WorkspaceService } from "./workspace";
import semver from "semver";
import { format as formatDate } from "date-fns";

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
  includeEmptySections?: boolean;
  dateFormat: string; // e.g., 'yyyy-MM-dd'
}

export interface PreviewChangelogOptions {
  newVersion: string;
  date?: string;
  conventionalCommits?: boolean;
  format?: "conventional" | "keep-a-changelog";
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
    /^##\s*\[(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\](?:\s*-\s*\d{4}-\d{2}-\d{2})?$/i,
  unreleasedHeaderPattern: /^##\s*\[unreleased\]/i,
  dateFormat: "yyyy-MM-dd",
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
  dateFormat: "yyyy-MM-dd",
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

    if (config.conventionalCommits) {
      const conventionalContent =
        await this.generateConventionalChangelog(context);
      return format.parseConventionalContent
        ? format.parseConventionalContent(conventionalContent)
        : conventionalContent;
    }

    // For formats without conventional commits, return empty sections
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
    try {
      const changelogPath = path.join(
        context.path,
        config.changelogFile || "CHANGELOG.md",
      );
      let existingContent = "";

      try {
        existingContent = await fs.readFile(changelogPath, "utf-8");
      } catch (error) {
        // Create new changelog if it doesn't exist
        existingContent = "# Changelog\n";
      }

      const format = this.getFormat(config);
      const formattedDate = this.formatDate(new Date(), format);
      const versionHeader = `## [${context.newVersion}] - ${formattedDate}`;

      // Add new version section
      let updatedContent = existingContent.replace(
        /## \[Unreleased\]/,
        `## [Unreleased]\n\n${versionHeader}`,
      );

      // Add new content under the version
      updatedContent = updatedContent.replace(
        versionHeader,
        `${versionHeader}\n\n${newContent}`,
      );

      // Deduplicate entries
      updatedContent = this.deduplicateVersionEntries(updatedContent);

      // Update comparison links
      try {
        updatedContent = await this.updateVersionComparisonLinks(
          context,
          updatedContent,
          config,
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to update version comparison links: ${errorMessage}`,
        );
      }

      await fs.writeFile(changelogPath, updatedContent, "utf-8");
    } catch (error) {
      // Error handling...
    }
  }

  private deduplicateVersionEntries(content: string): string {
    const sections = content.split(/(?=##\s+\[)/).filter(Boolean);
    const processedSections = new Map<string, string>();

    // Process each section
    sections.forEach((section) => {
      const versionMatch = section.match(
        /^##\s+\[([^\]]+)\](?:\s+-\s+([^)\n]+))?/,
      );
      if (versionMatch) {
        const [, version, date] = versionMatch;

        // Skip unreleased section
        if (version.toLowerCase() === "unreleased") {
          processedSections.set("unreleased", section);
          return;
        }

        // Try to parse and standardize the date if present
        let standardizedDate = date;
        if (date) {
          try {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
              standardizedDate = formatDate(parsedDate, "yyyy-MM-dd");
            }
          } catch {
            // Keep original date if parsing fails
          }
        }

        // If we've seen this version before
        if (processedSections.has(version)) {
          const existingSection = processedSections.get(version) || "";
          const mergedEntries = this.extractAndDeduplicateEntries(
            existingSection,
            section,
          );

          // Use the standardized date if available
          const header = standardizedDate
            ? `## [${version}] - ${standardizedDate}`
            : existingSection.match(
                /^##\s+\[[^\]]+\](?:\s+-\s+\d{4}-\d{2}-\d{2})?/,
              )?.[0] || `## [${version}]`;

          processedSections.set(
            version,
            `${header}\n${mergedEntries.join("\n")}\n`,
          );
        } else {
          // Standardize date in the section header if present
          if (standardizedDate) {
            section = section.replace(
              /^(##\s+\[[^\]]+\])(?:\s+-\s+[^)\n]+)?/,
              `$1 - ${standardizedDate}`,
            );
          }
          processedSections.set(version, section);
        }
      }
    });

    // Reconstruct the changelog
    let result = "";

    // Add Unreleased section if it exists
    const unreleasedSection = processedSections.get("unreleased");
    if (unreleasedSection) {
      result += unreleasedSection + "\n";
      processedSections.delete("unreleased");
    }

    // Add version sections in order
    const versionSections = Array.from(processedSections.entries()).sort(
      ([a], [b]) => this.compareVersions(b, a),
    );

    result += versionSections.map(([_, section]) => section).join("\n");

    // Add comparison links if they exist
    const links = content.match(/\[.*?\]:.*/g);
    if (links) {
      result += "\n" + links.join("\n") + "\n";
    }

    return result;
  }

  private extractAndDeduplicateEntries(
    section1: string,
    section2: string,
  ): string[] {
    const entries = new Set<string>();
    const allEntries: string[] = [];

    // Helper function to extract and process entries
    const processSection = (section: string): void => {
      const lines = section
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("-"));

      lines.forEach((line) => {
        if (!entries.has(line)) {
          entries.add(line);
          allEntries.push(line);
        }
      });
    };

    // Process both sections while maintaining order
    processSection(section1);
    processSection(section2);

    // Return unique entries while preserving the original order
    return allEntries.filter(
      (entry, index) => allEntries.indexOf(entry) === index,
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
      throw new Error(`Failed to determine repository URL: ${errorMessage}`, {
        cause: error,
      });
    }
  }

  private async updateVersionComparisonLinks(
    context: PackageContext,
    content: string,
    config: ReleaseConfig,
  ): Promise<string> {
    try {
      if (!context.newVersion) {
        throw new Error("New version is required to update changelog");
      }

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
    } catch (error: unknown) {
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
      this.validateVersionEntries(context.name, content, config);

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
    return semver.compare(b, a);
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

  private validateVersionEntries(
    packageName: string,
    content: string,
    config: ReleaseConfig,
  ): void {
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

        // If date is present, validate its format using date-fns
        if (match[2]) {
          try {
            const format = this.getFormat(config);
            const date = formatDate(new Date(match[2]), format.dateFormat);
            if (date !== match[2]) {
              throw new Error(
                `Invalid date format in version header in ${packageName}: "${firstLine}"`,
              );
            }
          } catch {
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

      if (semver.compare(current, previous) > 0) {
        throw new Error(
          `Version entries are not in descending order in ${packageName}. Found ${previous} before ${current}`,
        );
      }
    }
  }

  /**
   * Previews the changelog entry for a new version without writing to the file.
   */
  async previewChangelog(
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<string> {
    try {
      const changelogPath = path.join(context.path, config.changelogFile);
      let content: string;

      try {
        content = await fs.readFile(changelogPath, "utf-8");
      } catch (error) {
        // If file doesn't exist, return empty changelog
        return this.formatVersionEntry(context.newVersion || "x.x.x", "");
      }

      // Handle empty or malformed content
      if (
        !content.trim() ||
        (!content.includes("# Changelog") && !content.match(/##\s*\[/))
      ) {
        return this.formatVersionEntry(context.newVersion || "x.x.x", "");
      }

      const unreleasedMatch = content.match(
        /## \[Unreleased\]([\s\S]*?)(?=## \[|$)/i,
      );
      const unreleasedContent = unreleasedMatch
        ? unreleasedMatch[1].trim()
        : "";

      if (!unreleasedContent) {
        if (config.conventionalCommits) {
          const generated = await this.generate(context, config);
          if (config.changelogFormat === "keep-a-changelog") {
            // Parse conventional commits into keep-a-changelog format
            return this.formatKeepAChangelogPreview(
              context.newVersion || "x.x.x",
              this.parseConventionalToKeepAChangelog(generated),
            );
          }
          return this.formatVersionEntry(
            context.newVersion || "x.x.x",
            generated,
          );
        }
        return this.formatVersionEntry(context.newVersion || "x.x.x", "");
      }

      if (config.changelogFormat === "keep-a-changelog") {
        return this.formatKeepAChangelogPreview(
          context.newVersion || "x.x.x",
          unreleasedContent,
        );
      }

      return this.formatConventionalPreview(
        context.newVersion || "x.x.x",
        unreleasedContent,
      );
    } catch (error) {
      this.logger.error("Failed to preview changelog:", error);
      return this.formatVersionEntry(context.newVersion || "x.x.x", "");
    }
  }

  private formatVersionEntry(
    version: string,
    content: string,
    date?: string,
  ): string {
    const dateStr = date || new Date().toISOString().split("T")[0];
    // Add newline after date and ensure content is properly formatted
    return content.trim()
      ? `## [${version}] - ${dateStr}\n${content}\n`
      : `## [${version}] - ${dateStr}\nNo changes recorded\n`;
  }

  private formatKeepAChangelogPreview(
    version: string,
    content: string,
  ): string {
    const sections = [
      "### Added",
      "### Changed",
      "### Deprecated",
      "### Removed",
      "### Fixed",
      "### Security",
    ];

    // Split content into sections
    const sectionContent: Record<string, string[]> = {};
    let currentSection = "";

    content.split("\n").forEach((line) => {
      if (line.startsWith("###")) {
        currentSection = line.trim();
      } else if (currentSection && line.trim()) {
        if (!sectionContent[currentSection]) {
          sectionContent[currentSection] = [];
        }
        sectionContent[currentSection].push(line.trim());
      }
    });

    // Always include all sections for keep-a-changelog format
    // This maintains consistency and makes it clear which types of changes are tracked
    const formattedSections = sections
      .map((section) => {
        const entries = sectionContent[section] || [];
        return `${section}\n${entries.length ? entries.join("\n") : ""}`;
      })
      .join("\n\n");

    return this.formatVersionEntry(version, "\n" + formattedSections);
  }

  private formatConventionalPreview(version: string, content: string): string {
    const sections: Record<string, string[]> = {
      "### Added": [],
      "### Changed": [],
      "### Fixed": [],
      "### Removed": [],
    };

    content.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("-") || trimmedLine.startsWith("*")) {
        // Remove the bullet point for processing
        const cleanLine = trimmedLine.replace(/^[-*]\s*/, "");
        // First check for feat: and fix: prefixes
        if (cleanLine.startsWith("feat:") || cleanLine.includes("feature")) {
          sections["### Added"].push(
            `- ${cleanLine
              .replace(/^feat:\s*/, "")
              .replace(/^feature:\s*/, "")
              .trim()}`,
          );
        } else if (
          cleanLine.startsWith("fix:") ||
          cleanLine.includes("bug fix")
        ) {
          sections["### Fixed"].push(
            `- ${cleanLine
              .replace(/^fix:\s*/, "")
              .replace(/^bug fix:\s*/, "")
              .trim()}`,
          );
        } else if (cleanLine.startsWith("refactor:")) {
          sections["### Changed"].push(
            `- ${cleanLine.replace(/^refactor:\s*/, "").trim()}`,
          );
        } else if (cleanLine.startsWith("remove:")) {
          sections["### Removed"].push(
            `- ${cleanLine.replace(/^remove:\s*/, "").trim()}`,
          );
        } else {
          // Try to infer the section from the content
          if (
            cleanLine.toLowerCase().includes("new") ||
            cleanLine.toLowerCase().includes("add")
          ) {
            sections["### Added"].push(`- ${cleanLine}`);
          } else if (
            cleanLine.toLowerCase().includes("fix") ||
            cleanLine.toLowerCase().includes("bug")
          ) {
            sections["### Fixed"].push(`- ${cleanLine}`);
          } else {
            sections["### Changed"].push(`- ${cleanLine}`);
          }
        }
      }
    });

    // Only include sections that have content
    const formattedSections = Object.entries(sections)
      .filter(([_, lines]) => lines.length > 0)
      .map(([header, lines]) => `${header}\n${lines.join("\n")}`)
      .join("\n\n");

    return this.formatVersionEntry(version, formattedSections);
  }

  private parseConventionalToKeepAChangelog(content: string): string {
    const sections: Record<string, string[]> = {
      "### Added": [],
      "### Changed": [],
      "### Deprecated": [],
      "### Removed": [],
      "### Fixed": [],
      "### Security": [],
    };

    content.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("* ")) {
        const commit = trimmedLine.substring(2);
        if (commit.startsWith("feat:")) {
          sections["### Added"].push(
            `- ${commit.replace(/^feat(\([^)]+\))?:/, "").trim()}`,
          );
        } else if (commit.startsWith("fix:")) {
          sections["### Fixed"].push(
            `- ${commit.replace(/^fix(\([^)]+\))?:/, "").trim()}`,
          );
        } else if (
          commit.startsWith("chore:") ||
          commit.startsWith("refactor:") ||
          commit.startsWith("docs:")
        ) {
          sections["### Changed"].push(
            `- ${commit.replace(/^(chore|refactor|docs)(\([^)]+\))?:/, "").trim()}`,
          );
        } else if (commit.startsWith("deprecated:")) {
          sections["### Deprecated"].push(
            `- ${commit.replace(/^deprecated(\([^)]+\))?:/, "").trim()}`,
          );
        } else if (commit.startsWith("removed:")) {
          sections["### Removed"].push(
            `- ${commit.replace(/^removed(\([^)]+\))?:/, "").trim()}`,
          );
        } else if (commit.startsWith("security:")) {
          sections["### Security"].push(
            `- ${commit.replace(/^security(\([^)]+\))?:/, "").trim()}`,
          );
        } else {
          // Default to Changed for unknown types
          sections["### Changed"].push(`- ${commit.trim()}`);
        }
      }
    });

    return Object.entries(sections)
      .map(([header, entries]) => `${header}\n${entries.join("\n")}`)
      .join("\n\n");
  }

  private formatDate(date: Date, format: ChangelogFormat): string {
    return formatDate(date, format.dateFormat);
  }

  async previewNewVersion(
    context: PackageContext,
    config: ReleaseConfig,
    options: PreviewChangelogOptions,
  ): Promise<string> {
    try {
      const changelogPath = path.join(context.path, config.changelogFile);
      let content: string;

      try {
        content = await fs.readFile(changelogPath, "utf-8");
      } catch (error) {
        return this.formatVersionEntry(options.newVersion, "");
      }

      // Handle empty or malformed content
      if (
        !content.trim() ||
        (!content.includes("# Changelog") && !content.match(/##\s*\[/))
      ) {
        return this.formatVersionEntry(options.newVersion, "");
      }

      const unreleasedMatch = content.match(
        /## \[Unreleased\]([\s\S]*?)(?=## \[|$)/i,
      );
      const unreleasedContent = unreleasedMatch
        ? unreleasedMatch[1].trim()
        : "";

      if (!unreleasedContent) {
        if (options.conventionalCommits) {
          const generated = await this.generate(context, config);
          if (config.changelogFormat === "keep-a-changelog") {
            return this.formatKeepAChangelogPreview(
              options.newVersion,
              this.parseConventionalToKeepAChangelog(generated),
            );
          }
          return this.formatVersionEntry(options.newVersion, generated);
        }
        return this.formatVersionEntry(options.newVersion, "");
      }

      if (config.changelogFormat === "keep-a-changelog") {
        return this.formatKeepAChangelogPreview(
          options.newVersion,
          unreleasedContent,
        );
      }

      return this.formatConventionalPreview(
        options.newVersion,
        unreleasedContent,
      );
    } catch (error) {
      this.logger.error("Failed to preview changelog:", error);
      return this.formatVersionEntry(options.newVersion, "");
    }
  }
}
