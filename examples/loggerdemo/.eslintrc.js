// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  overrides: [
    {
      files: ["*.ts", "*.tsx"], // Specify the file extensions to be parsed as TypeScript
      rules: {
        // Add or override rules specific to TypeScript files here
      },
    },
  ],
};
