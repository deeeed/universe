module.exports = {
  root: true,
  env: {
    node: true,
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "regexp"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:prettier/recommended",
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json"],
  },
  rules: {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "prefer-regex-literals": ["error", { disallowRedundantWrapping: true }],
    "regexp/prefer-regexp-exec": "error",
    "no-console": ["error", { allow: ["warn", "error"] }],
    "prettier/prettier": "error",
  },
  ignorePatterns: ["dist/", "node_modules/", "rollup.config.mjs"],
  overrides: [
    {
      files: ["**/*.test.ts", "jest.setup.ts", "jest.config.ts"],
      env: {
        jest: true,
      },
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "no-console": "off",
      },
    },
  ],
};
