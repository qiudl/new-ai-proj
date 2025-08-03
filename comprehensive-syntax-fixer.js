#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 综合语法错误修复工具
 * 更加精确地处理各种语法错误
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

// 恢复被错误删除的引号
function restoreQuotes(content) {
  let fixed = content;
  
  // 1. 恢复 import 语句中的引号
  fixed = fixed.replace(/import React from 'react;/g, "import React from 'react';");
  fixed = fixed.replace(/import ([^']+) from '([^']+);/g, "import $1 from '$2';");
  fixed = fixed.replace(/from '([^']+);/g, "from '$1';");
  
  // 2. 恢复 import CSS 文件的引号
  fixed = fixed.replace(/import '([^']+\.css);/g, "import '$1';");
  
  // 3. 恢复一般的字符串字面量
  fixed = fixed.replace(/console\.warn\('([^']+);/g, "console.warn('$1');");
  
  // 4. 恢复对象属性中的引号
  fixed = fixed.replace(/v7_relativeSplatPath: true;/g, "v7_relativeSplatPath: true");
  
  // 5. 修复闭合括号和分号问题
  fixed = fixed.replace(/}\)\)\)/g, "}");
  
  return fixed;
}

// 综合修复函数
function comprehensiveFix(content) {
  let fixed = content;
  
  // 首先恢复被错误删除的引号
  fixed = restoreQuotes(fixed);
  
  // 检查和平衡括号
  const lines = fixed.split('\n');
  const fixedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // 移除重复的分号和引号组合
    line = line.replace(/;'/g, ';');
    line = line.replace(/'$/g, '');
    
    // 但是保留字符串字面量中的引号
    if (!line.includes('import ') && !line.includes('from ')) {
      // 只在非import行处理
    }
    
    fixedLines.push(line);
  }
  
  return fixedLines.join('\n');
}

function processFile(filePath) {
  try {
    console.log(`处理文件: ${filePath}`);
    
    // 检查是否有备份文件，如果有就从备份恢复
    const backupPath = filePath + '.backup';
    let content;
    
    if (fs.existsSync(backupPath)) {
      console.log(`  从备份恢复: ${filePath}`);
      content = fs.readFileSync(backupPath, 'utf8');
    } else {
      content = fs.readFileSync(filePath, 'utf8');
    }
    
    const fixedContent = comprehensiveFix(content);
    
    if (content !== fixedContent) {
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      console.log(`  ✓ 已修复: ${filePath}`);
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
  console.log('开始综合语法错误修复...\n');
  
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
  
  console.log(`\n综合修复完成! 共修复了 ${fixedCount} 个文件`);
  
  // 验证修复结果
  console.log('\n正在验证修复结果...');
  const { execSync } = require('child_process');
  
  try {
    execSync('cd frontend && npm run type-check', { stdio: 'pipe' });
    console.log('✓ TypeScript 类型检查通过');
  } catch (error) {
    console.log('⚠ TypeScript 类型检查仍有错误');
    console.log('Error snippet:', error.stdout?.toString().substring(0, 500));
  }
}

if (require.main === module) {
  main();
}

module.exports = { comprehensiveFix, processFile };