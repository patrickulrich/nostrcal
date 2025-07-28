import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";
import htmlEslint from "@html-eslint/eslint-plugin";
import htmlParser from "@html-eslint/parser";
import customRules from "./eslint-rules/index.js";

export default tseslint.config(
  { ignores: ["dist", "dev-dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    linterOptions: {
      noInlineConfig: true, // Prevents all eslint-disable comments
      reportUnusedDisableDirectives: "error", // Reports unused disable directives as errors
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
      "custom": customRules,
      "react-internal": {
        rules: {
          "safe-string-coercion": {
            meta: { type: "problem" },
            create() { return {}; }
          }
        }
      }
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "ignoreRestSiblings": true,
        },
      ],
      "custom/no-placeholder-comments": "error",
      "no-warning-comments": [
        "error",
        { terms: ["fixme"] },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "react-internal/safe-string-coercion": "off",
      "jsx-a11y/anchor-has-content": "warn",
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    files: ["**/*.html"],
    plugins: {
      "@html-eslint": htmlEslint,
      "custom": customRules,
    },
    languageOptions: {
      parser: htmlParser,
    },
    rules: {
      "@html-eslint/require-title": "error",
      "@html-eslint/require-meta-charset": "error",
      "@html-eslint/require-meta-description": "error",
      "@html-eslint/require-meta-viewport": "error",
      "@html-eslint/require-open-graph-protocol": [
        "error",
        [
          "og:type",
          "og:title",
          "og:description",
        ],
      ],
      "custom/no-inline-script": "error",
      "custom/require-webmanifest": "error",
    },
  }
);
