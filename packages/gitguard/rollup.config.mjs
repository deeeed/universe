import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const external = [
  // Node.js built-ins
  "buffer",
  "crypto",
  "fs",
  "path",
  "os",
  "util",
  "stream",
  "events",
  "child_process",
  "url",
  "fs/promises",

  // Direct dependencies
  "chalk",
  "commander",
  "inquirer",
  "openai",
  "simple-git",
  "zod",
  "execa",
  "fs-extra",
  "glob",
  "dotenv",

  // Regex for sub-dependencies
  /^node:/,
  /^@siteed\/.*/,
  /^lodash.*/,
];

const config = {
  input: {
    index: "src/index.ts",
    gitguard: "bin/gitguard.ts",
  },
  output: {
    dir: "dist/esm",
    format: "esm",
    sourcemap: true,
    preserveModules: true,
    entryFileNames: ({ facadeModuleId }) => {
      if (!facadeModuleId) return "[name].js";
      // Remove src/ or bin/ from the path
      return facadeModuleId
        .replace(/^.*?\/src\//, "")
        .replace(/^.*?\/bin\//, "")
        .replace(/\.ts$/, ".js");
    },
  },
  external,
  plugins: [
    nodeResolve({
      preferBuiltins: true,
    }),
    typescript({
      tsconfig: "./tsconfig.rollup.json",
      sourceMap: true,
      module: "ESNext",
      outDir: "dist/esm",
      declaration: false,
    }),
    commonjs(),
    json(),
  ],
};

export default config;
