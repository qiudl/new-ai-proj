#!/usr/bin/env node

/**
 * 🎯 当前活跃组件性能优化器
 * 专门优化src/目录下的活跃组件
 */

const fs = require('fs');
const path = require('path');

// 获取当前活跃的组件文件
function getCurrentComponentFiles() {
  const files = [
    'src/components/CompanyForm.tsx',
    'src/components/TaskTable.tsx', 
    'src/components/ProjectDetailPage.tsx',
    'src/components/Dashboard.tsx',
    'src/components/SimpleHistoryTasks.tsx',
    'src/components/TimerCard.tsx',
    'src/components/TaskDetailPageNew.tsx',
    'src/pages/DashboardPage.tsx',
    'src/pages/ProjectsPage.tsx',
    'src/hooks/useAsyncData.ts',
    'src/hooks/useCache.ts',
    'src/hooks/useTimer.ts',
    'src/services/dashboardService.ts',
    'src/services/taskService.ts
  ];
  
  return files.filter(file => {
    const fullPath = path.join(__dirname, '..', '..', file);
    return fs.existsSync(fullPath);
  });
}

// 智能性能优化
function optimizeComponentPerformance(content, fileName) {
  let optimized = content;
  let changes = [];

  // 1. 添加React.memo到功能组件
  if (fileName.endsWith('.tsx') && content.includes(': React.FC') && !content.includes('React.memo')) {
    optimized = optimized.replace(
      /(const\s+\w+:\s*React\.FC<[^>]*>\s*=\s*)\(/g,
      '$1React.memo((
    );
    
    // 在组件末尾添加闭合括号
    optimized = optimized.replace(
      /(};\s*$)/,
      '});\n
    );
    
    changes.push('添加React.memo优化');
  }

  // 2. 优化useState初始值
  optimized = optimized.replace(
    /useState\((\{[^}]+\}|\[[^\]]+\])\)/g,
    (match, initialValue) => {
      return `useState(() => ${initialValue})`;
    }
  );

  // 3. 添加useCallback到事件处理函数
  if (!optimized.includes('useCallback')) {
    // 添加useCallback import
    if (optimized.includes("from 'react'")) {
      optimized = optimized.replace(
        /import\s*({[^}]*})\s*from\s*['"]react['"];?/,
        (match, imports) => {
          if (!imports.includes('useCallback')) {
            return match.replace('}, ', useCallback});
          }
          return match;
        }
      );
      changes.push('添加useCallback导入');
    }
  }

  // 4. 优化effect依赖
  optimized = optimized.replace(
    /(useEffect\([^,]+,\s*)\[\]/g,
    '$1[]
  );

  // 5. 移除不必要的重渲染
  optimized = optimized.replace(
    /onClick=\{([^}]+)\}/g,
    (match, handler) => {
      if (!handler.includes('useCallback') && handler.includes('=>')) {
        return `onClick={useCallback(${handler}, [])}`;
      }
      return match;
    }
  );

  return { optimized, changes };
}

// 添加性能监控代码
function addPerformanceMonitoring(content, fileName) {
  if (!fileName.endsWith('.tsx')) return content;

  const componentName = path.basename(fileName, '.tsx');
  
  // 添加性能监控hook
  const performanceHook = `
// Performance monitoring (development only)
const componentName = '${componentName};
React.useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.time(\`\${componentName} render\`);
    return () => console.timeEnd(\`\${componentName} render\`);
  }
}, []);
`;

  // 在第一个useState之前插入性能监控
  const insertPoint = content.indexOf('useState');
  if (insertPoint > -1) {
    return content.slice(0, insertPoint) + performanceHook + '\n  ' + content.slice(insertPoint);
  }

  return content;
}

// 主优化函数
function main() {
  console.log('🎯 开始当前活跃组件性能优化...\n');
  
  const files = getCurrentComponentFiles();
  console.log(`📁 找到 ${files.length} 个活跃组件文件`);
  
  let optimizedCount = 0;
  const allChanges = [];
  
  for (const file of files) {
    const fullPath = path.join(__dirname, '..', '..', file);
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // 应用性能优化
    const { optimized, changes } = optimizeComponentPerformance(content, file);
    
    // 添加性能监控（仅开发环境）
    const withMonitoring = addPerformanceMonitoring(optimized, file);
    
    if (withMonitoring !== content) {
      fs.writeFileSync(fullPath, withMonitoring);
      console.log(`✅ 优化 ${file}`);
      if (changes.length > 0) {
        console.log(`   📈 应用优化: ${changes.join(', ')}`);
        allChanges.push(...changes);
      }
      optimizedCount++;
    } else {
      console.log(`⏭️  跳过 ${file} - 已优化`);
    }
  }
  
  console.log(`\n📊 组件性能优化统计:`);
  console.log(`   - 处理文件: ${files.length} 个`);
  console.log(`   - 优化文件: ${optimizedCount} 个`);
  console.log(`   - 优化类型: ${[...new Set(allChanges)].join(', ')}`);
  console.log(`⚡ 当前组件性能优化完成！`);
  
  // 生成性能优化建议
  console.log(`\n💡 性能优化建议:`);
  console.log(`   1. 运行 npm run build 检查bundle大小变化`);
  console.log(`   2. 使用React DevTools Profiler监控组件性能`);
  console.log(`   3. 考虑使用React.lazy进行代码分割`);
  console.log(`   4. 定期检查和清理未使用的依赖`);
}

if (require.main === module) {
  main();
}
)))