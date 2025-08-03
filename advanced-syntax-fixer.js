#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 高级语法错误修复工具
 * 处理更复杂的语法错误模式
 */

const sourceDir = './frontend/src';
const extensions = ['.tsx', '.ts', '.js', '.jsx'];

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'build', 'dist'].includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else if (extensions.some(ext => file.endsWith(ext))) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// 更精确的内容修复
function fixAdvancedSyntax(content) {
  let fixed = content;
  
  // 1. 修复行末多余的单引号
  fixed = fixed.replace(/';$/gm, ';');
  fixed = fixed.replace(/'$/gm, '');
  
  // 2. 修复JSON对象中的引号问题
  fixed = fixed.replace(/: "([^"]*)"'$/gm, ': "$1"');
  
  // 3. 修复模板字符串中的引号问题
  fixed = fixed.replace(/`([^`]*)`'/gm, '`$1`');
  
  // 4. 修复函数调用中的引号问题
  fixed = fixed.replace(/\)'/gm, ')');
  
  // 5. 修复数组和对象结尾的引号问题
  fixed = fixed.replace(/\]'/gm, ']');
  fixed = fixed.replace(/\}'/gm, '}');
  
  // 6. 修复条件语句中的引号问题
  fixed = fixed.replace(/\{'/gm, '{');
  
  // 7. 修复注释行的引号问题
  fixed = fixed.replace(/\/\/([^']*)'$/gm, '//$1');
  fixed = fixed.replace(/\/\*([^*]*)\*\/'$/gm, '/*$1*/');
  
  // 8. 修复 import/export 语句的引号问题
  fixed = fixed.replace(/from\s+'([^']+)';'/gm, "from '$1';");
  fixed = fixed.replace(/import\s+'([^']+)';'/gm, "import '$1';");
  
  // 9. 修复JSX标签中的引号问题
  fixed = fixed.replace(/>'$/gm, '>');
  fixed = fixed.replace(/<\/([^>]+)>'$/gm, '</$1>');
  
  // 10. 修复缺失的分号和括号
  fixed = fixed.replace(/(\w+)\s*\n\s*\}/gm, '$1;\n}');
  
  // 11. 修复未闭合的括号
  const openParens = (fixed.match(/\(/g) || []).length;
  const closeParens = (fixed.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    // 在文件末尾添加缺失的右括号
    const missingParens = openParens - closeParens;
    fixed += '\n' + ')'.repeat(missingParens);
  }
  
  // 12. 修复未闭合的大括号
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    const missingBraces = openBraces - closeBraces;
    fixed += '\n' + '}'.repeat(missingBraces);
  }
  
  // 13. 修复字符串字面量问题
  fixed = fixed.replace(/""([^""]*)""'/gm, '"$1"');
  
  // 14. 修复模板字符串引号混乱
  fixed = fixed.replace(/"\s*\+\s*'/gm, '');
  
  return fixed;
}

function processFile(filePath) {
  try {
    console.log(`处理文件: ${filePath}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixAdvancedSyntax(content);
    
    if (content !== fixedContent) {
      // 创建备份
      const backupPath = filePath + '.backup';
      fs.writeFileSync(backupPath, content, 'utf8');
      
      // 写入修复后的内容
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      console.log(`  ✓ 已修复: ${filePath} (已创建备份)`);
      return true;
    } else {
      console.log(`  - 无需修复: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`  ✗ 处理失败: ${filePath}`, error.message);
    return false;
  }
}

function main() {
  console.log('开始高级语法错误修复...\n');
  
  if (!fs.existsSync(sourceDir)) {
    console.error(`错误: 源代码目录不存在: ${sourceDir}`);
    process.exit(1);
  }
  
  const files = getAllFiles(sourceDir);
  console.log(`找到 ${files.length} 个文件需要检查\n`);
  
  let fixedCount = 0;
  files.forEach(file => {
    if (processFile(file)) {
      fixedCount++;
    }
  });
  
  console.log(`\n高级修复完成! 共修复了 ${fixedCount} 个文件`);
  
  // 清理无用的工具文件
  const toolFiles = ['fix-syntax-errors.js', 'advanced-syntax-fixer.js'];
  toolFiles.forEach(file => {
    if (fs.existsSync(file)) {
      // fs.unlinkSync(file);
      console.log(`保留工具文件: ${file}`);
    }
  });
}

if (require.main === module) {
  main();
}

module.exports = { fixAdvancedSyntax, processFile };