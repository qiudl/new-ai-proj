#!/usr/bin/env node

/**
 * AI批量修复未使用变量脚本
 * 智能识别并移除未使用的导入和变量
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取ESLint报告
function getESLintReport() {
  try {
    const output = execSync('npm run lint', { encoding: 'utf-8', cwd: __dirname });
    return output;
  } catch (error) {
    return error.stdout || error.message;
  }
}

// 解析未使用变量错误
function parseUnusedVarsErrors(lintOutput) {
  const lines = lintOutput.split('\n');
  const errors = [];
  
  for (const line of lines) {
    if (line.includes('@typescript-eslint/no-unused-vars')) {
      const match = line.match(/^(.+?):(\d+):(\d+)\s+error\s+.*'(.+?)'.*(is defined but never used|is assigned a value but never used)/);
      if (match) {
        const [, filePath, lineNum, colNum, varName, errorType] = match;
        errors.push({
          filePath: filePath.trim(),
          lineNum: parseInt(lineNum),
          colNum: parseInt(colNum),
          varName: varName.trim(),
          errorType: errorType.trim()
        });
      }
    }
  }
  
  return errors;
}

// 修复单个文件中的未使用变量
function fixUnusedVarsInFile(filePath, errors) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;
  
  // 按行号倒序排序，这样修改时不会影响后面的行号
  const fileErrors = errors.filter(e => e.filePath === filePath)
    .sort((a, b) => b.lineNum - a.lineNum);
  
  for (const error of fileErrors) {
    const lineIndex = error.lineNum - 1;
    const line = lines[lineIndex];
    
    if (!line) continue;
    
    // 处理import语句中的未使用变量
    if (line.trim().startsWith('import') && line.includes(error.varName)) {
      const newLine = removeFromImport(line, error.varName);
      if (newLine !== line) {
        if (newLine.trim() === '' || newLine.match(/^import\s*{\s*}\s*from/)) {
          // 如果整行import都空了，删除整行
          lines.splice(lineIndex, 1);
        } else {
          lines[lineIndex] = newLine;
        }
        modified = true;
        console.log(`✅ 修复 ${filePath}:${error.lineNum} - 移除未使用的导入: ${error.varName}`);
      }
    }
    // 处理变量声明中的未使用变量
    else if (line.includes('const') || line.includes('let') || line.includes('var')) {
      if (error.errorType.includes('assigned a value but never used')) {
        // 对于赋值但未使用的变量，在变量名前加下划线
        const newLine = line.replace(new RegExp(`\\b${error.varName}\\b`), `_${error.varName}`);
        if (newLine !== line) {
          lines[lineIndex] = newLine;
          modified = true;
          console.log(`✅ 修复 ${filePath}:${error.lineNum} - 标记未使用变量: ${error.varName} -> _${error.varName}`);
        }
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'));
    return true;
  }
  
  return false;
}

// 从import语句中移除指定的变量
function removeFromImport(importLine, varName) {
  // 处理命名导入 import { A, B, C } from 'module'
  if (importLine.includes('{') && importLine.includes('}')) {
    const beforeBrace = importLine.substring(0, importLine.indexOf('{') + 1);
    const afterBrace = importLine.substring(importLine.indexOf('}'));
    const imports = importLine.substring(importLine.indexOf('{') + 1, importLine.indexOf('}'));
    
    const importList = imports.split(',').map(s => s.trim()).filter(s => s && s !== varName);
    
    if (importList.length === 0) {
      return ''; // 删除整行
    }
    
    return beforeBrace + ' ' + importList.join(', ') + ' ' + afterBrace;
  }
  
  // 处理默认导入
  if (importLine.includes(varName) && !importLine.includes('{')) {
    return ''; // 删除整行
  }
  
  return importLine;
}

// 主函数
function main() {
  console.log('🚀 开始AI批量修复未使用变量...\n');
  
  const lintOutput = getESLintReport();
  const errors = parseUnusedVarsErrors(lintOutput);
  
  console.log(`📊 发现 ${errors.length} 个未使用变量错误\n`);
  
  // 按文件分组
  const fileGroups = {};
  errors.forEach(error => {
    if (!fileGroups[error.filePath]) {
      fileGroups[error.filePath] = [];
    }
    fileGroups[error.filePath].push(error);
  });
  
  let totalFixed = 0;
  let filesModified = 0;
  
  for (const [filePath, fileErrors] of Object.entries(fileGroups)) {
    console.log(`🔧 处理文件: ${path.relative(__dirname, filePath)} (${fileErrors.length}个错误)`);
    
    if (fixUnusedVarsInFile(filePath, fileErrors)) {
      filesModified++;
      totalFixed += fileErrors.length;
    }
  }
  
  console.log(`\n✨ 修复完成！`);
  console.log(`📁 修改文件数: ${filesModified}`);
  console.log(`🔧 修复错误数: ${totalFixed}`);
  
  // 重新运行ESLint检查修复效果
  console.log('\n📋 重新检查ESLint状态...');
  const newLintOutput = getESLintReport();
  const newErrors = parseUnusedVarsErrors(newLintOutput);
  
  console.log(`📈 修复前: ${errors.length} 个未使用变量错误`);
  console.log(`📉 修复后: ${newErrors.length} 个未使用变量错误`);
  console.log(`🎯 修复率: ${((errors.length - newErrors.length) / errors.length * 100).toFixed(1)}%`);
}

if (require.main === module) {
  main();
}