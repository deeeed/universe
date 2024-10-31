/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import conventionalChangelog from "conventional-changelog";
import { format as formatDate } from "date-fns";
import { promises as fs } from "fs";
import { PassThrough } from "stream";
import type { PackageContext, ReleaseConfig } from "../../types/config";
import { ChangelogService } from "../changelog";
import path from "path";

// Mock the fs promises API
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    stat: jest.fn(),
  },
}));

// Mock conventional-changelog
jest.mock("conventional-changelog", () => jest.fn());

// Mock WorkspaceService
jest.mock("../workspace", () => ({
  WorkspaceService: jest.fn().mockImplementation(() => ({
    getRootDir: jest.fn().mockResolvedValue("/monorepo/root"),
    readPackageJson: jest.fn().mockResolvedValue({
      repository: "https://github.com/deeeed/universe",
    }),
  })),
}));

const changelogFormats = [
  {
    name: "conventional",
    format: "conventional" as const,
    dateFormat: "yyyy-MM-dd",
    sampleContent: `# Changelog

## [Unreleased]

* feat: New feature A
* fix: Bug fix A

## [1.0.0] - 2024-01-01
* Initial release`,
  },
  {
    name: "keep-a-changelog",
    format: "keep-a-changelog" as const,
    dateFormat: "yyyy-MM-dd",
    sampleContent: `# Changelog

## [Unreleased]

### Added
- New feature X
- New feature Y

### Security
- Security fix A

## [1.0.0] - 2024-01-01

### Added
- Initial release`,
  },
];

