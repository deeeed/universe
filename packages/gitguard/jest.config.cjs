/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  projects: [
    {
      displayName: "unit",
      testMatch: [
        "<rootDir>/src/**/*.test.ts",
        "!<rootDir>/src/**/*.integration.test.ts",
      ],
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          {
            useESM: true,
          },
        ],
      },
      moduleNameMapper: {
        "@siteed/gitguard": "<rootDir>/src",
        "(.+)\\.js": "$1",
      },
      testEnvironment: "node",
      extensionsToTreatAsEsm: [".ts"],
      moduleFileExtensions: ["ts", "js", "json", "node"],
      rootDir: ".",
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
          },
        ],
      },
      moduleNameMapper: {
        "@siteed/gitguard": "<rootDir>/src",
        "(.+)\\.js": "$1",
      },
      testEnvironment: "node",
      extensionsToTreatAsEsm: [".ts"],
      moduleFileExtensions: ["ts", "js", "json", "node"],
      rootDir: ".",
    },
  ],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
};

module.exports = config;
