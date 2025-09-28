/**
 * ESLint configuration for TaskDetail module
 * Enforces stricter rules for better code quality
 */

module.exports = {
  extends: ['../../../../.eslintrc.js'],
  
  rules: {
    // ========== Code Quality Rules ==========
    
    // Enforce maximum file length
    'max-lines': ['error', {
      max: 300,
      skipBlankLines: true,
      skipComments: true
    }],
    
    // Enforce maximum function length
    'max-lines-per-function': ['error', {
      max: 50,
      skipBlankLines: true,
      skipComments: true,
      IIFEs: false
    }],
    
    // Enforce maximum cyclomatic complexity
    'complexity': ['error', { max: 10 }],
    
    // Enforce maximum depth of nested blocks
    'max-depth': ['error', { max: 3 }],
    
    // Enforce maximum number of parameters
    'max-params': ['error', { max: 4 }],
    
    // Enforce maximum number of statements
    'max-statements': ['error', { max: 15 }],
    
    // ========== React Specific Rules ==========
    
    // Enforce Rules of Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    
    // Enforce JSX max depth
    'react/jsx-max-depth': ['error', { max: 4 }],
    
    // Enforce max props per line
    'react/jsx-max-props-per-line': ['error', { 
      maximum: 1,
      when: 'multiline'
    }],
    
    // Enforce boolean prop naming
    'react/boolean-prop-naming': ['error', {
      propTypeNames: ['bool', 'boolean'],
      rule: '^(is|has|should|can|will)[A-Z]([A-Za-z0-9]?)+'
    }],
    
    // Enforce component naming
    'react/jsx-pascal-case': ['error', {
      allowAllCaps: false,
      ignore: []
    }],
    
    // Enforce destructuring assignment
    'react/destructuring-assignment': ['error', 'always'],
    
    // Enforce function component definition
    'react/function-component-definition': ['error', {
      namedComponents: 'arrow-function',
      unnamedComponents: 'arrow-function'
    }],
    
    // Prevent missing displayName
    'react/display-name': 'error',
    
    // Prevent missing key props
    'react/jsx-key': ['error', {
      checkFragmentShorthand: true,
      checkKeyMustBeforeSpread: true
    }],
    
    // Prevent unused prop types
    'react/no-unused-prop-types': 'error',
    
    // ========== TypeScript Specific Rules ==========
    
    // Enforce explicit return types
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
      allowHigherOrderFunctions: true,
      allowDirectConstAssertionInArrowFunctions: true
    }],
    
    // Disallow any type
    '@typescript-eslint/no-explicit-any': 'error',
    
    // Enforce readonly for props
    '@typescript-eslint/prefer-readonly': 'error',
    
    // Enforce consistent type imports
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports'
    }],
    
    // Enforce naming convention
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        prefix: ['I'],
        filter: {
          regex: '^(Window|Document)$',
          match: false
        }
      },
      {
        selector: 'typeAlias',
        format: ['PascalCase']
      },
      {
        selector: 'enum',
        format: ['PascalCase']
      },
      {
        selector: 'enumMember',
        format: ['UPPER_CASE']
      },
      {
        selector: 'variable',
        format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow'
      },
      {
        selector: 'function',
        format: ['camelCase', 'PascalCase']
      },
      {
        selector: 'parameter',
        format: ['camelCase'],
        leadingUnderscore: 'allow'
      }
    ],
    
    // Enforce member ordering
    '@typescript-eslint/member-ordering': ['error', {
      default: [
        'public-static-field',
        'protected-static-field',
        'private-static-field',
        'public-instance-field',
        'protected-instance-field',
        'private-instance-field',
        'constructor',
        'public-static-method',
        'protected-static-method',
        'private-static-method',
        'public-instance-method',
        'protected-instance-method',
        'private-instance-method'
      ]
    }],
    
    // ========== Import Rules ==========
    
    // Enforce import order
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
        'object',
        'type'
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true
      }
    }],
    
    // Prevent unresolved imports
    'import/no-unresolved': 'error',
    
    // Prevent useless path segments
    'import/no-useless-path-segments': 'error',
    
    // Enforce consistent import extensions
    'import/extensions': ['error', 'never', {
      json: 'always',
      css: 'always'
    }],
    
    // ========== General Best Practices ==========
    
    // Enforce consistent return
    'consistent-return': 'error',
    
    // Enforce default case in switch
    'default-case': 'error',
    
    // Enforce dot notation
    'dot-notation': 'error',
    
    // Disallow alert
    'no-alert': 'error',
    
    // Disallow console (except warn and error)
    'no-console': ['error', { 
      allow: ['warn', 'error'] 
    }],
    
    // Disallow debugger
    'no-debugger': 'error',
    
    // Disallow duplicate imports
    'no-duplicate-imports': 'error',
    
    // Disallow nested ternary
    'no-nested-ternary': 'error',
    
    // Disallow unnecessary fragments
    'react/jsx-no-useless-fragment': 'error',
    
    // Prefer const
    'prefer-const': 'error',
    
    // Prefer template literals
    'prefer-template': 'error',
    
    // Require await in async functions
    'require-await': 'error',
    
    // ========== Comments and Documentation ==========
    
    // Enforce JSDoc comments
    'require-jsdoc': ['error', {
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: true,
        ArrowFunctionExpression: false,
        FunctionExpression: false
      }
    }],
    
    // Enforce valid JSDoc
    'valid-jsdoc': ['error', {
      requireReturn: false,
      requireReturnType: false,
      requireParamType: false,
      requireReturnDescription: false
    }],
    
    // Enforce multiline comment style
    'multiline-comment-style': ['error', 'starred-block']
  },
  
  overrides: [
    {
      // Test files have relaxed rules
      files: ['**/__tests__/**/*', '**/*.test.ts', '**/*.test.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'max-lines-per-function': 'off',
        'max-lines': 'off',
        'max-statements': 'off',
        'require-jsdoc': 'off'
      }
    }
  ],
  
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json'
      },
      alias: {
        map: [
          ['@/TaskDetail', './src/pages/TaskDetail']
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
      }
    }
  }
};