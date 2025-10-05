/** @type {import('prettier').Config} */
export default {
  // TypeScript/JavaScript用の基本設定
  semi: true, // TypeScriptではセミコロンを推奨
  singleQuote: true, // シングルクォートを推奨
  trailingComma: 'es5', // ES5互換のtrailing comma
  printWidth: 100, // 適度な行幅
  tabWidth: 2, // 2スペースインデント
  endOfLine: 'lf', // Unix形式の改行
  quoteProps: 'as-needed', // 必要な場合のみクォート
  bracketSpacing: true, // オブジェクトの括弧内にスペース
  bracketSameLine: false, // JSXの閉じ括弧を新しい行に
  arrowParens: 'avoid', // アロー関数の単一パラメータで括弧を省略
  proseWrap: 'preserve', // プロセス（Markdown等）は改行を保持

  plugins: [
    'prettier-plugin-packagejson',
    'prettier-plugin-organize-imports', // import文の整理
  ],

  // ファイルタイプ別の設定
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      options: {
        // TypeScript特有の設定
        parser: 'typescript',
        semi: true,
        trailingComma: 'all', // TypeScriptではallを推奨
        printWidth: 100,
      },
    },
    {
      files: ['*.js', '*.jsx'],
      options: {
        // JavaScript用の設定
        parser: 'babel',
        semi: true,
        trailingComma: 'es5',
      },
    },
    {
      files: ['*.md', '*.mdx'],
      options: {
        // Markdown用の設定
        parser: 'markdown',
        proseWrap: 'always', // Markdownは常にwrapして差分を見やすく
        printWidth: 80, // Markdownは短めの行幅
        tabWidth: 2,
        useTabs: false,
      },
    },
    {
      files: ['*.json', '*.jsonc'],
      options: {
        // JSON用の設定
        parser: 'json',
        printWidth: 100,
        tabWidth: 2,
      },
    },
    {
      files: ['*.yaml', '*.yml'],
      options: {
        // YAML用の設定
        parser: 'yaml',
        printWidth: 100,
        tabWidth: 2,
        singleQuote: false, // YAMLではダブルクォートを推奨
      },
    },
  ],
}
