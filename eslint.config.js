import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Reduce noise from globals - TypeScript handles these
      "no-undef": "off",
      "no-unused-vars": "off",
    },
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        atob: "readonly",
        crypto: "readonly",
        location: "readonly",
        alert: "readonly",
        addEventListener: "readonly",
        // React
        React: "readonly",
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: "./tsconfig.json",
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["**/*.test.{js,jsx,ts,tsx}"],
    rules: {
      "no-control-regex": "off", // Allow control characters in test files
    },
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "*.d.ts",
      "vite.config.ts",
      "vitest.config.ts",
    ],
  },
];
