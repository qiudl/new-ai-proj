#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class EmergencyFix {
  constructor() {
    this.fixedFiles = 0;
    this.totalErrors = 0;
  }

  // 修复破损的导入语句
  fixImportStatements(content) {
    let fixed = content;
    let changes = 0;

    // 修复缺失的导入开头 - 查找孤立的 } from 语句
    const lines = fixed.split('\n');
    const fixedLines = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // 如果发现 } from 开头的孤立语句
      if (trimmed.match(/^\}\s*from\s*['"]/)) {
        // 查找前面最近的可能导入内容
        let j = i - 1;
        let importContent = [];
        
        while (j >= 0) {
          const prevLine = lines[j].trim();
          if (prevLine === '' || prevLine.startsWith('//')) {
            j--;
            continue;
          }
          
          // 如果找到了import语句，停止
          if (prevLine.startsWith('import')) {
            break;
          }
          
          // 如果这行看起来像导入内容（标识符、逗号等）
          if (prevLine.match(/^[A-Za-z_$][A-Za-z0-9_$,\s]*,?\s*$/)) {
            importContent.unshift(prevLine);
            j--;
          } else {
            break; // 遇到不相关的内容，停止
          }
        }
        
        if (importContent.length > 0) {
          // 移除之前收集的行
          for (let k = 0; k < importContent.length; k++) {
            fixedLines.pop();
          }
          
          // 构建完整的导入语句
          const fullImport = `import { ${importContent.join('\n  ')} ${trimmed}`;
          fixedLines.push(fullImport);
          changes++;
        } else {
          // 如果没找到内容，跳过这行
          changes++;
        }
      } else {
        fixedLines.push(line);
      }
      
      i++;
    }
    
    if (changes > 0) {
      fixed = fixedLines.join('\n');
    }

    // 修复重复的React导入
    if (fixed.includes('import React from') && fixed.includes('import React,')) {
      fixed = fixed.replace(/import React from 'react';\s*\n/g, '');
      changes++;
    }

    // 修复App.tsx特殊情况
    if (fixed.includes('import React, { Suspense, useEffect } from \'react\';\nimport React, { Suspense, useEffect } from \'react\';')) {
      fixed = fixed.replace(/import React, \{ Suspense, useEffect \} from 'react';\s*\n/g, '');
      fixed = 'import React, { Suspense, useEffect } from \'react\';\n' + fixed;
      changes++;
    }

    return { content: fixed, changes };
  }

  // 处理单个文件
  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let fixed = content;
      let totalChanges = 0;

      // 应用修复
      const importFix = this.fixImportStatements(fixed);
      fixed = importFix.content;
      totalChanges += importFix.changes;

      // 如果有修改，写入文件
      if (totalChanges > 0) {
        fs.writeFileSync(filePath, fixed);
        console.log(`🚨 紧急修复 ${totalChanges} 个问题: ${path.relative(process.cwd(), filePath)}`);
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

  // 主执行函数
  async run() {
    console.log('🚨 开始紧急修复...');
    
    // 处理源代码文件
    const srcDir = path.join(__dirname, '../src');
    await this.processDirectory(srcDir);
    
    console.log('='.repeat(60));
    console.log(`🚨 紧急修复完成!`);
    console.log(`📁 修复文件数: ${this.fixedFiles}`);
    console.log(`🐛 修复错误数: ${this.totalErrors}`);
    console.log('='.repeat(60));
  }
}

// 执行修复
if (require.main === module) {
  const fixer = new EmergencyFix();
  fixer.run().catch(console.error);
}

module.exports = EmergencyFix;