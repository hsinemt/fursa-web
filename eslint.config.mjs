import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      ".next-*/**",
      "test-results/**",
      "playwright-report/**",
      "node_modules/**",
      "coverage/**",
      "next-env.d.ts",
      "src/lib/api/schema.d.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "react/no-danger": "error",
    },
  },
];

export default config;
