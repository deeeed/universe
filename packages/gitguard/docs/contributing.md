# Contributing to GitGuard

## Getting Started with Development

To start contributing to GitGuard, follow these steps:

1. Clone the repository:

```bash
git clone https://github.com/deeeed/universe.git
cd universe/packages/gitguard
```

2. Install dependencies:

```bash
yarn install
```

3. Set up the development environment:

```bash
yarn setup
```
This script will:
- Build the package
- Create necessary symlinks
- Add GitGuard to your PATH
- Enable local development

4. Start developing!

```bash
yarn dev
```
The `dev` command runs GitGuard directly from source, allowing you to:
- Make changes and see them immediately
- Debug your code
- Test new features

You can also run specific E2E scenarios to test your changes:

```bash
# Use the --debug flag for verbose logging
yarn test:e2e
```

## Testing Infrastructure

GitGuard uses a comprehensive testing approach with three levels:

1. Unit Tests
2. Integration Tests
3. End-to-End (E2E) Scenario Tests

### E2E Scenario Tests

The most powerful testing feature in GitGuard is the E2E scenario runner, which creates complete Git environments to simulate real-world usage. These tests are located in `packages/gitguard/e2e/scenarios/`.

#### How Scenarios Work

Each scenario creates an isolated Git environment with:
- Predefined file structures
- Git history and branches
- Configuration files
- Staged/unstaged changes

The test runner (referenced in `runner.ts`) manages:
- Creating temporary directories
- Initializing Git repositories
- Setting up test files
- Running commands
- Verifying results
- Cleaning up test environments

### Test Coverage

> ⚠️ **Note on Coverage Reports**: I'm currently working on improving the test coverage infrastructure. There are some technical challenges with Jest and ESM setup specifically for mocking in unit and integration tests. The E2E scenarios are working perfectly and provide excellent functional coverage.

#### Current Status

- E2E scenarios provide comprehensive functional coverage
- ESM compatibility issues with Jest mocking in unit/integration tests
- Dynamic imports affecting mock coverage collection
- Some advanced mocking scenarios not working as expected with ESM

I encourage contributors to:
- Add tests for new features (especially E2E scenarios)
- Improve existing test scenarios
- Help identify gaps in test coverage

While I work on fixing the unit/integration test infrastructure, please focus on:
1. Adding comprehensive E2E scenarios for new features (see examples in `e2e/scenarios/`)
2. Writing basic unit tests that don't require complex mocking
3. Including integration tests where ESM mocking isn't needed

