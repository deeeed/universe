export const conventionalChangelogTemplate = `# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

[unreleased]: https://github.com/owner/repo/tree/HEAD`;

export const keepAChangelogTemplate = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release

### Changed

### Deprecated

### Removed

### Fixed

### Security

[unreleased]: https://github.com/owner/repo/tree/HEAD`;

export function getChangelogTemplate(
  format: "conventional" | "keep-a-changelog",
): string {
  return format === "conventional"
    ? conventionalChangelogTemplate
    : keepAChangelogTemplate;
}
