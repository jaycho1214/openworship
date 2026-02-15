module.exports = {
  extends: 'erb',
  plugins: ['@typescript-eslint'],
  rules: {
    // A temporary hack related to IDE not resolving correct package.json
    'import/no-extraneous-dependencies': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-filename-extension': 'off',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/no-import-module-exports': 'off',
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
    'no-redeclare': 'off',
    '@typescript-eslint/no-redeclare': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    // Allow named exports for IPC handlers (designed pattern)
    'import/prefer-default-export': 'off',
    // Allow for-of loops (modern JavaScript standard)
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message:
          'for..in loops iterate over the entire prototype chain. Use Object.{keys,values,entries}.',
      },
      {
        selector: 'LabeledStatement',
        message:
          'Labels are a form of GOTO; using them makes code confusing and hard to maintain.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode.',
      },
    ],
    // Allow continue statement (common pattern)
    'no-continue': 'off',
    // Allow no-use-before-define for TypeScript (hoisting is common in JS)
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': [
      'error',
      { functions: false, classes: false, variables: false, typedefs: false },
    ],
    // Allow plusplus in loops
    'no-plusplus': 'off',
    // Allow await in loops when intentional
    'no-await-in-loop': 'off',
    // Allow bitwise for crypto fallback
    'no-bitwise': 'off',
    // Allow unnecessary escape in regex (false positives)
    'no-useless-escape': 'warn',
    // Allow prop spreading (needed for shadcn/ui components)
    'react/jsx-props-no-spreading': 'off',
    // Allow optional props without defaultProps (TypeScript handles this)
    'react/require-default-props': 'off',
    // Allow destructuring preference flexibility
    'prefer-destructuring': 'off',
    // Disable headings-have-content for shadcn DialogTitle (visually hidden)
    'jsx-a11y/heading-has-content': 'off',
    // Allow console in development
    'no-console': 'warn',
    // Disable button-has-type for styled buttons
    'react/button-has-type': 'off',
    // Relax consistent-return for early returns
    'consistent-return': 'off',
    // Disable hooks exhaustive-deps (can cause infinite loops)
    'react-hooks/exhaustive-deps': 'warn',
    // Disable no-undef for TypeScript (TypeScript handles this)
    'no-undef': 'off',
    // Allow nested ternaries (common in JSX)
    'no-nested-ternary': 'off',
    // Relax jsx-a11y for styled interactive elements
    'jsx-a11y/no-static-element-interactions': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    // Allow expressions in template literals
    'no-template-curly-in-string': 'off',
    // Allow array index in keys (common for stable ordered lists)
    'react/no-array-index-key': 'warn',
    // Relax label association (styled components handle this)
    'jsx-a11y/label-has-associated-control': 'off',
    // Allow context value without useMemo (performance acceptable)
    'react/jsx-no-constructed-context-values': 'warn',
    // Allow default export name
    'no-restricted-exports': 'off',
    // Relax promise rules
    'promise/always-return': 'off',
    'promise/no-nesting': 'warn',
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  settings: {
    'import/resolver': {
      // See https://github.com/benmosher/eslint-plugin-import/issues/1396#issuecomment-575727774 for line below
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        moduleDirectory: ['node_modules', 'src/'],
      },
      webpack: {
        config: require.resolve('./.erb/configs/webpack.config.eslint.ts'),
      },
      typescript: {},
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
};
