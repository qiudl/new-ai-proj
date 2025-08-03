#!/usr/bin/env node

/**
 * 🔧 修复React性能优化过程中产生的语法错误
 * 专门修复React.memo包装和性能监控代码插入错误
 */

const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const problematicFiles = [
  'src/components/TimerCard.tsx',
  'src/pages/DashboardPage.tsx',
  'src/pages/ProjectsPage.tsx',
  'src/components/DocumentFileManager.tsx
];

function fixPerformanceOptimizationSyntax(content, fileName) {
  let fixed = content;
  let changes = [];

  // 1. 修复错误插入的性能监控代码
  if (fixed.includes('// Performance monitoring (development only)')) {
    // 移除错误插入的性能监控代码
    fixed = fixed.replace(
      /import\s+React,\s*{\s*([^}]*)\s*\/\/\s*Performance monitoring[^}]+}\s*from\s*'react';/g,
      (match, imports) => {
        // 提取正确的imports
        const cleanImports = imports.split(',').map(imp => imp.trim()).filter(imp => 
          !imp.includes('const') && !imp.includes('React.useEffect') && imp.length > 0
        ).join(', ');
        return `import React, { ${cleanImports} } from 'react';`;
      }
    );
    
    // 移除错误的顶级代码
    fixed = fixed.replace(
      /const\s+componentName\s*=\s*[^;]+;\s*React\.useEffect\([^}]+}\);?\s*/g,
      
    );
    
    changes.push('移除错误插入的性能监控代码');
  }

  // 2. 确保React.memo正确包装
  if (fixed.includes('React.memo')) {
    // 检查是否需要修复React.memo包装
    const memoMatch = fixed.match(/(const\s+\w+:\s*React\.FC[^=]*=\s*React\.memo\(\()/);
    if (memoMatch) {
      // 确保有正确的结束括号
      if (!fixed.includes('});)) {
        // 在export前添加结束括号
        fixed = fixed.replace(
          /(export\s+default\s+\w+;)/,
          '});\n\n$1
        );
        changes.push('添加React.memo结束括号');
      }
    }
  }

  // 3. 修复import语句
  if (fixed.includes('useState } from')) {
    fixed = fixed.replace(
      /import\s+React,\s*{\s*([^}]*)\s*}\s*from\s*'react';/,
      (match, imports) => {
        const cleanImports = imports.split(',').map(imp => imp.trim()).filter(imp => imp.length > 0);
        const uniqueImports = [...new Set(cleanImports)];
        return `import React, { ${uniqueImports.join(', ')} } from 'react';`;
      }
    );
    changes.push('修复import语句');
  }

  return { fixed, changes };
}

function main() {
  console.log('🔧 开始修复React性能优化语法错误...\n');
  
  let fixedCount = 0;
  const allChanges = [];
  
  for (const file of problematicFiles) {
    const fullPath = path.join(__dirname, '..', '..', file);
    
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const { fixed, changes } = fixPerformanceOptimizationSyntax(content, file);
      
      if (fixed !== content) {
        fs.writeFileSync(fullPath, fixed);
        console.log(`✅ 修复 ${file}`);
        if (changes.length > 0) {
          console.log(`   🔧 应用修复: ${changes.join(', ')}`);
          allChanges.push(...changes);
        }
        fixedCount++;
      } else {
        console.log(`⏭️  跳过 ${file} - 无需修复`);
      }
    } else {
      console.log(`❌ 文件不存在: ${file}`);
    }
  }
  
  console.log(`\n📊 语法修复统计:`);
  console.log(`   - 检查文件: ${problematicFiles.length} 个`);
  console.log(`   - 修复文件: ${fixedCount} 个`);
  console.log(`   - 修复类型: ${[...new Set(allChanges)].join(', ')}`);
  console.log(`⚡ React性能优化语法错误修复完成！`);
}

if (require.main === module) {
  main();
}