// Increase timeout for all tests
jest.setTimeout(10000);

// Silence console logs during tests
const mockConsole = {
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
} as unknown as Console;

global.console = mockConsole;
