# @siteed/publisher

A monorepo-aware release management tool that streamlines the process of versioning, changelog management, and package publishing. This tool is specifically designed to handle multiple packages in a monorepo setup with a focus on TypeScript projects.

## Project Structure

```
src/
├── commands/           # CLI command implementations
│   ├── init.ts        # Initialize release configuration for packages
│   ├── release.ts     # Execute release process
│   └── validate.ts    # Validate release readiness
│
├── core/              # Core business logic
│   ├── changelog.ts   # Changelog generation and management
│   ├── config.ts      # Configuration loading and validation
│   ├── git.ts         # Git operations (tags, commits)
│   ├── init.ts        # Initialization service
│   ├── npm.ts         # NPM publishing operations
│   ├── release.ts     # Main release orchestration
│   ├── version.ts     # Version management
│   └── workspace.ts   # Monorepo workspace operations
│
├── types/             # TypeScript type definitions
│   └── config.ts      # Configuration types
│
└── utils/             # Shared utilities
    ├── logger.ts      # Logging functionality
    └── prompt.ts      # Interactive CLI prompts
```

## Key Components

### Commands
- **init**: Sets up release configuration for packages
- **release**: Handles the release process
- **validate**: Checks if packages are ready for release

### Core Services
- **ChangelogService**: Manages changelog generation and updates
- **ConfigService**: Handles configuration loading and validation
- **GitService**: Manages Git operations (tags, commits, branches)
- **InitService**: Handles initialization of new packages
- **NpmService**: Manages NPM publishing
- **ReleaseService**: Orchestrates the release process
- **VersionService**: Handles version bumping and management
- **WorkspaceService**: Manages monorepo workspace operations

## Usage Example

```bash
# Initialize a package
publisher init @scope/package-name

# Release a package
publisher publish @scope/package-name

# Validate release readiness
publisher validate @scope/package-name
```

## Configuration

Each package can have its own `publisher.config.ts`:
```typescript
import type { ReleaseConfig } from '@siteed/publisher';

export default {
  packageManager: 'yarn',
  changelogFile: 'CHANGELOG.md',
  git: {
    tagPrefix: 'my-package-v',
    requireCleanWorkingDirectory: true
  },
  npm: {
    publish: true,
    access: 'public'
  }
} satisfies ReleaseConfig;
```

## Key Features

1. **Monorepo Support**
   - Handles multiple packages
   - Manages interdependencies
   - Configurable per package

2. **Version Management**
   - Semantic versioning support
   - Automated version bumping
   - Dependencies update

3. **Changelog Management**
   - Automated changelog generation
   - Conventional commits support
   - Link generation between versions

4. **Git Integration**
   - Smart tagging
   - Clean working directory validation
   - Branch protection

5. **NPM Publishing**
   - Access control
   - Registry configuration
   - Authentication handling

## Next Steps for Development

