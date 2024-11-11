/* eslint-disable no-console */
import { readFileSync, writeFileSync, chmodSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const cliPaths = [
  join(__dirname, "../dist/cjs/cli/gitguard.cjs"),
  join(__dirname, "../dist/esm/cli/gitguard.js"),
];

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
