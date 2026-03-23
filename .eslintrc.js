module.exports = {
  extends: ['expo', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // import/no-unresolved is left off because Metro/Babel handle module resolution
    // (including the @/* alias). Use `npm run typecheck` to catch unresolved imports via TypeScript.
    'import/no-unresolved': 'off',
    'import/namespace': 'off',
  },
};
