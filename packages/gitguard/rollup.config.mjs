/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import copy from "rollup-plugin-copy";

const external = [
  "commander",
  "fs/promises",
  "url",
  "path",
  "fs",
  "chalk",
  "inquirer",
  "js-tiktoken",
  "clipboardy",
  "openai",
];

const sharedPlugins = [
  nodeResolve({
    preferBuiltins: true,
  }),
  commonjs({
    transformMixedEsModules: true,
  }),
  json(),
];

export default defineConfig([
  // CJS build for CLI
  {
    input: "src/cli/gitguard.ts",
    output: {
      file: "dist/cjs/cli/gitguard.cjs",
      format: "cjs",
      sourcemap: true,
      exports: "named",
      banner: "#!/usr/bin/env node",
    },
    external,
    plugins: [
      ...sharedPlugins,
      copy({
        targets: [{ src: "src/templates/*", dest: "dist/templates" }],
        verbose: true,
        hook: "writeBundle",
      }),
      typescript({
        tsconfig: "./tsconfig.build.json",
        outDir: "./dist/cjs",
        declaration: true,
      }),
    ],
  },
  // CJS build for library
  {
    input: "src/index.ts",
    output: {
      dir: "dist/cjs",
      format: "cjs",
      sourcemap: true,
      preserveModules: true,
      entryFileNames: "[name].cjs",
      exports: "named",
    },
    external,
    plugins: [
      ...sharedPlugins,
      typescript({
        tsconfig: "./tsconfig.build.json",
        outDir: "./dist/cjs",
        declaration: true,
      }),
    ],
  },
  // ESM build
  {
    input: "src/index.ts",
    output: {
      dir: "dist/esm",
      format: "esm",
      sourcemap: true,
      preserveModules: true,
    },
    external,
    plugins: [
      ...sharedPlugins,
      typescript({
        tsconfig: "./tsconfig.build.json",
        outDir: "./dist/esm",
        declaration: true,
      }),
    ],
  },
]);
