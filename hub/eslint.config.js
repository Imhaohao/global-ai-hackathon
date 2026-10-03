const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  { ignores: ['node_modules/**', 'android/**', '.expo/**', 'modules/**/android/**'] },
  ...tseslint.configs.recommended,
  { rules: { complexity: ['error', 15] } },
  { files: ['**/*.js'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
);
