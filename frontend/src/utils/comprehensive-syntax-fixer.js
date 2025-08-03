#!/usr/bin/env node

/**
 * 🛠️ 综合语法错误修复器
 * 修复TypeScript优化过程中产生的各种语法错误
 */

const fs = require('fs');
const path = require('path');

// 获取所有有语法错误的文件
function getFilesWithSyntaxErrors() {
  const files = [];
  
  function scanDir(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDir(fullPath);
        } else if ((item.endsWith('.tsx') || item.endsWith('.ts')) && !item.endsWith('.d.ts')) {
          const relativePath = path.relative(path.join(__dirname, '..', '..'), fullPath);
          files.push(relativePath);
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
  }
  
  scanDir(path.join(__dirname, '..', '..'));
  return files;
}

function fixCommonSyntaxErrors(content, fileName) {
  let fixed = content;
  let changes = [];

  // 1. 修复多余的闭合括号
  fixed = fixed.replace(/^\s*\);\s*$/gm, '');
  
  // 2. 修复未完成的模板字符串
  fixed = fixed.replace(/}MB`\);/g, '`););
  
  // 3. 修复错误的函数声明
  fixed = fixed.replace(/\s+}\s*catch\s*\(/g, '\n      } catch (');
  
  // 4. 修复未关闭的字符串字面量
  fixed = fixed.replace(/(['"])[^'"]*$/gm, (match, quote) => {
    if (!match.endsWith(quote)) {
      return match + quote;
    }
    return match;
  });
  
  // 5. 修复错误的try-catch块
  fixed = fixed.replace(/}\s*catch\s*\(\s*error[^}]*}\s*\)[\s\n]*}/g, (match) => {
    return match.replace(/\)\s*}$/, '');
  });

  // 6. 修复错误的await语句
  fixed = fixed.replace(/await\s+\);/g, '););
  
  // 7. 移除多余的分号
  fixed = fixed.replace(/;;\s*/g, '; ');
  
  // 8. 修复括号不匹配
  const openCount = (fixed.match(/\(/g) || []).length;
  const closeCount = (fixed.match(/\)/g) || []).length;
  
  if (openCount !== closeCount) {
    changes.push(`修复括号匹配问题 (${openCount} vs ${closeCount})`);
  }

  return { fixed, changes };
}

function fixSpecificFileErrors(content, fileName) {
  let fixed = content;
  let changes = [];

  // 针对特定文件的修复
  if (fileName.includes('useSmartPreload.ts')) {
    // 修复useSmartPreload特定错误
    fixed = fixed.replace(/group\.map\(async \(strategy\) => \{\s*try\s*}\);/g, 
      'group.map(async (strategy) => {\n              try {\n                await strategy.prefetcher();\n              } catch (error) {\n                console.error(error);\n              }\n            }));
    );
    changes.push('修复useSmartPreload异步映射');
  }

  if (fileName.includes('useTaskParentSearch.ts')) {
    // 修复useTaskParentSearch特定错误
    fixed = fixed.replace(/if \(searchTerm\.trim\(\) === ['"']['"]/g, "if (searchTerm.trim() === ''");
    changes.push('修复useTaskParentSearch字符串字面量');
  }

  return { fixed, changes };
}

function main() {
  console.log('🛠️ 开始综合语法错误修复...\n');
  
  const files = getFilesWithSyntaxErrors();
  console.log(`📁 找到 ${files.length} 个TypeScript文件`);
  
  let fixedCount = 0;
  const allChanges = [];
  
  for (const file of files) {
    const fullPath = path.join(__dirname, '..', '..', file);
    
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // 应用通用修复
        const { fixed: commonFixed, changes: commonChanges } = fixCommonSyntaxErrors(content, file);
        
        // 应用特定修复
        const { fixed: specificFixed, changes: specificChanges } = fixSpecificFileErrors(commonFixed, file);
        
        const allFileChanges = [...commonChanges, ...specificChanges];
        
        if (specificFixed !== content) {
          fs.writeFileSync(fullPath, specificFixed);
          console.log(`✅ 修复 ${file}`);
          if (allFileChanges.length > 0) {
            console.log(`   🔧 应用修复: ${allFileChanges.join(', ')}`);
            allChanges.push(...allFileChanges);
          }
          fixedCount++;
        } else {
          console.log(`⏭️  跳过 ${file} - 无需修复`);
        }
      } catch (error) {
        console.log(`❌ 处理文件失败 ${file}: ${error.message}`);
      }
    }
  }
  
  console.log(`\n📊 综合语法修复统计:`);
  console.log(`   - 检查文件: ${files.length} 个`);
  console.log(`   - 修复文件: ${fixedCount} 个`);
  console.log(`   - 修复类型: ${[...new Set(allChanges)].join(', ')}`);
  console.log(`⚡ 综合语法错误修复完成！`);
}

if (require.main === module) {
  main();
}