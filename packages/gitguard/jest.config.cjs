/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  projects: [
    {
      displayName: "unit",
      testMatch: ["<rootDir>/src/**/*.test.ts"],
      testPathIgnorePatterns: [".*\\.integration\\.test\\.ts$"],
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          {
            useESM: true,
            tsconfig: "tsconfig.test.json",
          },
        ],
      },
      moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
        "@siteed/gitguard/(.*)": "<rootDir>/src/$1",
      },
      testEnvironment: "node",
      extensionsToTreatAsEsm: [".ts"],
      moduleFileExtensions: ["ts", "js", "json", "node"],
      rootDir: ".",
      moduleDirectories: ["node_modules", "src"],
    },
    {
      displayName: "integration",
      testMatch: ["<rootDir>/src/**/*.integration.test.ts"],
      setupFilesAfterEnv: ["<rootDir>/jest.integration.setup.ts"],
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          {
            useESM: true,
            tsconfig: "tsconfig.test.json",
          },
        ],
      },
      moduleNameMapper: {
        "@siteed/gitguard/(.*)": "<rootDir>/src/$1",
        "^(\\.{1,2}/.*)\\.js$": "$1",
      },
      testEnvironment: "node",
      extensionsToTreatAsEsm: [".ts"],
      moduleFileExtensions: ["ts", "js", "json", "node"],
      rootDir: ".",
      moduleDirectories: ["node_modules", "src"],
    },
  ],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
};

module.exports = config;
