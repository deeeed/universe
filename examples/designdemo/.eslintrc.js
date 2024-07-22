/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  extends: [
    "universe/native",
    "plugin:@typescript-eslint/recommended", // Add the TypeScript plugin's recommended rules
  ],
  parser: "@typescript-eslint/parser", // Specify the TypeScript parser
  plugins: ["@typescript-eslint"], // Add the TypeScript plugin
  overrides: [
    {
      files: ["*.ts", "*.tsx"], // Specify the file extensions to be parsed as TypeScript
      rules: {
        // Add or override rules specific to TypeScript files here
      },
    },
  ],
};
