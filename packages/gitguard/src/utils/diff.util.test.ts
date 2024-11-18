import { jest } from "@jest/globals";
import { formatDiffForAI } from "./diff.util.js";
import { FileChange } from "../types/git.types.js";
import { readFileSync } from "fs";

describe("formatDiffForAI", () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    raw: jest.fn(),
    newLine: jest.fn(),
    table: jest.fn(),
    isDebug: jest.fn(() => false),
  };

  it.skip("should optimize large generated file diff", () => {
    // Sample file change representing the generated.ts file
    const fileChange: FileChange = {
      path: "src/generated.ts",
      additions: 1200,
      deletions: 0,
      isTest: false,
      isConfig: false,
    };

    // Get current file path
    const currentFilePath = new URL(".", import.meta.url).pathname;
    const diffFilePath = `${currentFilePath}/../test/diff_example.txt`;
    // Read from external file to avoid hardcoding
    const largeDiff = readFileSync(diffFilePath, "utf-8");
    console.log(
      `Loaded diff: ${largeDiff.length} characters`,
      largeDiff.slice(0, 100),
    );

    // Test with a small token limit to force optimization
    const result = formatDiffForAI({
      files: [fileChange],
      diff: largeDiff,
      maxLength: 1000, // Small limit to force optimization
      logger: mockLogger,
    });

    // Verify the optimization
    expect(result).toContain("diff --git"); // Should keep the diff header
    expect(result).toContain("Type0"); // Should keep some of the initial content
    expect(result).toContain("... (truncated"); // Should indicate truncation
    expect(result.length).toBeLessThan(largeDiff.length); // Should be shorter than original
    expect(result.length).toBeLessThanOrEqual(500); // Should respect max length
  });

  it("should handle empty diff", () => {
    const result = formatDiffForAI({
      files: [],
      diff: "",
    });

    expect(result).toBe("");
  });

  it("should respect complexity in scoring", () => {
    const files = [
      {
        path: "simple.ts",
        additions: 5,
        deletions: 2,
        isTest: false,
        isConfig: false,
      },
      {
        path: "complex.ts",
        additions: 20, // Increased
        deletions: 10, // Increased
        isTest: false,
        isConfig: false,
      },
    ];

    const simpleDiff = `diff --git a/simple.ts b/simple.ts\n@@ -1,1 +1,1 @@\n+const x = 1;`;

    const complexDiff =
      `diff --git a/complex.ts b/complex.ts\n@@ -1,1 +1,1 @@\n` +
      `+if (condition) {\n+  while (x) {\n+    if (y) {\n+      function z() {}\n+    }\n+  }\n+}`;

    const diff = simpleDiff + "\n" + complexDiff;

    const result = formatDiffForAI({
      files,
      diff,
      maxLength: 200, // Increased
      logger: mockLogger,
    });

    expect(result).toContain("complex.ts");
    expect(result).not.toContain("simple.ts");
  });

  it("should group related files together", () => {
    const files = [
      {
        path: "src/feature/component.ts",
        additions: 20,
        deletions: 5,
        isTest: false,
        isConfig: false,
      },
      {
        path: "src/feature/component.test.ts",
        additions: 30,
        deletions: 10,
        isTest: true,
        isConfig: false,
      },
      {
        path: "src/unrelated/other.ts",
        additions: 15,
        deletions: 3,
        isTest: false,
        isConfig: false,
      },
    ];

    const diff = files
      .map(
        (f) => `diff --git a/${f.path} b/${f.path}\n@@ -1,1 +1,1 @@\n+content`,
      )
      .join("\n");

    const result = formatDiffForAI({
      files,
      diff,
      maxLength: 200,
      logger: mockLogger,
      options: { includeTests: true },
    });

    const componentIndex = result.indexOf("component.ts");
    const testIndex = result.indexOf("component.test.ts");
    const otherIndex = result.indexOf("unrelated/other.ts");

    // Verify related files are grouped together
    expect(Math.abs(componentIndex - testIndex)).toBeLessThan(
      Math.abs(componentIndex - otherIndex),
    );
  });

  it("should handle binary files correctly", () => {
    const files = [
      {
        path: "src/assets/image.png",
        additions: 0,
        deletions: 0,
        isTest: false,
        isConfig: false,
      },
      {
        path: "src/code.ts",
        additions: 10,
        deletions: 5,
        isTest: false,
        isConfig: false,
      },
    ];

    // Modified diff pattern to match the one being split
    const diff = `diff --git a/src/assets/image.png b/src/assets/image.png\nBinary files differ\ndiff --git a/src/code.ts b/src/code.ts\n@@ -1,1 +1,1 @@\n+code content`;

    const result = formatDiffForAI({
      files,
      diff,
      maxLength: 1000,
      logger: mockLogger,
    });

    const pattern = /Binary files differ/;
    expect(result).not.toMatch(pattern);
    expect(result).toContain("code.ts");
  });

  it("should return full diff if under max length", () => {
    const smallDiff = "diff --git a/small.ts b/small.ts\n+small change";
    const fileChange: FileChange = {
      path: "small.ts",
      additions: 1,
      deletions: 0,
      isTest: false,
      isConfig: false,
    };

    const result = formatDiffForAI({
      files: [fileChange],
      diff: smallDiff,
      maxLength: 1000,
    });

    expect(result).toBe(smallDiff);
  });
});
