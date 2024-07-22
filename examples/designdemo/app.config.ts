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
  name: "designdemo",
  slug: "designdemo",
  version: designSystemPackageVersion,
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "siteeduidemo",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "net.siteed.designdemo",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "net.siteed.designdemo",
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  experiments: {
    baseUrl: isDev ? "" : "/universe/designdemo/",
  },
  plugins: ["expo-localization", "expo-router"],
};

export default config;
