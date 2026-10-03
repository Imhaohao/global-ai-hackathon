import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/_generated/**", "mobile/**", "hub/**", "training/**"] },
  ...tseslint.configs.recommended,
  { rules: { complexity: ["error", 15] } },
);
