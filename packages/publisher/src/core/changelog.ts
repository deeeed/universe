import conventionalChangelog from "conventional-changelog";
import { format as formatDate } from "date-fns";
import { promises as fs } from "fs";
import path from "path";
import semver from "semver";
import type { Transform } from "stream";
import type { PackageContext, ReleaseConfig } from "../types/config";
import { formatGitTag } from "../utils/format-tag";
import { Logger } from "../utils/logger";
import { WorkspaceService } from "./workspace";

interface ChangelogFormat {
  name: string;
  template: string;
  sectionHeaders: string[];
  versionRegex: RegExp;
  formatVersion: (version: string, date: string) => string;
  formatLinks: (
    versions: { current: string; previous: string; packageName: string },
    config: { repoUrl: string; tagPrefix: string },
  ) => string[];
  parseConventionalContent?: (content: string) => string;
  versionHeaderPattern: RegExp;
  unreleasedHeaderPattern: RegExp;
  includeEmptySections?: boolean;
  dateFormat: string; // e.g., 'yyyy-MM-dd'
  noChangesMessage: string;
}

export interface PreviewChangelogOptions {
  newVersion: string;
  date?: string;
  conventionalCommits?: boolean;
  format?: "conventional" | "keep-a-changelog";
  includeEmptySections?: boolean;
}

export const KEEP_A_CHANGELOG_FORMAT: ChangelogFormat = {
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
  formatLinks: (versions, config) => {
    return [
      `[unreleased]: ${config.repoUrl}/compare/${formatGitTag({
        packageName: versions.packageName,
        version: versions.current,
        tagPrefix: config.tagPrefix,
      })}...HEAD`,
      `[${versions.current}]: ${config.repoUrl}/compare/${formatGitTag({
        packageName: versions.packageName,
        version: versions.previous,
        tagPrefix: config.tagPrefix,
      })}...${formatGitTag({
        packageName: versions.packageName,
        version: versions.current,
        tagPrefix: config.tagPrefix,
      })}`,
    ];
  },
  versionHeaderPattern:
    /^##\s*\[(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\](?:\s*-\s*\d{4}-\d{2}-\d{2})?$/i,
  unreleasedHeaderPattern: /^##\s*\[unreleased\]/i,
  dateFormat: "yyyy-MM-dd",
  noChangesMessage: "No changes recorded",
  includeEmptySections: true,
};

export const CONVENTIONAL_CHANGELOG_FORMAT: ChangelogFormat = {
  name: "conventional",
  template: `# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
`,
  sectionHeaders: [],
  versionRegex: /^\[([\d.]+(?:-[a-zA-Z0-9.]+)?)\]$/,
  formatVersion: (version: string, _date: string) => `## [${version}]`,
  formatLinks: (versions, config) => {
    return [
      `[unreleased]: ${config.repoUrl}/compare/${formatGitTag({
        packageName: versions.packageName,
        version: versions.current,
        tagPrefix: config.tagPrefix,
      })}...HEAD`,
      `[${versions.current}]: ${config.repoUrl}/compare/${formatGitTag({
        packageName: versions.packageName,
        version: versions.previous,
        tagPrefix: config.tagPrefix,
      })}...${formatGitTag({
        packageName: versions.packageName,
        version: versions.current,
        tagPrefix: config.tagPrefix,
      })}`,
    ];
  },
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
  noChangesMessage: "No changes recorded",
  includeEmptySections: false,
};

interface ChangelogConfig extends ReleaseConfig {
  fallbackRepoUrl?: string;
}

export class ChangelogService {
  private readonly workspaceService: WorkspaceService;
  private readonly BULLET_POINTS = ["*", "-", "+"] as const;
  private readonly COMMIT_TYPES = {
    feat: "Added",
    fix: "Fixed",
    perf: "Changed",
    refactor: "Changed",
    style: "Changed",
    docs: "Documentation",
    test: "Changed",
    build: "Changed",
    ci: "Changed",
    chore: "Changed",
    revert: "Removed",
    deprecate: "Deprecated",
    security: "Security",
    breaking: "Breaking",
  } as const;

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

  /**
   * Generates changelog content for a new version based on either conventional commits
   * or the current unreleased section.
   *
   * @param context - Package context containing version and path information
   * @param config - Release configuration specifying changelog format and options
   * @returns Promise<string> - Formatted changelog content for the new version
   *
   * @remarks
   * - For conventional commits: Generates content from git history using conventional-changelog
   * - For non-conventional: Returns empty sections based on the specified format
   * - Content is formatted according to either "conventional" or "keep-a-changelog" format
   */
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

