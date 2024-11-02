/* eslint-disable @typescript-eslint/explicit-function-return-type */
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
    gitguard: "src/cli/gitguard.ts",
  },
  output: {
    dir: "dist/esm",
    format: "esm",
    sourcemap: true,
    preserveModules: true,
    entryFileNames: ({ facadeModuleId }) => {
      /* eslint-disable @typescript-eslint/explicit-function-return-type */
      /* eslint-disable @typescript-eslint/no-unsafe-return */
      /* eslint-disable @typescript-eslint/no-unsafe-call */
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      if (!facadeModuleId) return "[name].js";
      return facadeModuleId.replace(/^.*?\/src\//, "").replace(/\.ts$/, ".js");
      /* eslint-enable @typescript-eslint/explicit-function-return-type */
      /* eslint-enable @typescript-eslint/no-unsafe-return */
      /* eslint-enable @typescript-eslint/no-unsafe-call */
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */
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
    }),
    commonjs(),
    json(),
  ],
};

export default config;
