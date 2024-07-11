# Publishing Monorepo Packages

## Migrate away from release-it.js

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
packages/design-system
yarn version patch
git commit -m 'feat(design-system): bump version x.x.x'
yarn release
```
