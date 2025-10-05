// eslint.config.ts
import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import promise from 'eslint-plugin-promise'
import n from 'eslint-plugin-n'
import unicorn from 'eslint-plugin-unicorn'

// グローバル無視（Flat Config では .eslintignore 不要）
const ignores = [
  '**/dist/**',
  '**/build/**',
  '**/.pnpm/**',
  '**/node_modules/**',
  '**/.mastra/**',
  '**/*.d.ts'
]

export default defineConfig([
  { ignores },

  // JS/TS 共通（ESLint 推奨）
  eslint.configs.recommended,

  // TS 推奨 + さらに Type-Checked 版をON（型ベースの検知を使う）
  // 公式の推奨構成パターンに準拠
  // https://typescript-eslint.io/getting-started/ /typed-linting
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  // 追加プラグイン
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      promise,
      n,
      unicorn
    },
    rules: {
      // ---- import 並び替え（自動修正可） ----
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // ---- promise / node / unicorn の実用ルール（抜粋） ----
      'promise/always-return': 'off',
      'promise/no-nesting': 'warn',
      'n/no-unsupported-features/es-syntax': 'off',
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/filename-case': ['error', { case: 'kebabCase' }]
    },

    languageOptions: {
      parserOptions: {
        // ★ 型情報を使うモード（v8 の推奨）
        // VS Code 等と同じ Project Service を使い、tsconfig を自動検出
        // 大規模/モノレポでの信頼性と設定簡素化に寄与
        // 参照: typescript-eslint docs/blog
        projectService: true,
        tsconfigRootDir: new URL('.', import.meta.url).pathname
      }
    }
  },

  // JS/TS ファイル対象
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.js', '**/*.mjs', '**/*.cjs'],
    rules: {
      // 例: any を厳しくしたい場合は strictTypeChecked も検討
      // '@typescript-eslint/no-unsafe-assignment': 'warn',
    }
  },

  // テスト用（例: Vitest/Jest 想定）
//   {
//     files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
//     rules: {
//       // テストでは柔らかめに
//       'unicorn/filename-case': 'off'
//     }
//   }
])
