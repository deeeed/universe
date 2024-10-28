# Contributing to @siteed/design-system

While I maintain this primarily for my own projects, I welcome contributions. This document serves as a reminder of the release process and guidelines for potential contributors.

## For Me (Release Process)

Quick reminder of how to create a new release:

1. Add changes to `CHANGELOG.md` under `[Unreleased]`:
   ```markdown
   ## [Unreleased]

   ### Added
   - New component I created
   - Cool new variant for existing component

   ### Changed
   - Updated styling for Component X
   - Improved accessibility for Component Y

   ### Removed
   - Deprecated Component Z
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
- Git tagging (e.g., `design-system-v0.29.5`)
- Storybook deployment
- Publishing to npm

### Version Bump Cheatsheet

When to use each version type:
- **patch** (0.29.x): 
  - Bug fixes
  - Documentation updates
  - Minor style tweaks
  - Updated dependencies
- **minor** (0.x.0): 
  - New components
  - New features to existing components
  - New variants/props that don't break existing usage
- **major** (x.0.0): 
  - Breaking changes to component APIs
  - Major styling overhaul
  - Removing/renaming components

### Component Development

Remember to:
1. Add new components in `src/components`
2. Create a story in `src/stories` for each component
3. Add exports to `src/index.ts`
4. Test in Storybook locally: `yarn storybook`

### Troubleshooting

If something goes wrong during release:
- Am I in the right directory? (`packages/design-system`)
- Did I update the changelog?
- Is Storybook working locally?
- Did I export new components in index.ts?
- Are all tests passing?
- Do I need to log in to npm again?

## For External Contributors

If you'd like to contribute:

1. Fork the repo
2. Create a branch
3. Make your changes
4. Add your changes to `CHANGELOG.md` under `[Unreleased]`
5. Create/update stories for visual testing
6. Submit a PR

Component Guidelines:
- Use TypeScript
- Include proper prop types and documentation
- Create a Storybook story for each component
- Follow existing styling patterns
- Consider accessibility
- Test in different viewports

For questions or issues, feel free to open a GitHub issue.

## Local Development

```bash
# Install dependencies
yarn install

# Start Storybook
yarn storybook

# Run tests
yarn test

# Build
yarn build

# Typecheck
yarn typecheck
```

## Before Each Release
- Check all stories in Storybook
- Ensure documentation is up to date
- Run typechecks and tests
- Update CHANGELOG.md
