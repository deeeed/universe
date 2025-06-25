# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a monorepo containing multiple packages for mobile and web development, managed with Yarn workspaces. The main packages are:

- **@siteed/design-system**: React Native design system with Material3 theme support
- **@siteed/react-native-logger**: Cross-platform logging library with persistent log history
- **@siteed/publisher**: Monorepo release management tool (moved to separate repo)
- **gitguard**: Smart Git commit hook for consistent commit messages

## Essential Commands

### Development Commands

```bash
# Install all dependencies (must use Yarn)
yarn install

# Build specific package
cd packages/[package-name]
yarn build

# Run tests for a specific package
cd packages/[package-name]
yarn test
yarn test:coverage  # with coverage report

# Lint and typecheck
yarn lint
yarn typecheck

# Run a single test file
cd packages/react-native-logger
yarn test src/logger.core.test.ts
```

### Design System Specific

```bash
cd packages/design-system
yarn storybook           # Start Storybook dev server on port 6060
yarn build:storybook     # Build static Storybook
yarn deploy:storybook    # Deploy to GitHub Pages
```

### React Native Logger Specific

```bash
cd packages/react-native-logger
yarn test                # Run all tests
yarn test:coverage       # Run tests with coverage (must maintain 100%)
yarn build:clean         # Clean build
```

## Architecture Patterns

### Package Structure

Each package follows a consistent structure:
- `src/`: Source TypeScript files
- `dist/`: Built JavaScript files (generated, not in git)
- `package.json`: Package configuration with scripts
- Tests are co-located with source files (`.test.ts` or `.spec.ts`)

### React Native Logger Architecture

The logger uses a state-based architecture with:
- `logger.state.ts`: Centralized state management with support for multiple isolated instances
- `logger.core.ts`: Core functionality including lazy initialization and regex-based namespace matching
- `logger.utils.ts`: Helper functions for string coercion and safe JSON stringification
- `logger.ts`: Main entry point that initializes debug settings on import

Key features:
- Lazy initialization for environment variables (DEBUG)
- Instance isolation via `instanceId` parameter
- Pre-compiled regex for performance
- Optional ANSI color support in development terminals

### Design System Architecture

The design system uses:
- React Native Paper as the base component library
- Material3 theming via `@pchmn/expo-material3-theme`
- i18n support with `react-i18next`
- Storybook for component documentation

### Testing Philosophy

- Jest with TypeScript support via ts-jest
- Tests must maintain 100% coverage for critical packages like react-native-logger
- Test files use `.test.ts` or `.spec.ts` extensions
- Mock localStorage and process.env for environment-specific tests

### Build System

- TypeScript compilation for all packages
- Design system also supports Rollup bundling
- All packages target both CommonJS and ES modules
- Source maps included in builds

### Release Process

Uses @siteed/publisher for release management:
- Conventional commits for automated versioning
- Independent versioning strategy per package
- GitHub releases with changelogs
- NPM publishing with proper access controls

### Git Workflow

- Main branch: `main`
- Clean working directory required for releases
- Conventional commit format enforced
- Lefthook for git hooks (though currently not configured)

## Important Considerations

1. **Yarn Workspaces**: This monorepo uses Yarn v4.6.0. Always use `yarn` commands, not `npm`.

2. **React Native Hoisting**: The root package.json includes nohoist configuration for React Native dependencies to avoid Metro bundler issues.

3. **Test Coverage**: The react-native-logger package maintains 100% test coverage. Any changes must maintain this standard.

4. **TypeScript Strict Mode**: All packages use TypeScript with strict type checking. Ensure proper typing for all code.

5. **Side Effects**: All packages are marked as `sideEffects: false` for tree shaking. Avoid module-level side effects except in entry points.

6. **Publishing**: Packages are published to NPM with public access. Use the publisher tool for releases.

7. **Instance Isolation**: When working with react-native-logger, the new instance isolation feature allows multiple isolated logger configurations via the optional `instanceId` parameter on all public APIs.