/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-env node */
const escape = require("escape-string-regexp");
const { getDefaultConfig } = require("expo/metro-config");
const exclusionList = require("metro-config/src/defaults/exclusionList");
const path = require("path");

const pak = require("../../packages/design-system/package.json");

// Find the project and workspace directories
const projectRoot = __dirname;
// This can be replaced with `find-yarn-workspace-root`
const monorepoRoot = path.resolve(projectRoot, "../..");
const designSystem = path.resolve(monorepoRoot, "packages/design-system");

const modules = [
  "react-native-paper",
  "react-native-safe-area-context",
  "react-native-reanimated",
  "@siteed/design-system",
  "react-dom",
  "react",
  "react-native",
  ...Object.keys({ ...pak.peerDependencies }),
];

const extraNodeModules = modules.reduce((acc, name) => {
  acc[name] = path.join(__dirname, "node_modules", name);
  return acc;
}, {});

// Prevent metro from resolving duplicate packages
const blacklistRE = exclusionList(
  modules.map(
    (m) =>
      new RegExp(
        `^${escape(path.join(designSystem, "node_modules", m))}\\/.*$`,
      ),
  ),
);

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

console.log(`blacklistRE`, blacklistRE);
// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];
// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  // path.resolve(monorepoRoot, "node_modules"),
];

config.resolver = {
  ...config.resolver,
  extraNodeModules,
  blacklistRE,
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName.startsWith("@siteed/design-system")) {
      // Logic to resolve the module name to a file path...
      // NOTE: Throw an error if there is no resolution.
      return {
        filePath: designSystem + "/src/index.ts",
        type: "sourceFile",
      };
    }
    // else if (moduleName === "react" || moduleName === "react-dom") {
    //   console.log(
    //     `Resolving ${moduleName} to ${path.resolve(projectRoot, `node_modules/${moduleName}`)}`,
    //   );
    //   // Force resolution to the local versions specified in extraNodeModules
    //   return {
    //     filePath: path.resolve(
    //       projectRoot,
    //       `node_modules/${moduleName}/index.js`,
    //     ),
    //     type: "sourceFile",
    //   };
    // }
    // Ensure you call the default resolver.
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
