# New Release Workflow using @siteed/publisher
This document outlines the recommended approach for publishing packages in our monorepo using `@siteed/publisher`.

## Recommended Approach: Using @siteed/publisher

Install the package:
```bash
yarn add -D @siteed/publisher
```

### Setup

1. Initialize publisher configuration:
```bash
yarn publisher init
yarn publisher release
```

----------------

## Legacy Methods (Deprecated)

> Note: The following methods are kept for historical reference but are no longer recommended.

### Migrate away from release-it.js

Historically I was using release-it to auto publish package, while it works fine with npm on single package, I find it buggy with monorepo.
This document is a wip of new steps to publish packages in monorepo.

## Steps

TODO: Create script that
- first check if current package version is already published
- IF NOT PUBLISHED --> bump version in package.json (Minor, Major, Patch)
- commit any pending changes
- run `yarn build`
- run `yarn test`
- update changelogs based on last commits (pending user approval and allow for editing)
- create a new git tag
- cleanup branches?
- run `yarn release`
- Add to CI/CD pipeline


## Current Example with design system
```bash
cd packages/design-system
./release.sh
```


## Publish logger package
```bash
# cd packages/react-native-logger
version=$(node -p "require('./package.json').version")
git add .
git commit -m "feat(react-native-logger): bump version $version"
yarn release
```
