import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';

/**
 * ESLint 9 Flat Config：JavaScript + React（自動 JSX runtime）+ a11y。
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 */
export default [
  { ignores: ['dist/**', 'deploy-output/**', 'dev-dist/**', 'node_modules/**', '.wrangler/**'] },

  js.configs.recommended,

  // React 核心規則（含 jsx、hooks 相關基礎檢查）
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],

  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,

  // 無障礙：靜態分析 JSX 上的 a11y 屬性
  jsxA11y.flatConfigs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // 本專案未使用 prop-types
      'react/prop-types': 'off',
      // 既有程式在 effect 內同步本地 UI 狀態（例如 dialog 開啟時重置），與官方建議衝突但行為正確
      'react-hooks/set-state-in-effect': 'off',
      // role="dialog" 上需 onKeyDown／tabIndex 做焦點陷阱，與「非互動元素」規則衝突
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
    },
  },

  {
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },

  // Playwright 腳本：Node 啟動瀏覽器，page.evaluate 內使用 DOM API
  {
    files: [
      'scripts/lib/deck-layout-metrics.mjs',
      'scripts/measure-card-body.mjs',
      'scripts/test-deck-layout.mjs',
      'scripts/audit-deck-layout.mjs',
      'scripts/find-horizontal-overflow.mjs',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },

  {
    files: ['vite.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },

  {
    settings: {
      react: { version: 'detect' },
    },
  },
];