  /**
   * Updates the changelog file with new version content while maintaining proper formatting and structure.
   *
   * @param context - Package context containing version and path information
   * @param newChanges - New changelog content to be added
   * @param config - Release configuration
   *
   * @remarks
   * The update process:
   * 1. Clears the unreleased section while preserving the header
   * 2. Adds new version section with formatted date
   * 3. Adds new content under the version
   * 4. Deduplicates version entries
   * 5. Updates version comparison links
   *
   * @throws Error if changelog update fails
   */
  async update(
    context: PackageContext,
    newChanges: string,
    config: ReleaseConfig,
  ): Promise<void> {
    try {
      if (!context.newVersion) {
        throw new Error("New version is required to update changelog");
      }

      const changelogPath = path.join(
        context.path,
        config.changelogFile || "CHANGELOG.md",
      );
      const content = await fs.readFile(changelogPath, "utf8");

      // Extract the unreleased section and preserve all its content
      const unreleasedMatch = content.match(
        /## \[Unreleased\]([\s\S]*?)(?=\n##|$)/,
      );
      const existingUnreleased = unreleasedMatch?.[1]?.trim() || "";

      // Combine existing unreleased content with new changes, preserving all sections
      const sections = new Map<string, string[]>();

      // First, parse existing content
      const existingSections = existingUnreleased.split(/(?=### )/);
      existingSections.forEach((section) => {
        const match = section.match(/### ([^\n]+)([\s\S]*)/);
        if (match) {
          const [, header, content] = match;
          sections.set(header.trim(), content.trim().split("\n"));
        }
      });

      // Then, parse and merge new changes
      const newSections = newChanges.split(/(?=### )/);
      newSections.forEach((section) => {
        const match = section.match(/### ([^\n]+)([\s\S]*)/);
        if (match) {
          const [, header, content] = match;
          const existing = sections.get(header.trim()) || [];
          sections.set(
            header.trim(),
            [...existing, ...content.trim().split("\n")].filter(Boolean),
          );
        }
      });

      // Format the combined content maintaining section order
      const combinedContent = Array.from(sections.entries())
        .map(([header, lines]) => `### ${header}\n${lines.join("\n")}`)
        .join("\n\n");

      // Create initial updated content
      let updatedContent = content.replace(
        /## \[Unreleased\][\s\S]*?(?=\n##|$)/,
        `## [Unreleased]\n\n## [${context.newVersion}] - ${formatDate(
          new Date(),
          "yyyy-MM-dd",
        )}\n${combinedContent}`,
      );

      // Deduplicate version entries
      updatedContent = this.deduplicateVersionEntries(updatedContent);

      // Update version comparison links
      updatedContent = await this.updateVersionComparisonLinks(
        context,
        updatedContent,
        config,
      );

      await fs.writeFile(changelogPath, updatedContent, "utf8");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update changelog: ${errorMessage}`);
    }
  }

  private deduplicateVersionEntries(content: string): string {
    this.logger.debug("=== Starting deduplication process ===");

    // Extract header before splitting into sections
    const headerMatch = content.match(/^([\s\S]*?)(?=##\s+\[)/);
    const header = headerMatch ? headerMatch[1].trim() : "";
    this.logger.debug("Extracted header:", header);

    const sections = content.split(/(?=##\s+\[)/).filter(Boolean);
    this.logger.debug("Split sections:", sections);

    const processedSections = new Map<string, string>();

    // Process each section
    sections.forEach((section, index) => {
      this.logger.debug(`Processing section ${index + 1}:`, section);

      const versionMatch = section.match(
        /^##\s+\[([^\]]+)\](?:\s+-\s+([^)\n]+))?/,
      );
      if (versionMatch) {
        const [fullMatch, version, date] = versionMatch;

        // Skip unreleased section
        if (version.toLowerCase() === "unreleased") {
          processedSections.set("unreleased", section);
          return;
        }

        // Try to parse and standardize the date
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

        const sectionContent = section.replace(fullMatch, "").trim();

        if (processedSections.has(version)) {
          // Merge content with existing section
          const existingSection = processedSections.get(version) || "";
          const mergedContent = this.extractAndDeduplicateEntries(
            existingSection,
            sectionContent,
          );

          // Use standardized date if available
          const header = standardizedDate
            ? `## [${version}] - ${standardizedDate}`
            : `## [${version}]`;

          processedSections.set(version, `${header}\n${mergedContent}`);
        } else {
          // Create new section with standardized date
          const header = standardizedDate
            ? `## [${version}] - ${standardizedDate}`
            : `## [${version}]`;

          processedSections.set(version, `${header}\n${sectionContent}`);
        }
      }
    });

    // Reconstruct the changelog
    this.logger.debug("Reconstructing changelog...");
    let result = header ? `${header}\n\n` : "";

    // Add Unreleased section if it exists
    const unreleasedSection = processedSections.get("unreleased");
    if (unreleasedSection) {
      this.logger.debug("Adding unreleased section");
      result += unreleasedSection + "\n";
      processedSections.delete("unreleased");
    }

    // Add version sections in order
    const versionSections = Array.from(processedSections.entries()).sort(
      ([a], [b]) => this.compareVersions(b, a),
    );
    this.logger.debug(
      "Ordered versions:",
      versionSections.map(([v]) => v),
    );

    result += versionSections.map(([_, section]) => section).join("\n");

    // Add comparison links if they exist (deduplicated)
    const links = new Set(content.match(/\[.*?\]:.*/g) || []);
    if (links.size > 0) {
      this.logger.debug(`Adding ${links.size} comparison links`);
      result += "\n" + Array.from(links).join("\n") + "\n";
    }

    this.logger.debug("=== Deduplication process completed ===");
    return result;
  }

  private extractAndDeduplicateEntries(
    section1: string,
    section2: string,
  ): string {
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

    // Return unique entries while preserving the original order, joined with newlines
    return allEntries
      .filter((entry, index) => allEntries.indexOf(entry) === index)
      .join("\n");
  }

  async getRepositoryUrl(
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

      // Create a Set to store unique links
      const uniqueLinks = new Set<string>();

      // Add unreleased and new version links
      uniqueLinks.add(
        `[unreleased]: ${repoUrl}/compare/${formatGitTag({
          packageName: context.name,
          version: context.newVersion,
          tagPrefix,
        })}...HEAD`,
      );

      if (context.currentVersion) {
        uniqueLinks.add(
          `[${context.newVersion}]: ${repoUrl}/compare/${formatGitTag({
            packageName: context.name,
            version: context.currentVersion,
            tagPrefix,
          })}...${formatGitTag({
            packageName: context.name,
            version: context.newVersion,
            tagPrefix,
          })}`,
        );
      } else {
        uniqueLinks.add(
          `[${context.newVersion}]: ${repoUrl}/releases/tag/${formatGitTag({
            packageName: context.name,
            version: context.newVersion,
            tagPrefix,
          })}`,
        );
      }

      // Add existing links, excluding any that would be duplicates
      const existingLinks = this.extractExistingLinks(content, context).filter(
        (link) => {
          // Exclude links that we've already added or that reference the same versions
          const isUnreleasedLink = link.startsWith("[unreleased]:");
          const isNewVersionLink = link.includes(`[${context.newVersion}]:`);
          return !isUnreleasedLink && !isNewVersionLink;
        },
      );

      existingLinks.forEach((link) => uniqueLinks.add(link));

      // Replace or append links section
      const contentWithoutLinks = content.replace(/\[.+\]: .+$/gm, "").trim();
      return `${contentWithoutLinks}\n\n${Array.from(uniqueLinks).join("\n")}\n`;
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
   * Validates the changelog file structure and content according to the specified format.
   *
   * @param context - Package context containing version and path information
   * @param config - Release configuration
   *
   * @remarks
   * Validates:
   * - File existence and format
   * - Required sections (Unreleased, etc.)
   * - Version entry format and ordering
   * - Date formats in version headers
   * - Section headers (for keep-a-changelog format)
   *
   * @throws Error if validation fails
   */
  async validate(
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<void> {
    if (!context.path) {
      throw new Error(`Invalid package path for ${context.name}`);
    }

    const format = this.getFormat(config);
    const changelogPath = path.join(
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
  public extractUnreleasedSection(content: string): string {
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
    return semver.compare(a, b);
  }

  async getUnreleasedChanges(
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<string[]> {
    try {
      const changelogPath = path.join(
        context.path,
        config.changelogFile || "CHANGELOG.md",
      );

      // Log the path being used
      this.logger.debug("Reading changelog from:", changelogPath);

      const content = await fs.readFile(changelogPath, "utf-8");
      this.logger.debug("Changelog content:", content);

      // Rest of the code remains the same
      const unreleasedRegex = /## \[Unreleased\]([^]*?)(?=\n##|$)/;
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
    _config: ReleaseConfig,
  ): void {
    const versionPattern = /## \[([^\]]+)\](?:\s+-\s+(\d{4}-\d{2}-\d{2}))?/g;
    let match;
    const versions: { version: string; date?: string }[] = [];

    while ((match = versionPattern.exec(content)) !== null) {
      const [, version, date] = match;
      if (version.toLowerCase() !== "unreleased") {
        // Validate date format if present
        if (date) {
          const parsedDate = new Date(date);
          if (isNaN(parsedDate.getTime())) {
            throw new Error(
              `Invalid date format in version header in ${packageName}`,
            );
          }
        }
        versions.push({ version, date });
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
   * Previews how the changelog will look after updating to a new version.
   *
   * @param context - Package context containing version information
   * @param config - Release configuration
   * @returns Promise<string> - Formatted preview of the changelog entry
   *
   * @remarks
   * - Uses current unreleased section if available
   * - Falls back to conventional commits if enabled
   * - Formats according to specified changelog format
   * - Includes proper date formatting and section structure
   */
  async previewNewVersion(
    context: PackageContext,
    config: ReleaseConfig,
    options: PreviewChangelogOptions,
  ): Promise<string> {
    const format = this.getFormat(config);
    const date = options.date || formatDate(new Date(), format.dateFormat);
    const formatType = options.format || "conventional";

    try {
      const changelogPath = path.join(
        context.path,
        config.changelogFile || "CHANGELOG.md",
      );
      const content = await fs.readFile(changelogPath, "utf-8");

      // Extract unreleased changes
      const unreleasedMatch = content.match(
        /## \[Unreleased\]\n([\s\S]*?)(?=\n##|$)/,
      );
      let unreleasedContent = unreleasedMatch?.[1]?.trim();

      // If conventional commits is disabled, use unreleased content as is
      if (!options.conventionalCommits && unreleasedContent) {
        return this.formatVersionEntry(
          options.newVersion,
          unreleasedContent,
          date,
          format,
        );
      }

      // If using conventional commits, generate from git history
      if (options.conventionalCommits) {
        const conventionalContent =
          await this.generateConventionalChangelog(context);
        // Only override unreleased content if conventional content exists
        if (conventionalContent.trim()) {
          unreleasedContent =
            this.formatConventionalContent(conventionalContent);
        }
      }

      // If no content found, return empty message
      if (!unreleasedContent) {
        return this.formatVersionEntry(
          options.newVersion,
          this.getEmptyContent(
            formatType,
            options.includeEmptySections,
            format,
          ),
          date,
          format,
        );
      }

      // For keep-a-changelog format, preserve the section headers and content
      if (formatType === "keep-a-changelog") {
        // If content already has section headers, use it as is
        if (unreleasedContent.includes("### ")) {
          return this.formatVersionEntry(
            options.newVersion,
            unreleasedContent,
            date,
            format,
          );
        }
        // Otherwise, format it according to keep-a-changelog style
        return this.formatVersionEntry(
          options.newVersion,
          this.formatKeepAChangelogContent(
            unreleasedContent,
            options.includeEmptySections ?? false,
            format.sectionHeaders,
          ),
          date,
          format,
        );
      }

      // For conventional format, use content as is
      return this.formatVersionEntry(
        options.newVersion,
        unreleasedContent,
        date,
        format,
      );
    } catch (error) {
      return this.formatVersionEntry(
        options.newVersion,
        this.getEmptyContent(formatType, options.includeEmptySections, format),
        date,
        format,
      );
    }
  }

  private getEmptyContent(
    formatType: "conventional" | "keep-a-changelog",
    includeEmptySections?: boolean,
    format?: ChangelogFormat,
  ): string {
    if (formatType === "keep-a-changelog" && includeEmptySections && format) {
      return this.formatKeepAChangelogContent("", true, format.sectionHeaders);
    }
    return "No changes recorded";
  }

  private formatConventionalContent(content: string): string {
    if (!content.trim()) {
      return "No changes recorded";
    }

    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return lines
      .map((line) => {
        if (line.startsWith("*")) return line;
        return `* ${line}`;
      })
      .join("\n");
  }

  /**
   * Adds new changes to the Unreleased section of the changelog.
   *
   * @param context - Package context
   * @param changes - Array of change entries to add
   *
   * @remarks
   * - Prevents duplicate entries (case-insensitive comparison)
   * - Maintains proper spacing and formatting
   * - Preserves existing unreleased entries
   * - Handles commit references in change messages
   *
   * @throws Error if updating the changelog fails
   */
  async addToUnreleased(
    context: PackageContext,
    changes: string[],
  ): Promise<void> {
    try {
      const changelogPath = path.join(context.path, "CHANGELOG.md");
      const content = await fs.readFile(changelogPath, "utf8");

      // Split into sections
      const [header, ...sections] = content.split(/\n## \[/);

      // Get unreleased section
      const unreleasedSection = sections.find((s) =>
        s.startsWith("Unreleased]"),
      );
      if (!unreleasedSection) {
        throw new Error("No [Unreleased] section found in changelog");
      }

      // Get existing entries
      const existingEntries = unreleasedSection
        .split("\n")
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.trim());

      // Filter out duplicates by comparing the message part only
      const newChanges = changes.filter((change) => {
        const newMessage = change.split(/[[(]/)[0].trim(); // Get text before any commit hash
        return !existingEntries.some((existing) => {
          const existingMessage = existing.split(/[[(]/)[0].trim();
          return existingMessage.toLowerCase() === newMessage.toLowerCase();
        });
      });

      // Build new unreleased section
      const newUnreleased = [
        "Unreleased]",
        newChanges.join("\n"),
        existingEntries.join("\n"),
      ]
        .filter(Boolean)
        .join("\n");

      // Rebuild content
      const newContent = [
        header.trim(),
        "",
        `## [${newUnreleased}`,
        "",
        ...sections
          .filter((s) => !s.startsWith("Unreleased]"))
          .map((s) => `## [${s}`),
      ].join("\n");

      await fs.writeFile(changelogPath, newContent, "utf8");
    } catch (error) {
      this.logger.error("Failed to update changelog:", error);
      throw new Error(
        `Failed to update changelog: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private formatVersionEntry(
    version: string,
    content: string,
    date?: string,
    format?: ChangelogFormat,
  ): string {
    const dateStr = date || new Date().toISOString().split("T")[0];
    const noChangesMessage = format?.noChangesMessage ?? "No changes recorded";
    const body = content.trim() || noChangesMessage;
    return `## [${version}] - ${dateStr}\n${body}`.trim();
  }

  private normalizeBulletPoint(
    line: string,
    preferredBullet: string = "-",
  ): string {
    const trimmed = line.trim();
    for (const bullet of this.BULLET_POINTS) {
      if (trimmed.startsWith(bullet)) {
        return trimmed.replace(bullet, preferredBullet);
      }
    }
    // If no bullet point found, add the preferred one
    return `${preferredBullet} ${trimmed}`;
  }

  private parseCommitType(
    line: string,
  ): { type: string; content: string } | null {
    const trimmed = line.trim();
    // Remove any bullet point
    const content = this.BULLET_POINTS.reduce(
      (acc, bullet) => acc.replace(new RegExp(`^\\${bullet}\\s*`), ""),
      trimmed,
    );

    // Match conventional commit format: type(scope)?: description
    if (content.length > 1000) return null; // Reasonable max length for a commit message
    const match = content.match(
      /^(\w{1,50})(?:\([^)]{0,100}\))?\s{0,10}:\s{0,10}(.+)$/,
    );
    if (!match) return null;

    const [, type, description] = match;
    return {
      type: type.toLowerCase(),
      content: description.trim(),
    };
  }

  private formatKeepAChangelogContent(
    content: string,
    includeEmptySections: boolean = false,
    sectionHeaders: string[],
  ): string {
    // If no content or malformed, return "No changes recorded"
    if (!content.trim()) {
      return "No changes recorded";
    }

    const sections: Record<string, string[]> = {};
    sectionHeaders.forEach((header) => {
      sections[header] = [];
    });

    let currentSection = "";
    content.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      if (trimmedLine.startsWith("###")) {
        currentSection = trimmedLine;
      } else {
        const commitInfo = this.parseCommitType(trimmedLine);
        if (currentSection) {
          sections[currentSection].push(this.normalizeBulletPoint(trimmedLine));
        } else if (commitInfo) {
          const section = `### ${this.COMMIT_TYPES[commitInfo.type as keyof typeof this.COMMIT_TYPES] || "Changed"}`;
          if (sections[section]) {
            sections[section].push(
              this.normalizeBulletPoint(commitInfo.content),
            );
          }
        } else {
          sections["### Changed"].push(this.normalizeBulletPoint(trimmedLine));
        }
      }
    });

    const formattedSections = sectionHeaders
      .map((header) => {
        const entries = sections[header];
        if (!includeEmptySections && entries.length === 0) {
          return null;
        }
        return `${header}${entries.length ? "\n" + entries.join("\n") : ""}`;
      })
      .filter(Boolean);

    return formattedSections.length
      ? formattedSections.join("\n\n")
      : this.getEmptyKeepAChangelogSections(includeEmptySections);
  }

  private getEmptyKeepAChangelogSections(includeEmpty: boolean): string {
    if (!includeEmpty) return "No changes recorded";

    return [
      "### Added",
      "### Changed",
      "### Deprecated",
      "### Removed",
      "### Fixed",
      "### Security",
    ].join("\n");
  }
}
