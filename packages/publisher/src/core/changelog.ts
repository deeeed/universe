import conventionalChangelog from "conventional-changelog";
import { promises as fs, Stats } from "fs";
import path from "path";
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
  private readonly workspaceService: WorkspaceService;

  constructor(
    private readonly logger: Logger = new Logger(),
    workspaceService?: WorkspaceService,
  ) {
    this.workspaceService = workspaceService ?? new WorkspaceService();
  }

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

    // Get unreleased content and clear it
    const unreleasedContent = this.extractUnreleasedSection(currentContent);

    const dateStr = new Date().toISOString().split("T")[0];
    const versionEntry = format.formatVersion(context.newVersion, dateStr);

    // Create new version entry with both unreleased and new content
    const combinedContent = [unreleasedContent, newContent]
      .filter((content) => content.trim())
      .join("\n");

    // Insert the new version with combined content
    const updatedContent = this.insertNewEntry(
      currentContent,
      `${versionEntry}\n${combinedContent}`,
    );

    const finalContent = await this.updateVersionComparisonLinks(
      updatedContent,
      context,
      config,
    );

    await fs.writeFile(changelogPath, finalContent);
  }

  // New method to only update links for the current version
  private async updateVersionComparisonLinks(
    content: string,
    context: PackageContext,
    config: ReleaseConfig,
  ): Promise<string> {
    if (!context.newVersion) {
      throw new Error("New version is required to update changelog");
    }

    // Get repository URL (reusing existing logic)
    let repoUrl: string;
    try {
      const pkgJson = await this.workspaceService.readPackageJson(context.path);
      repoUrl =
        (typeof pkgJson.repository === "string"
          ? pkgJson.repository
          : pkgJson.repository?.url) ??
        config.repository?.url ??
        "https://github.com/deeeed/universe";

      repoUrl = repoUrl.replace(/^git\+/, "").replace(/\.git$/, "");
    } catch (error) {
      this.logger.debug(
        "Error reading package.json for repository URL:",
        error,
      );
      repoUrl = "https://github.com/deeeed/universe";
    }

    const tagPrefix = config.git?.tagPrefix ?? "";
    const packagePrefix = context.name ? `${context.name}@` : "";

    // Update only the unreleased and current version links
    const currentVersionLinks = [
      `[unreleased]: ${repoUrl}/compare/${tagPrefix}${packagePrefix}${context.newVersion}...HEAD`,
      `[${context.newVersion}]: ${repoUrl}/compare/${tagPrefix}${packagePrefix}${context.currentVersion}...${tagPrefix}${packagePrefix}${context.newVersion}`,
    ];

    // Keep existing links except for unreleased and current version
    const existingLinks =
      content
        .match(/\[.+\]: .+$/gm)
        ?.filter(
          (link) =>
            !link.startsWith("[unreleased]:") &&
            !link.startsWith(`[${context.newVersion}]:`),
        ) || [];

    // Combine new and existing links
    const allLinks = [...currentVersionLinks, ...existingLinks];

    // Replace or append links section
    const contentWithoutLinks = content.replace(/\[.+\]: .+$/gm, "").trim();
    return `${contentWithoutLinks}\n\n${allLinks.join("\n")}\n`;
  }

  private insertNewEntry(currentContent: string, newEntry: string): string {
    // Split content into main sections
    const [headerSection, ...contentSections] =
      currentContent.split(/(?=## \[)/);

    // Extract version from new entry
    const versionMatch = newEntry.match(/^## \[([^\]]+)\]/);
    if (!versionMatch) {
      throw new Error("Invalid new entry format: missing version header");
    }
    const version = versionMatch[1];

    // Remove any existing entries for the same version and unreleased section
    const filteredSections = contentSections.filter(
      (section) =>
        !section.startsWith(`## [${version}]`) &&
        !section.startsWith("## [Unreleased]"),
    );

    // Construct the new content
    const parts = [
      headerSection.trim(),
      "## [Unreleased]",
      "",
      newEntry.trim(),
      ...filteredSections,
    ];

    // Join sections with proper spacing
    return (
      parts
        .filter((part) => part.trim())
        .join("\n\n")
        .replace(/\n{3,}/g, "\n\n") + "\n"
    );
  }

  private extractUnreleasedSection(content: string): string {
    const unreleasedMatch = content.match(
      /## \[Unreleased\]([^]*?)(?=\n## \[|$)/,
    );
    if (!unreleasedMatch || !unreleasedMatch[1]) {
      return "";
    }
    return unreleasedMatch[1].trim();
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
      let stats: Stats;
      try {
        stats = await fs.stat(changelogPath);
        if (!stats.isFile()) {
          throw new Error(`${changelogPath} exists but is not a file`);
        }
      } catch (error) {
        throw new Error(`Changelog file not found at: ${changelogPath}`);
      }

      let content: string;
      try {
        content = await fs.readFile(changelogPath, "utf8");
        this.logger.debug("Raw changelog content:", content);
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

        if (!content.includes("The format is based on [Keep a Changelog]")) {
          throw new Error(
            `Invalid changelog format in ${context.name}: missing Keep a Changelog reference`,
          );
        }

        // Extract and validate unreleased section with debug info
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
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Changelog validation failed for ${context.name}: ${errorMessage}`,
      );
      throw error;
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

  private compareVersions(a: string, b: string): number {
    const partsA = a.split(/[-+]/, 1)[0].split(".").map(Number);
    const partsB = b.split(/[-+]/, 1)[0].split(".").map(Number);

    for (let i = 0; i < 3; i++) {
      if (partsA[i] > partsB[i]) return 1;
      if (partsA[i] < partsB[i]) return -1;
    }

    // If versions are equal in their numeric parts, compare pre-release tags
    const preA = a.includes("-") ? a.split("-")[1] : "";
    const preB = b.includes("-") ? b.split("-")[1] : "";

    if (!preA && preB) return 1;
    if (preA && !preB) return -1;
    if (preA < preB) return -1;
    if (preA > preB) return 1;

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
    if (format.name === "keep-a-changelog") {
      this.logger.debug("Validating Keep a Changelog format...");

      const foundHeaders = unreleasedSection
        .split("\n")
        .filter((line) => line.startsWith("###"))
        .map((line) => line.trim());

      this.logger.debug("Found section headers:", foundHeaders);

      // Only validate that if a section exists, it matches one of the allowed headers
      if (foundHeaders.length > 0) {
        for (const header of foundHeaders) {
          if (!format.sectionHeaders.includes(header)) {
            throw new Error(
              `Invalid changelog format in ${packageName}: invalid section header "${header}" in Unreleased. Must be one of: ${format.sectionHeaders.join(", ")}`,
            );
          }
        }
      } else {
        throw new Error(
          `Invalid changelog format in ${packageName}: Unreleased section must contain at least one valid section header`,
        );
      }
    }
  }
}
