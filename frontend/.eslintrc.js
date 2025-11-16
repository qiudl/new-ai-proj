module.exports = {
  extends: ['react-app', 'react-app/jest', 'plugin:storybook/recommended'],
  rules: {
    // TypeScript规则 - 优化any类型使用
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // React规则 - React 18+ 不需要显式导入React
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off',
    
    // Import规则 - 暂时警告而非错误，避免配置问题
    'import/no-unresolved': 'off', // 暂时关闭，依赖TypeScript检查
    'import/named': 'off',
    'import/default': 'off', 
    'import/namespace': 'off',
    'import/no-duplicates': 'warn',
    
    // 代码质量规则
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error'
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  overrides: [
    {
      // 测试文件使用更宽松的规则
      files: [
        '**/__tests__/**/*',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.e2e.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx'
      ],
      rules: {
        // Testing Library规则 - 从error降为warn
        'testing-library/no-node-access': 'warn',
        'testing-library/no-wait-for-multiple-assertions': 'warn',
        'testing-library/no-container': 'warn',
        'testing-library/no-render-in-setup': 'warn',
        'testing-library/no-wait-for-side-effects': 'warn',
        'testing-library/prefer-presence-queries': 'warn',
        'testing-library/no-wait-for-empty-callback': 'warn',
        'testing-library/await-async-utils': 'warn',
        'testing-library/no-unnecessary-act': 'warn',

        // Jest规则 - 从error降为warn
        'jest/no-conditional-expect': 'warn',

        // TypeScript规则 - 测试文件更宽松
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_|^mock'
        }],

        // 其他规则
        'no-console': 'off' // 测试中允许console
      }
    }
  ]
};