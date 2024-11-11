import { CommitParser } from "./commit-parser.util.js";
import { FileChange } from "../types/git.types.js";
import { ComplexityOptions } from "../types/analysis.types.js";

describe("CommitParser", () => {
  let parser: CommitParser;

  beforeEach(() => {
    parser = new CommitParser();
  });

  describe("analyzeCommitComplexity", () => {
    const defaultOptions: ComplexityOptions = {
      thresholds: {
        largeFile: 100,
        veryLargeFile: 300,
        hugeFile: 500,
        multipleFiles: 5,
        manyFiles: 10,
      },
      scoring: {
        baseFileScore: 1,
        largeFileScore: 2,
        veryLargeFileScore: 3,
        hugeFileScore: 5,
        sourceFileScore: 1,
        testFileScore: 1,
        configFileScore: 0.5,
        apiFileScore: 2,
        migrationFileScore: 2,
        componentFileScore: 1,
        hookFileScore: 1,
        utilityFileScore: 0.5,
        criticalFileScore: 2,
      },
      patterns: {
        sourceFiles: ["/src/"],
        apiFiles: ["/api/"],
        migrationFiles: ["/migrations/"],
        componentFiles: ["/components/"],
        hookFiles: ["/hooks/"],
        utilityFiles: ["/utils/"],
        criticalFiles: ["package.json", "tsconfig.json"],
      },
      structureThresholds: {
        scoreThreshold: 5,
        reasonsThreshold: 2,
      },
    };

    it("should calculate base score for simple changes", () => {
      const files: FileChange[] = [
        {
          path: "src/utils/helper.ts",
          additions: 10,
          deletions: 5,
          isTest: false,
          isConfig: false,
        },
      ];

      const result = parser.analyzeCommitComplexity({
        files,
        options: defaultOptions,
      });
      expect(result.score).toBe(1.5); // baseFileScore + utilityFileScore
      expect(result.reasons).toHaveLength(0);
      expect(result.needsStructure).toBeFalsy();
    });

    it("should detect large file changes", () => {
      const files: FileChange[] = [
        {
          path: "src/components/LargeComponent.tsx",
          additions: 150,
          deletions: 0,
          isTest: false,
          isConfig: false,
        },
      ];

      const result = parser.analyzeCommitComplexity({
        files,
        options: defaultOptions,
      });
      expect(result.score).toBe(4); // baseFileScore + componentFileScore + largeFileScore
      expect(result.reasons).toContain("Large file changes");
    });

    it("should detect critical file changes", () => {
      const files: FileChange[] = [
        {
          path: "package.json",
          additions: 5,
          deletions: 2,
          isTest: false,
          isConfig: true,
        },
      ];

      const result = parser.analyzeCommitComplexity({
        files,
        options: defaultOptions,
      });
      expect(result.score).toBe(3.5); // baseFileScore + configFileScore + criticalFileScore
      expect(result.reasons).toContain(
        "Contains critical configuration changes",
      );
      expect(result.needsStructure).toBeTruthy();
    });

    it("should detect multiple scopes", () => {
      const files: FileChange[] = [
        {
          path: "src/utils/helper.ts",
          additions: 10,
          deletions: 5,
          isTest: false,
          isConfig: false,
        },
        {
          path: "src/components/Button.tsx",
          additions: 20,
          deletions: 0,
          isTest: false,
          isConfig: false,
        },
      ];

      const result = parser.analyzeCommitComplexity({
        files,
        options: defaultOptions,
      });
      expect(result.reasons).toContain("Changes span multiple directories");
    });

    it("should detect high complexity score", () => {
      const files: FileChange[] = [
        {
          path: "src/api/endpoint.ts",
          additions: 350,
          deletions: 0,
          isTest: false,
          isConfig: false,
        },
      ];

      const result = parser.analyzeCommitComplexity({
        files,
        options: defaultOptions,
      });
      expect(result.score).toBe(6); // baseFileScore + apiFileScore + veryLargeFileScore
      expect(result.reasons).toContain(
        `Complexity score (6) exceeds threshold (5)`,
      );
      expect(result.needsStructure).toBeTruthy();
    });

    it("should respect custom thresholds", () => {
      const files: FileChange[] = [
        {
          path: "src/utils/helper.ts",
          additions: 80,
          deletions: 0,
          isTest: false,
          isConfig: false,
        },
      ];

      const customOptions: ComplexityOptions = {
        ...defaultOptions,
        thresholds: {
          ...defaultOptions.thresholds,
          largeFile: 50, // Lower threshold
        },
      };

      const result = parser.analyzeCommitComplexity({
        files,
        options: customOptions,
      });
      expect(result.reasons).toContain("Large file changes");
    });

    it("should handle test files correctly", () => {
      const files: FileChange[] = [
        {
          path: "src/components/Button.test.tsx",
          additions: 50,
          deletions: 0,
          isTest: true,
          isConfig: false,
        },
      ];

      const result = parser.analyzeCommitComplexity({
        files,
        options: defaultOptions,
      });
      expect(result.score).toBe(3); // baseFileScore(1) + sourceFileScore(1) + testFileScore(1)
      expect(result.reasons).toHaveLength(0);
      expect(result.needsStructure).toBeFalsy();
    });
  });
});
