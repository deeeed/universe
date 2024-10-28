# Contributing to @siteed/react-native-logger

This is my logging library for React Native. While I maintain this primarily for my own projects, I welcome contributions. This document serves as a reminder of the release process and guidelines for potential contributors.

## For Me (Release Process)

Quick reminder of how to create a new release:

1. Add changes to `CHANGELOG.md` under `[Unreleased]`:
   ```markdown
   ## [Unreleased]

   ### Added
   - Cool new feature I added

   ### Changed
   - Something I updated

   ### Removed
   - Stuff I removed
   ```

2. Run the release script:
   ```bash
   ./release.sh
   ```

3. Follow the prompts to:
   - Pick version type (patch/minor/major) or enter custom version
   - Review the changes
   - Confirm and publish

The script handles:
- Version bumping
- Changelog updates
- Git tagging (e.g., `react-native-logger-v1.1.0`)
- Publishing to npm

### Version Bump Cheatsheet

When to use each version type:
- **patch** (1.0.x): Fixed bugs, updated deps
- **minor** (1.x.0): Added new features that don't break anything
- **major** (x.0.0): Made breaking changes

### Troubleshooting

If something goes wrong during release:
- Am I in the right directory? (`packages/react-native-logger`)
- Did I update the changelog?
- Do I need to log in to npm again?
- Are all tests passing?

## For External Contributors

If you'd like to contribute:

1. Fork the repo
2. Create a branch
3. Make your changes
4. Add your changes to `CHANGELOG.md` under `[Unreleased]`
5. Submit a PR

I use [Semantic Versioning](https://semver.org/) for version numbers. When contributing, please:
- Add tests for new features
- Update documentation if needed
- Add your changes to CHANGELOG.md
- Follow the existing code style

For questions or issues, feel free to open a GitHub issue.
