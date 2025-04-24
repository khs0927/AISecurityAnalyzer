module.exports = {
  root: true,
  extends: ["eslint:recommended", "plugin:react/recommended", "@react-native"],
  plugins: ["react", "@typescript-eslint", "tailwindcss"],
  parser: "@typescript-eslint/parser",
  env: { browser: true, node: true, es2023: true },
  settings: { react: { version: "detect" } },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "no-unused-vars": "warn",
    "@typescript-eslint/no-unused-vars": ["warn"],
    "tailwindcss/no-custom-classname": "warn"
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      parserOptions: {
        project: ["./tsconfig.json", "./apps/*/tsconfig.json", "./packages/*/tsconfig.json"]
      }
    }
  ],
  ignorePatterns: ["node_modules/", "dist/", "build/", "*.d.ts"]
}; 