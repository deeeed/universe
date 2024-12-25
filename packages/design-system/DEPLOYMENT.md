# Deployment Guide

This document outlines the deployment process for the @siteed/design-system package.

## Release Process

We use the `publisher` CLI tool to manage releases and changelogs. This ensures consistent versioning and documentation across all packages.

### Preview Changes

Before creating a release, you can preview the changelog updates:

```bash
publisher changelog preview
```

### Update Changelog

To update the changelog with new changes:

```bash
publisher changelog update
```

### Create a Release

To create and publish a new release:

```bash
publisher release
```

This command will:
1. Validate all changes
2. Update the changelog
3. Bump the version number
4. Create a git tag
5. Deploy the new version to npm

## Storybook Deployment

The Storybook documentation is automatically deployed as part of the release process. You can manually deploy it using:

```bash
yarn deploy:storybook
```

## Version Management

- All version bumps are handled automatically by the publisher tool
- Versions follow semantic versioning (MAJOR.MINOR.PATCH)
- The changelog is automatically generated based on conventional commit messages

## Troubleshooting

If you encounter issues during deployment:

1. Ensure all tests pass: `yarn test`
2. Verify the build succeeds: `yarn build`
3. Check that you have the necessary permissions for npm publishing
4. Ensure your git working directory is clean 
