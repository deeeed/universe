import { jest } from "@jest/globals";

// Increase timeout for integration tests
jest.setTimeout(10000);

// Set up environment for ESM
process.env.NODE_ENV = "test";
process.env.JEST_WORKER_ID = "1";

// Optional: Set up package root for consistent path resolution
process.env.PACKAGE_ROOT = process.cwd();

// Silence console logs during tests (optional)
// const mockConsole = {
//   log: jest.fn(),
//   info: jest.fn(),
//   error: jest.fn(),
//   warn: jest.fn(),
// } as unknown as Console;

// global.console = mockConsole;
