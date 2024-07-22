import "ts-node/register"; // Add this to import TypeScript files
import { ExpoConfig } from "@expo/config";

const isDev = process.env.NODE_ENV === "development";

const config: ExpoConfig = {
  name: "designdemo",
  slug: "designdemo",
  version: "1.0.0",
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
    baseUrl: isDev ? "" : "/universe/design-demo/",
  },
  plugins: ["expo-localization", "expo-router"],
};

export default config;
