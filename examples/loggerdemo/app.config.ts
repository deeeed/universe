import "ts-node/register"; // Add this to import TypeScript files
import { ExpoConfig } from "@expo/config";

const isDev = process.env.NODE_ENV === "development";

const config: ExpoConfig = {
  name: "loggerdemo",
  slug: "loggerdemo",
  version: "1.0.0",
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
