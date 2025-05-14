import "ts-node/register"; // Add this to import TypeScript files
import { ExpoConfig } from "@expo/config";
import fs from "fs";
import path from "path";

const isDev = process.env.NODE_ENV === "development";

const packageJsonPath = path.resolve(
  __dirname,
  "..",
  "..",
  "packages",
  "design-system",
  "package.json",
);

// Read the package.json file
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Extract the version
const designSystemPackageVersion = packageJson.version;

console.log(
  `Using @siteed/design-system version: ${designSystemPackageVersion}`,
);

const config: ExpoConfig = {
  name: "design-playground",
  slug: "design-playground",
  version: designSystemPackageVersion,
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "designplayground",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "net.siteed.designplayground",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "net.siteed.designplayground",
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  experiments: {
    baseUrl: isDev ? "" : "/universe/design-playground",
  },
  plugins: [
    "expo-localization",
    "expo-router",
    [
      "react-native-edge-to-edge",
      {
        enableEdgeToEdge: true,
      },
    ],
  ],
};

export default config;
