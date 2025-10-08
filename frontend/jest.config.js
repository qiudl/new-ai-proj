module.exports = {
  preset: 'react-scripts',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { 
          targets: { node: 'current' },
          modules: 'auto'
        }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript',
      ],
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!.*)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^axios$': 'axios/dist/node/axios.cjs',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(js|jsx|ts|tsx)',
    '<rootDir>/src/**/?(*.)(spec|test).(js|jsx|ts|tsx)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/serviceWorker.ts',
    '!src/setupTests.ts',
    '!src/reportWebVitals.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.config.{js,ts}',
    '!src/test/**/*',
    '!src/__tests__/**/*',
    '!src/**/__tests__/**/*',
    '!src/**/__mocks__/**/*'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/coverage/',
  ],
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'text-summary', 
    'html',
    'lcov',
    'json'
  ],
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // 针对关键文件的更高要求
    './src/hooks/useImpersonationState.ts': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/services/impersonationService.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/contexts/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // 文件夹管理组件
    './src/components/WorkNoteFolderTree.tsx': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/components/FolderDialog.tsx': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/components/DeleteFolderDialog.tsx': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/components/MoveFolderDialog.tsx': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/hooks/useDebounce.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  testTimeout: 30000,
  verbose: true,
  bail: false,
  maxWorkers: '50%',
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
};