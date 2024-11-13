import { jest } from "@jest/globals";

// Already has the timeout for unit tests
jest.setTimeout(5000);

// Silence console logs during tests
const mockConsole = {
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
} as unknown as Console;

global.console = mockConsole;
