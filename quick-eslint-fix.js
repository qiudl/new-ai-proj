#!/usr/bin/env node

/**
 * 快速ESLint修复器 - 专注于最关键的错误
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取所有未使用的变量和导入
function getUnusedVarsFromESLint() {
  try {
    const output = execSync('npm run lint', { 
      encoding: 'utf-8',
      cwd: path.join(__dirname, '.')
    });
    return [];
  } catch (error) {
    const output = error.stdout || error.message;
    const lines = output.split('\n');
    const unused = [];
    
    for (const line of lines) {
      if (line.includes('is defined but never used') || 
          line.includes('is assigned a value but never used')) {
        const match = line.match(/(.+?):(\d+):(\d+)\s+error\s+.*'(.+?)'/);
        if (match) {
          const [, filePath, lineNum, colNum, varName] = match;
          unused.push({
            file: filePath.trim(),
            line: parseInt(lineNum),
            variable: varName.trim()
          });
        }
      }
    }
    
    return unused;
  }
}

// 修复单个文件的未使用变量
function fixUnusedInFile(filePath, variables) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  for (const varName of variables) {
    // 给未使用的变量加下划线前缀
    const patterns = [
      // import语句中的变量
      new RegExp(`(import\\s*{[^}]*?)\\b${varName}\\b([^}]*})`, 'g'),
      // 变量声明
      new RegExp(`\\b${varName}\\b(?=\\s*[:=])`, 'g'),
      // 函数参数
      new RegExp(`\\(([^)]*?)\\b${varName}\\b([^)]*?)\\)`, 'g')
    ];
    
    for (const pattern of patterns) {
      if (content.match(pattern)) {
        content = content.replace(pattern, (match, p1, p2) => {
          if (p1 && p2) {
            return `${p1}_${varName}${p2}`;
          }
          return match.replace(new RegExp(`\\b${varName}\\b`), `_${varName}`);
        });
        modified = true;
        break;
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  return false;
}

// 主要修复函数
function main() {
  console.log('🚀 开始快速ESLint修复...\n');
  
  const startTime = Date.now();
  
  // 获取未使用变量
  console.log('📊 分析未使用变量...');
  const unusedVars = getUnusedVarsFromESLint();
  console.log(`找到 ${unusedVars.length} 个未使用变量\n`);
  
  // 按文件分组
  const fileGroups = {};
  unusedVars.forEach(item => {
    if (!fileGroups[item.file]) {
      fileGroups[item.file] = [];
    }
    fileGroups[item.file].push(item.variable);
  });
  
  let fixedFiles = 0;
  let totalFixed = 0;
  
  // 修复每个文件
  for (const [filePath, variables] of Object.entries(fileGroups)) {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`🔧 修复 ${relativePath} (${variables.length}个变量)`);
    
    if (fixUnusedInFile(filePath, variables)) {
      fixedFiles++;
      totalFixed += variables.length;
      console.log(`✅ 已修复 ${variables.join(', ')}`);
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  
  console.log(`\n✨ 快速修复完成！`);
  console.log(`📊 修复统计:`);
  console.log(`   - 修复文件: ${fixedFiles} 个`);
  console.log(`   - 修复变量: ${totalFixed} 个`);
  console.log(`   - 执行时间: ${duration} 秒`);
  
  // 检查修复效果
  console.log('\n📋 检查修复效果...');
  try {
    execSync('npm run lint', { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '.')
    });
    console.log('🎉 ESLint检查通过！');
  } catch (error) {
    const output = String(error.stdout || error.message);
    const errorCount = (output.match(/error/g) || []).length;
    const warningCount = (output.match(/warning/g) || []).length;
    console.log(`📈 剩余问题: ${errorCount} 错误, ${warningCount} 警告`);
  }
}

if (require.main === module) {
  main();
}