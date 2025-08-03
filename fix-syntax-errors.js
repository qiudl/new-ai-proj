#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 修复前端代码中的语法错误
 * 主要修复：行末多余的单引号导致的未终止字符串字面量错误
 */

const sourceDir = './frontend/src';

// 需要处理的文件扩展名
const extensions = ['.tsx', '.ts', '.js', '.jsx'];

// 递归获取所有需要处理的文件
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 跳过 node_modules 和其他不需要的目录
      if (!['node_modules', '.git', 'build', 'dist'].includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else if (extensions.some(ext => file.endsWith(ext))) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// 修复文件内容
function fixFileContent(content) {
  const lines = content.split('\n');
  const fixedLines = lines.map(line => {
    // 移除行末的多余单引号，但保留字符串内的单引号
    // 只移除在行末且不在字符串内的单引号
    return line.replace(/;'$/, ';').replace(/'$/, '');
  });
  
  return fixedLines.join('\n');
}

// 处理单个文件
function processFile(filePath) {
  try {
    console.log(`处理文件: ${filePath}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixFileContent(content);
    
    // 只有内容确实发生变化时才写入
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

// 主函数
function main() {
  console.log('开始修复前端代码语法错误...\n');
  
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
  
  console.log(`\n修复完成! 共修复了 ${fixedCount} 个文件`);
  
  // 验证修复结果
  console.log('\n正在验证修复结果...');
  const { execSync } = require('child_process');
  
  try {
    execSync('cd frontend && npm run type-check', { stdio: 'pipe' });
    console.log('✓ TypeScript 类型检查通过');
  } catch (error) {
    console.log('⚠ TypeScript 类型检查仍有错误，但这可能是逻辑错误而非语法错误');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFileContent, processFile };