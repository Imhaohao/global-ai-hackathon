import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "mobile/**", "hub/**", "training/**"] },
  ...tseslint.configs.recommended,
  { rules: { complexity: ["error", 15] } },
);
