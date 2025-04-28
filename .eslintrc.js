/*
 * @Version: 1.0.0
 * @Author: Owen.wang
 * @Date: 2025-04-28
 * @LastEditors: Owen.wang
 * @LastEditTime: 2025-04-28
 * @Description:
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  env: {
    node: true,
    es6: true,
  },
  rules: {
    // 启用 prettier 规则
    'prettier/prettier': 'error',

    // TypeScript 规则
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],

    // 通用规则
    // 'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-debugger': 'warn',
    'no-duplicate-imports': 'error',
    'no-unused-expressions': 'error',
    'prefer-const': 'error',
  },
  ignorePatterns: ['dist', 'node_modules', '*.js', 'vite.config.ts', 'vitest.config.ts'],
};
