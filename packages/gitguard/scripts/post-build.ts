/* eslint-disable no-console */
import {
  readFileSync,
  writeFileSync,
  chmodSync,
  existsSync,
  copyFileSync,
  mkdirSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const cliPaths = [
  join(__dirname, "../dist/cjs/cli/gitguard.cjs"),
  join(__dirname, "../dist/esm/cli/gitguard.js"),
];

// Copy package.json to dist folder
const packageJsonPath = join(__dirname, "../package.json");
const distPackageJsonPath = join(__dirname, "../dist/package.json");

try {
  // Ensure dist directory exists
  const distDir = dirname(distPackageJsonPath);
  if (!existsSync(distDir)) {
    // Create dist directory if it doesn't exist
    mkdirSync(distDir, { recursive: true });
  }

  // Copy package.json
  copyFileSync(packageJsonPath, distPackageJsonPath);
  console.log("✅ Copied package.json to dist folder");
} catch (error) {
  console.error("Failed to copy package.json:", error);
}

// Process CLI files
for (const cliPath of cliPaths) {
  if (!existsSync(cliPath)) continue;

  // Read the file
  let content = readFileSync(cliPath, "utf8");

  // Remove any existing shebangs
  content = content.replace(/^#!.*\n/gm, "");

  // Add single shebang at the start
  content = `#!/usr/bin/env node\n${content}`;

  // Write back
  writeFileSync(cliPath, content);

  // Set executable permissions
  chmodSync(cliPath, "755");

  console.log(`✅ Processed ${cliPath}`);
}