describe("ChangelogService", () => {
  let service: ChangelogService;
  let mockContext: PackageContext;
  let mockConfig: ReleaseConfig;
  const ROOT_DIR = "/monorepo/root";

  beforeEach(() => {
    service = new ChangelogService();
    jest.clearAllMocks();

    mockContext = {
      name: "test-package",
      path: path.join(ROOT_DIR, "packages/test-package"),
      currentVersion: "1.0.0",
      newVersion: "1.1.0",
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
    };

    mockConfig = {
      packageManager: "yarn",
      changelogFile: "CHANGELOG.md",
      conventionalCommits: true,
      changelogFormat: "conventional",
      git: {
        tagPrefix: "",
        requireCleanWorkingDirectory: true,
        requireUpToDate: true,
        commit: true,
        push: true,
        commitMessage: `chore(${mockContext.name}): release \${version}`,
        tag: true,
        allowedBranches: ["main", "master"],
        remote: "origin",
        requireUpstreamTracking: true,
      },
      npm: {
        publish: true,
        registry: "https://registry.npmjs.org",
        tag: "latest",
        access: "public",
      },
      hooks: {},
      versionStrategy: "independent",
      bumpStrategy: "prompt",
      packValidation: {
        enabled: true,
        validateFiles: true,
        validateBuildArtifacts: true,
        requiredFiles: undefined,
      },
      updateDependenciesOnRelease: true,
      dependencyUpdateStrategy: "prompt",
      bumpType: "minor",
      preReleaseId: "beta",
      repository: {
        directory: "packages/publisher",
        url: "https://github.com/deeeed/universe",
      },
    };
  });

  describe("generate", () => {
    it("should generate changelog content using conventional format", async () => {
      const mockStream = new PassThrough();
      (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);

      const changelogPromise = service.generate(mockContext, mockConfig);
      mockStream.write("* feat: New stuff\n");
      mockStream.end();

      const result = await changelogPromise;
      expect(result).toBe("### Added\n- New stuff\n");
    });

    it("should handle errors during generation", async () => {
      const mockStream = new PassThrough();
      (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);

      const changelogPromise = service.generate(mockContext, mockConfig);
      mockStream.emit("error", new Error("Generation failed"));

      await expect(changelogPromise).rejects.toThrow("Generation failed");
    });
  });

  describe("update", () => {
    it("should update existing changelog file", async () => {
      const existingContent = `# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2024-01-01\n\n* Initial release\n`;
      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const newContent = "### Added\n- Something new";
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      expect(writeCall?.[0]).toBe(path.join(mockContext.path, "CHANGELOG.md"));
      const content = writeCall?.[1] as string;
      expect(content).toContain(`## [${mockContext.newVersion}]`);
      expect(content).toContain("### Added\n- Something new");
      expect(content).toContain("## [1.0.0]");
    });

    it("should prevent duplicate version entries", async () => {
      const duplicateContent = `# Changelog

## [0.4.8]

## [0.4.8] - 2024-10-30

- last call before release

- last call before release
`;
      (fs.readFile as jest.Mock).mockResolvedValueOnce(duplicateContent);

      const newContent = "### Added\n- Something new";
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall?.[1] as string;

      // Should only have one version entry
      const versionMatches = content.match(/## \[0\.4\.8\]/g);
      expect(versionMatches?.length).toBe(1);

      // Should only have one instance of the changelog entry
      const entryMatches = content.match(/- last call before release/g);
      expect(entryMatches?.length).toBe(1);
    });

    it("should handle version entries with and without dates", async () => {
      const mixedContent = `# Changelog

## [0.4.8]
## [0.4.8] - 2024-10-30

- last call before release
`;
      (fs.readFile as jest.Mock).mockResolvedValueOnce(mixedContent);

      const newContent = "### Added\n- Something new";
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall?.[1] as string;

      // Should consolidate into a single version entry with date
      expect(content).toMatch(/## \[0\.4\.8\] - 2024-10-30/);
      expect(content).not.toMatch(/## \[0\.4\.8\]\n/);
    });

    it("should handle migration from unreleased to new version correctly", async () => {
      const existingContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- fix: invalid changelog format

## [0.4.11] - 2024-10-31
- ⚠️ **WARNING: DEVELOPMENT IN PROGRESS** ⚠️

## [0.4.10] - 2024-10-30
- dry run mode
- feat: dry run mode

[unreleased]: https://github.com/deeeed/universe/compare/@siteed/publisher@0.4.11...HEAD
[0.4.11]: https://github.com/deeeed/universe/compare/@siteed/publisher@0.4.10...@siteed/publisher@0.4.11
[0.4.10]: https://github.com/deeeed/universe/compare/@siteed/publisher@0.4.9...@siteed/publisher@0.4.10`;

      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const mockContext: PackageContext = {
        name: "@siteed/publisher",
        path: "/test/path",
        currentVersion: "0.4.11",
        newVersion: "0.4.12",
      };

      const testConfig: ReleaseConfig = {
        ...mockConfig,
        git: {
          ...mockConfig.git,
          tagPrefix: "",
        },
      };

      await service.update(
        mockContext,
        "- fix: invalid changelog format",
        testConfig,
      );

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const updatedContent = writeCall?.[1] as string;

      // Verify the structure of the updated changelog
      expect(updatedContent).toContain("## [Unreleased]");
      expect(updatedContent).toContain("## [0.4.12] - ");

      // Verify no duplicate version entries
      const versionMatches = updatedContent.match(/## \[0\.4\.12\]/g);
      expect(versionMatches?.length).toBe(1);

      // Verify the comparison links
      const expectedLinks = [
        "[unreleased]: https://github.com/deeeed/universe/compare/@siteed/publisher@0.4.12...HEAD",
        "[0.4.12]: https://github.com/deeeed/universe/compare/@siteed/publisher@0.4.11...@siteed/publisher@0.4.12",
        "[0.4.11]: https://github.com/deeeed/universe/compare/@siteed/publisher@0.4.10...@siteed/publisher@0.4.11",
        "[0.4.10]: https://github.com/deeeed/universe/compare/@siteed/publisher@0.4.9...@siteed/publisher@0.4.10",
      ];

      // Check each link exists exactly once
      expectedLinks.forEach((link) => {
        const linkMatches = updatedContent.match(
          new RegExp(escapeRegExp(link), "g"),
        );
        expect(linkMatches?.length).toBe(1);
      });

      // Verify content order
      const sections = updatedContent.split("\n\n");
      expect(sections[0]).toContain("# Changelog");
      expect(sections.find((s) => s.includes("## [Unreleased]"))).toBeTruthy();
      expect(sections.find((s) => s.includes("## [0.4.12]"))).toBeTruthy();
    });
  });

  describe.each(changelogFormats)(
    "$name format specific tests",
    ({ format, sampleContent }) => {
      beforeEach(() => {
        mockConfig.changelogFormat = format;
      });

      describe("validation", () => {
        it("should validate a valid changelog", async () => {
          const validContent =
            mockConfig.changelogFormat === "conventional"
              ? `# Changelog

## [Unreleased]
* feat: New feature in development

## [1.0.0] - 2024-01-01
* Initial release`
              : `# Changelog

## [Unreleased]

### Added
- New feature in development

## [1.0.0] - 2024-01-01

### Added
- Initial release`;

          (fs.stat as jest.Mock).mockResolvedValue({ isFile: () => true });
          (fs.readFile as jest.Mock).mockResolvedValue(validContent);

          await expect(
            service.validate(mockContext, mockConfig),
          ).resolves.not.toThrow();

          // Verify the correct path was used
          expect(fs.stat).toHaveBeenCalledWith(
            path.join(mockContext.path, "CHANGELOG.md"),
          );
        });
      });

      describe("preview generation", () => {
        it(`should preview ${format} format with unreleased changes`, async () => {
          (fs.readFile as jest.Mock).mockResolvedValueOnce(sampleContent);
          mockContext.newVersion = "1.1.0";

          const preview = await service.previewChangelog(
            mockContext,
            mockConfig,
          );

          expect(preview).toContain("## [1.1.0]");
          if (format === "conventional") {
            expect(preview).toContain("### Added");
            expect(preview).toContain("- New feature A");
            expect(preview).toContain("### Fixed");
            expect(preview).toContain("- Bug fix A");
          } else {
            expect(preview).toContain("### Added");
            expect(preview).toContain("- New feature X");
            expect(preview).toContain("- New feature Y");
            expect(preview).toContain("### Security");
            expect(preview).toContain("- Security fix A");
          }
          expect(preview).toMatch(/\d{4}-\d{2}-\d{2}/);
        });

        it("should generate from git commits when no unreleased changes exist", async () => {
          const mockContent = `# Changelog\n\n## [1.0.0] - 2024-01-01\n- Initial release\n`;
          (fs.readFile as jest.Mock).mockResolvedValueOnce(mockContent);
          mockContext.newVersion = "1.1.0";

          const mockStream = new PassThrough();
          (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);

          const previewPromise = service.previewChangelog(
            mockContext,
            mockConfig,
          );
          mockStream.write("* feat: New feature from git\n");
          mockStream.write("* fix: Bug fix from git\n");
          mockStream.end();

          const preview = await previewPromise;

          expect(preview).toContain("## [1.1.0]");
          if (format === "conventional") {
            expect(preview).toContain("### Added");
            expect(preview).toContain("- New feature from git");
            expect(preview).toContain("### Fixed");
            expect(preview).toContain("- Bug fix from git");
          } else {
            // Keep-a-changelog format
            expect(preview).toContain("### Added");
            expect(preview).toContain("- New feature from git");
            expect(preview).toContain("### Fixed");
            expect(preview).toContain("- Bug fix from git");
            expect(preview).toContain("### Changed");
            expect(preview).toContain("### Deprecated");
            expect(preview).toContain("### Removed");
            expect(preview).toContain("### Security");
          }
          expect(preview).toMatch(/\d{4}-\d{2}-\d{2}/);
        });

        it("should handle empty changelog with no git commits", async () => {
          const mockContent = `# Changelog`;
          (fs.readFile as jest.Mock).mockResolvedValueOnce(mockContent);
          mockContext.newVersion = "1.1.0";

          const mockStream = new PassThrough();
          (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);
          mockStream.end();

          const preview = await service.previewChangelog(
            mockContext,
            mockConfig,
          );

          if (format === "keep-a-changelog") {
            // Keep-a-changelog format should show all sections
            const expectedSections = [
              "### Added",
              "### Changed",
              "### Deprecated",
              "### Removed",
              "### Fixed",
              "### Security",
            ];
            expectedSections.forEach((section) => {
              expect(preview).toContain(section);
            });
          } else {
            expect(preview).toContain("No changes recorded");
          }
          expect(preview).toMatch(/\d{4}-\d{2}-\d{2}/);
        });

        it("should handle malformed changelog gracefully", async () => {
          const mockContent = `Invalid changelog content`;
          (fs.readFile as jest.Mock).mockResolvedValueOnce(mockContent);
          mockContext.newVersion = "1.1.0";

          const preview = await service.previewChangelog(
            mockContext,
            mockConfig,
          );
          expect(preview).toContain("## [1.1.0]");
          expect(preview).toContain("No changes recorded");
        });

        it("should handle missing changelog file", async () => {
          (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error("ENOENT"));
          mockContext.newVersion = "1.1.0";

          // Mock conventional-changelog for fallback
          const mockStream = new PassThrough();
          (conventionalChangelog as jest.Mock).mockReturnValue(mockStream);
          mockStream.end();

          const preview = await service.previewChangelog(
            mockContext,
            mockConfig,
          );

          expect(preview).toContain("## [1.1.0]");
          expect(preview).toContain("No changes recorded");
        });

        it("should preserve section order in keep-a-changelog format", async () => {
          const mockContent = `# Changelog

## [Unreleased]

### Security
- Security update
### Added
- New feature
### Changed
- Updated something
### Deprecated
- Old feature
### Removed
- Unused code
### Fixed
- Bug fix

## [1.0.0] - 2024-01-01
- Initial release
`;
          (fs.readFile as jest.Mock).mockResolvedValueOnce(mockContent);
          mockContext.newVersion = "1.1.0";
          mockConfig.changelogFormat = "keep-a-changelog";

          const preview = await service.previewChangelog(
            mockContext,
            mockConfig,
          );

          const sections = [
            "### Added",
            "### Changed",
            "### Deprecated",
            "### Removed",
            "### Fixed",
            "### Security",
          ];

          // Check that sections appear in the correct order
          let lastIndex = -1;
          for (const section of sections) {
            const currentIndex = preview.indexOf(section);
            expect(currentIndex).toBeGreaterThan(lastIndex);
            lastIndex = currentIndex;
          }
        });
      });

      describe("comparison links", () => {
        it(`should add comparison links for ${format} format`, async () => {
          const existingContent = `# Changelog\n\n## [1.0.0] - 2024-01-01\n`;
          (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

          // Update mockContext to match the test expectations
          const mockContext: PackageContext = {
            name: "test-package",
            path: "/test/path",
            currentVersion: "1.0.0",
            newVersion: "1.1.0",
          };

          // Ensure git.tagPrefix is set to "v" for these specific tests
          const testConfig: ReleaseConfig = {
            ...mockConfig,
            git: {
              ...mockConfig.git,
              tagPrefix: "v", // Explicitly set to "v" for these tests
            },
          };

          await service.update(mockContext, "* feat: Feature A", testConfig);

          const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
          const content = writeCall?.[1] as string;

          // Update expectations to match the config
          expect(content).toContain(
            `[unreleased]: https://github.com/deeeed/universe/compare/vtest-package@${mockContext.newVersion}...HEAD`,
          );
          expect(content).toContain(
            `[${mockContext.newVersion}]: https://github.com/deeeed/universe/compare/vtest-package@${mockContext.currentVersion}...vtest-package@${mockContext.newVersion}`,
          );
        });
      });
    },
  );

  describe("error handling", () => {
    it("should handle missing changelog file", async () => {
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error("ENOENT"));
      mockContext.newVersion = "1.1.0";

      const preview = await service.previewChangelog(mockContext, mockConfig);
      expect(preview).toContain("## [1.1.0]");
      expect(preview).toContain("No changes recorded");
    });
  });

  describe("version handling", () => {
    it("should prevent duplicate version entries", async () => {
      const duplicateContent = `# Changelog

## [0.4.8]

## [0.4.8] - 2024-10-30

- last call before release

- last call before release
`;
      (fs.readFile as jest.Mock).mockResolvedValueOnce(duplicateContent);

      const newContent = "### Added\n- Something new";
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall?.[1] as string;

      // Should only have one version entry
      const versionMatches = content.match(/## \[0\.4\.8\]/g);
      expect(versionMatches?.length).toBe(1);

      // Should only have one instance of the changelog entry
      const entryMatches = content.match(/- last call before release/g);
      expect(entryMatches?.length).toBe(1);
    });

    it("should handle version entries with and without dates", async () => {
      const mixedContent = `# Changelog

## [0.4.8]
## [0.4.8] - 2024-10-30

- last call before release
`;
      (fs.readFile as jest.Mock).mockResolvedValueOnce(mixedContent);

      const newContent = "### Added\n- Something new";
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall?.[1] as string;

      // Should consolidate into a single version entry with date
      expect(content).toMatch(/## \[0\.4\.8\] - 2024-10-30/);
      expect(content).not.toMatch(/## \[0\.4\.8\]\n/);
    });
  });

  describe("date formatting", () => {
    beforeEach(() => {
      // Mock the current date to ensure consistent testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-03-15"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should format dates according to default format (yyyy-MM-dd)", async () => {
      const existingContent = `# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2024-01-01\n`;
      (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

      const newContent = "### Added\n- Something new";
      await service.update(mockContext, newContent, mockConfig);

      const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
      const content = writeCall?.[1] as string;
      expect(content).toContain(`## [${mockContext.newVersion}] - 2024-03-15`);
    });

    it.each(changelogFormats)(
      "should validate dates in $name format",
      async ({ format, dateFormat }) => {
        const validContent = `# Changelog
## [Unreleased]

### Added
- New feature in development

## [2.0.0] - ${formatDate(new Date(), dateFormat)}
`;
        (fs.stat as jest.Mock).mockResolvedValue({ isFile: () => true });
        (fs.readFile as jest.Mock).mockResolvedValue(validContent);

        mockConfig.changelogFormat = format;

        await expect(
          service.validate(mockContext, mockConfig),
        ).resolves.not.toThrow();
      },
    );

    it.each(changelogFormats)(
      "should reject invalid dates in $name format",
      async ({ format }) => {
        const invalidContent = `# Changelog
## [Unreleased]

### Added
- New feature in development

## [2.0.0] - 2024-13-45
`;
        (fs.stat as jest.Mock).mockResolvedValue({ isFile: () => true });
        (fs.readFile as jest.Mock).mockResolvedValue(invalidContent);

        mockConfig.changelogFormat = format;

        await expect(service.validate(mockContext, mockConfig)).rejects.toThrow(
          "Invalid date format in version header in test-package",
        );
      },
    );

    describe("preview generation", () => {
      it.each(changelogFormats)(
        "should include correctly formatted date in $name format preview",
        async ({ format, dateFormat }) => {
          mockConfig.changelogFormat = format;
          const expectedDate = formatDate(new Date(), dateFormat);

          const preview = await service.previewChangelog(
            mockContext,
            mockConfig,
          );

          expect(preview).toContain(
            `## [${mockContext.newVersion}] - ${expectedDate}`,
          );
        },
      );
    });

    describe("update", () => {
      it.each(changelogFormats)(
        "should maintain consistent date format in $name format",
        async ({ format, dateFormat }) => {
          mockConfig.changelogFormat = format;
          const existingContent = `# Changelog

## [Unreleased]

## [1.0.0] - ${formatDate(new Date("2024-01-01"), dateFormat)}
`;
          (fs.readFile as jest.Mock).mockResolvedValueOnce(existingContent);

          const newContent = "### Added\n- Something new";
          await service.update(mockContext, newContent, mockConfig);

          const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
          const content = writeCall?.[1] as string;
          const expectedDate = formatDate(new Date(), dateFormat);

          expect(content).toContain(
            `## [${mockContext.newVersion}] - ${expectedDate}`,
          );
          expect(content).toContain(
            `## [1.0.0] - ${formatDate(new Date("2024-01-01"), dateFormat)}`,
          );
        },
      );

      it("should handle version entries with different date formats", async () => {
        const mixedContent = `# Changelog

## [Unreleased]

## [0.4.8] - 2024-01-01
## [0.4.7] - Jan 1, 2024

- last call before release
`;
        (fs.readFile as jest.Mock).mockResolvedValueOnce(mixedContent);

        const newContent = "### Added\n- Something new";
        await service.update(mockContext, newContent, mockConfig);

        const writeCall = (fs.writeFile as jest.Mock).mock.calls[0];
        const content = writeCall?.[1] as string;

        // Should standardize to the configured date format
        expect(content).toMatch(/## \[0\.4\.8\] - 2024-01-01/);
        expect(content).toMatch(/## \[0\.4\.7\] - 2024-01-01/);
      });
    });
  });

  describe("previewNewVersion", () => {
    describe.each(changelogFormats)("$name format tests", ({ format }) => {
      beforeEach(() => {
        mockConfig.changelogFormat = format;
      });

      it.each([true, false])(
        "should handle empty sections (%s)",
        async (includeEmpty) => {
          // Use appropriate content for the conventional format
          const content =
            format === "conventional"
              ? `# Changelog

## [Unreleased]
* feat: New feature
* fix: Security fix
`
              : `# Changelog

## [Unreleased]
### Added
- New feature
### Security
- Security fix
`;

          (fs.readFile as jest.Mock).mockResolvedValueOnce(content);

          const preview = await service.previewNewVersion(
            mockContext,
            mockConfig,
            {
              newVersion: "1.1.0",
              conventionalCommits: false,
              format: format,
              includeEmptySections: includeEmpty,
              date: "2024-10-30",
            },
          );

          // For conventional format, we should directly include the unreleased content
          if (format === "conventional") {
            expect(preview).toContain("* feat: New feature");
            expect(preview).toContain("* fix: Security fix");
          } else {
            // For keep-a-changelog format
            expect(preview).toContain("### Added\n- New feature");
            expect(preview).toContain("### Security\n- Security fix");

            const optionalSections = [
              "### Changed",
              "### Deprecated",
              "### Removed",
              "### Fixed",
            ];

            if (includeEmpty) {
              optionalSections.forEach((section) => {
                expect(preview).toContain(section);
              });
            } else {
              optionalSections.forEach((section) => {
                expect(preview).not.toContain(section);
              });
            }
          }
        },
      );

      it("should handle duplicate version entries", async () => {
        const content =
          format === "conventional"
            ? `# Changelog

## [Unreleased]
* feat: Feature A

## [1.0.0]
## [1.0.0] - 2024-10-29
`
            : `# Changelog

## [Unreleased]
### Added
- Feature A

## [1.0.0]
## [1.0.0] - 2024-10-29
`;

        (fs.readFile as jest.Mock).mockResolvedValueOnce(content);

        const preview = await service.previewNewVersion(
          mockContext,
          mockConfig,
          {
            newVersion: "1.1.0",
            conventionalCommits: false,
            format: format,
            date: "2024-10-30",
          },
        );

        expect(preview).toContain(`## [1.1.0] - 2024-10-30`);

        if (format === "conventional") {
          expect(preview).toContain("* feat: Feature A");
        } else {
          expect(preview).toContain("### Added\n- Feature A");
        }
      });
    });
  });
});

// Helper function to escape special characters in string for regex
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
