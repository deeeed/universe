// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");
/* eslint-disable no-undef */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "react-native-reanimated/plugin",
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@assets": "./assets",
            // Add other aliases as needed
            "react-native-gesture-handler": path.resolve(
              __dirname,
              "node_modules/react-native-gesture-handler",
            ),
            "@gorhom/bottom-sheet": path.resolve(
              __dirname,
              "node_modules/@gorhom/bottom-sheet",
            ),
            "react-native-reanimated": path.resolve(
              __dirname,
              "node_modules/react-native-reanimated",
            ),
          },
        },
      ],
    ],
    env: {
      production: {
        plugins: ["react-native-paper/babel", "react-native-reanimated/plugin"],
      },
    },
  };
};
