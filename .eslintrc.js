module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    // Basic rules for code quality
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off', // Allow console in examples
    'prefer-const': 'warn',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.js',
    '*.mjs',
    'tests/',
    'examples/',
  ],
  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      rules: {
        'no-unused-vars': 'off', // Use TS compiler for this
      },
    },
  ],
};
