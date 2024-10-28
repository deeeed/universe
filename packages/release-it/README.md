# @siteed/release-it

A flexible and powerful release management tool designed for JavaScript/TypeScript monorepos. Automates version management, changelog generation, and package publishing with support for various package managers and CI/CD workflows.

## Features

- 🎯 **Monorepo-aware**: Handles dependencies and versioning across workspace packages
- 🔄 **Flexible Workflows**: Supports different release strategies (independent/fixed/custom)
- 📦 **Package Manager Agnostic**: Works with npm, Yarn, and pnpm
- 🔧 **Highly Configurable**: Customize every aspect of your release process
- 🤖 **CI/CD Ready**: Automate releases in your CI/CD pipeline
- 📝 **Smart Changelog**: Generates and maintains changelogs automatically
- 🪝 **Hooks**: Pre and post-release hooks for custom tasks
- 🔍 **Validation**: Ensures releases are safe and consistent

## Installation

```bash
# npm
npm install -D @siteed/release-it

# yarn
yarn add -D @siteed/release-it

# pnpm 
pnpm add -D @siteed/release-it
```

## Quick Start

1. Initialize release configuration in your package:
```bash
npx release-it init
```

2. Configure release-it.config.ts:
```typescript
import { ReleaseConfig } from '@siteed/release-it';

export default {
  packageManager: 'yarn',
  changelogFile: 'CHANGELOG.md',
  git: {
    tagPrefix: 'v',
    requireCleanWorkingDirectory: true,
    commit: true,
    push: true
  },
  hooks: {
    preRelease: async () => {
      await exec('yarn test');
      await exec('yarn build');
    },
    postRelease: async () => {
      await exec('yarn deploy:docs');
    }
  }
} satisfies ReleaseConfig;
```

3. Release your package:
```bash
npx release-it release
```

## Configuration

### Global Configuration
Create a `.release-it.config.ts` in your root directory for monorepo-wide settings:

```typescript
import { MonorepoConfig } from '@siteed/release-it';

export default {
  versionStrategy: 'independent',
  conventionalCommits: true,
  packageManager: 'yarn',
  gitFlow: false,
  packages: {
    'packages/*': {
      // Default package configuration
    }
  }
} satisfies MonorepoConfig;
```

### Package-specific Configuration
Each package can have its own `release-it.config.ts`:

```typescript
export default {
  tagPrefix: 'my-package-v',
  npm: {
    publish: true,
    registry: 'https://registry.npmjs.org'
  },
  hooks: {
    // Package-specific hooks
  }
};
```

## Usage

```bash
# Show available commands
release-it --help

# Initialize configuration
release-it init [package]

# Release a specific package
release-it release my-package

# Release multiple packages
release-it release pkg1 pkg2

# Release all packages that have changes
release-it release --all

# Dry run
release-it release --dry-run

# Custom version
release-it release --version 1.2.3
```

## Advanced Features

- **Version Strategies**
  - Independent: Each package versioned independently
  - Fixed: All packages share the same version
  - Custom: Define your own versioning logic

- **Changelog Generation**
  - Conventional commits support
  - Custom templates
  - Multi-package changelogs

- **Git Integration**
  - Smart tagging
  - Branch protection
  - Custom commit messages

- **CI/CD Integration**
  - Non-interactive mode
  - Environment variable support
  - Custom authentication

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT © Arthur Breton
