module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
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
  }
};