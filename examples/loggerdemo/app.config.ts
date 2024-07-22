import "ts-node/register"; // Add this to import TypeScript files
import { ExpoConfig } from "@expo/config";
import path from "path";
import fs from "fs";

const isDev = process.env.NODE_ENV === "development";


// Path to the react-native-logger package.json
const packageJsonPath = path.resolve(__dirname, '..', '..', 'packages', 'react-native-logger', 'package.json');

// Read the package.json file
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Extract the version
const loggerPackageVersion = packageJson.version;

console.log(`Using react-native-logger version: ${loggerPackageVersion}`);

const config: ExpoConfig = {
  name: "loggerdemo",
  slug: "loggerdemo",
  version: loggerPackageVersion, // Use the dynamically read version
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "loggerdemo",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "net.siteed.loggerdemo",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "net.siteed.loggerdemo",
  },
  web: {
    favicon: "./assets/images/favicon.png",
    bundler: "metro",
  },
  experiments: {
    baseUrl: isDev ? "" : "/universe/loggerdemo/",
    typedRoutes: true
  },
  plugins: ["expo-localization", "expo-router"],
};

export default config;
