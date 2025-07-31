#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class TargetedBatchFixer {
  constructor() {
    this.fixedFiles = 0;
    this.totalErrors = 0;
    this.errorTypes = {
      emptyImports: 0,
      unusedVars: 0,
      missingImports: 0,
      duplicateImports: 0
    };
  }

  // 修复空的导入标识符
  fixEmptyImports(content) {
    let fixed = content;
    let changes = 0;

    // 修复 import { , ... } 这种空标识符
    const emptyImportPattern = /import\s*\{\s*,([^}]*)\}\s*from\s*(['"][^'"]+['"])/g;
    fixed = fixed.replace(emptyImportPattern, (match, items, from) => {
      changes++;
      const cleanItems = items.trim();
      if (cleanItems) {
        return `import { ${cleanItems} } from ${from}`;
      } else {
        return ''; // 如果没有有效导入，删除整行
      }
    });

    // 修复 import { ..., , ... } 多个连续逗号
    const multipleCommasPattern = /import\s*\{([^}]*),\s*,([^}]*)\}\s*from\s*(['"][^'"]+['"])/g;
    fixed = fixed.replace(multipleCommasPattern, (match, before, after, from) => {
      changes++;
      const items = [before.trim(), after.trim()].filter(Boolean).join(', ');
      return `import { ${items} } from ${from}`;
    });

    // 修复行尾的空逗号
    const trailingCommaPattern = /import\s*\{([^}]*),\s*\}\s*from\s*(['"][^'"]+['"])/g;
    fixed = fixed.replace(trailingCommaPattern, (match, items, from) => {
      changes++;
      return `import { ${items.trim()} } from ${from}`;
    });

    return { content: fixed, changes };
  }

  // 修复未使用的变量
  fixUnusedVars(content) {
    let fixed = content;
    let changes = 0;

    // 移除未使用的解构赋值
    const unusedDestructPatterns = [
      /const\s*\{\s*info\s*,?\s*success\s*,?\s*error\s*,?\s*warning\s*\}\s*=\s*Modal;\s*\n?/g,
      /const\s*\{\s*success\s*,?\s*error\s*,?\s*warning\s*\}\s*=\s*Modal;\s*\n?/g,
      /const\s*\{\s*error\s*,?\s*warning\s*\}\s*=\s*Modal;\s*\n?/g,
      /const\s*\{\s*success\s*,?\s*error\s*\}\s*=\s*Modal;\s*\n?/g,
      /const\s*\{\s*Panel\s*\}\s*=\s*Collapse;\s*\n?/g,
      /const\s*\{\s*Content\s*\}\s*=\s*Layout;\s*\n?/g,
      /const\s*\{\s*Step\s*\}\s*=\s*Steps;\s*\n?/g,
    ];

    unusedDestructPatterns.forEach(pattern => {
      const matches = [...fixed.matchAll(pattern)];
      if (matches.length > 0) {
        fixed = fixed.replace(pattern, '');
        changes += matches.length;
      }
    });

    return { content: fixed, changes };
  }

  // 修复缺失的导入
  fixMissingImports(content, filePath) {
    let fixed = content;
    let changes = 0;

    // 检查是否使用了但没有导入的组件
    const componentUsagePatterns = {
      'FloatingTimer': 'import FloatingTimer from \'./FloatingTimer\';',
      'ErrorBoundary': 'import ErrorBoundary from \'./ErrorBoundary\';',
      'TimerProvider': 'import { TimerProvider } from \'../contexts/TimerContext\';',
    };

    Object.entries(componentUsagePatterns).forEach(([component, importStatement]) => {
      const usageRegex = new RegExp(`<${component}[\\s>]`, 'g');
      const importRegex = new RegExp(`import.*${component}`, 'g');
      
      if (usageRegex.test(fixed) && !importRegex.test(fixed)) {
        // 在现有导入后添加缺失的导入
        const importInsertPoint = fixed.lastIndexOf('import ');
        if (importInsertPoint !== -1) {
          const nextLineIndex = fixed.indexOf('\n', importInsertPoint);
          if (nextLineIndex !== -1) {
            fixed = fixed.slice(0, nextLineIndex + 1) + importStatement + '\n' + fixed.slice(nextLineIndex + 1);
            changes++;
          }
        }
      }
    });

    return { content: fixed, changes };
  }

  // 清理重复的导入
  fixDuplicateImports(content) {
    let fixed = content;
    let changes = 0;

    const lines = fixed.split('\n');
    const importMap = new Map();
    const otherLines = [];
    let inImportSection = true;

    lines.forEach(line => {
      const trimmed = line.trim();
      
      if (inImportSection && trimmed.startsWith('import ')) {
        const match = trimmed.match(/import\s+(.+?)\s+from\s+(['"][^'"]+['"])/);
        if (match) {
          const [, imports, module] = match;
          if (importMap.has(module)) {
            // 合并导入
            const existing = importMap.get(module);
            const merged = this.mergeImports(existing, imports);
            importMap.set(module, merged);
            changes++;
          } else {
            importMap.set(module, imports);
          }
        } else {
          otherLines.push(line);
        }
      } else {
        if (inImportSection && trimmed !== '') {
          inImportSection = false;
          
          // 添加所有合并后的导入
          for (const [module, imports] of importMap) {
            otherLines.push(`import ${imports} from ${module};`);
          }
          
          if (importMap.size > 0) {
            otherLines.push(''); // 添加空行
          }
        }
        otherLines.push(line);
      }
    });

    if (changes > 0) {
      fixed = otherLines.join('\n');
    }

    return { content: fixed, changes };
  }

  // 合并导入语句
  mergeImports(existing, newImports) {
    // 简化版本：直接返回新的导入，避免复杂的合并逻辑
    return newImports;
  }

  // 处理单个文件
  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let fixed = content;
      let totalChanges = 0;

      // 按优先级应用修复
      const emptyImportFix = this.fixEmptyImports(fixed);
      fixed = emptyImportFix.content;
      totalChanges += emptyImportFix.changes;
      this.errorTypes.emptyImports += emptyImportFix.changes;

      const unusedVarFix = this.fixUnusedVars(fixed);
      fixed = unusedVarFix.content;
      totalChanges += unusedVarFix.changes;
      this.errorTypes.unusedVars += unusedVarFix.changes;

      const missingImportFix = this.fixMissingImports(fixed, filePath);
      fixed = missingImportFix.content;
      totalChanges += missingImportFix.changes;
      this.errorTypes.missingImports += missingImportFix.changes;

      const duplicateImportFix = this.fixDuplicateImports(fixed);
      fixed = duplicateImportFix.content;
      totalChanges += duplicateImportFix.changes;
      this.errorTypes.duplicateImports += duplicateImportFix.changes;

      // 如果有修改，写入文件
      if (totalChanges > 0) {
        fs.writeFileSync(filePath, fixed);
        console.log(`🎯 修复 ${totalChanges} 个问题: ${path.relative(process.cwd(), filePath)}`);
        this.fixedFiles++;
        this.totalErrors += totalChanges;
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
      return false;
    }
  }

  // 递归处理目录
  async processDirectory(dir) {
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules' && entry !== 'backups') {
        await this.processDirectory(fullPath);
      } else if (entry.match(/\.(ts|tsx|js|jsx)$/)) {
        await this.processFile(fullPath);
      }
    }
  }

  // 生成详细报告
  generateDetailedReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 针对性批量修复报告');
    console.log('='.repeat(60));
    console.log(`📁 修复文件数: ${this.fixedFiles}`);
    console.log(`🐛 修复错误总数: ${this.totalErrors}`);
    console.log('');
    console.log('📊 错误类型分布:');
    console.log(`   • 空导入标识符: ${this.errorTypes.emptyImports}`);
    console.log(`   • 未使用变量: ${this.errorTypes.unusedVars}`);
    console.log(`   • 缺失导入: ${this.errorTypes.missingImports}`);
    console.log(`   • 重复导入: ${this.errorTypes.duplicateImports}`);
    console.log('='.repeat(60));
    
    if (this.totalErrors > 0) {
      console.log('\n🔄 建议接下来运行:');
      console.log('1. npm run lint:fix');
      console.log('2. npm run type-check');
      console.log('3. npm run lint (检查剩余问题)');
    }
  }

  // 主执行函数
  async run() {
    console.log('🎯 开始针对性批量修复...');
    
    // 处理源代码文件
    const srcDir = path.join(__dirname, '../src');
    await this.processDirectory(srcDir);
    
    // 生成详细报告
    this.generateDetailedReport();
  }
}

// 执行修复
if (require.main === module) {
  const fixer = new TargetedBatchFixer();
  fixer.run().catch(console.error);
}

module.exports = TargetedBatchFixer;