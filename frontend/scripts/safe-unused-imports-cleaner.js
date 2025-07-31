#!/usr/bin/env node

/**
 * 安全的未使用import清理器
 * 只移除明确未使用的import语句，保持TypeScript编译正常
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SafeUnusedImportsCleaner {
  constructor() {
    this.processedFiles = 0;
    this.removedImports = 0;
    this.dryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose');
  }

  log(message) {
    if (this.verbose) {
      console.log(`[VERBOSE] ${message}`);
    }
  }

  // 获取未使用import错误
  getUnusedImportsErrors() {
    try {
      const output = execSync('npm run lint 2>&1', { encoding: 'utf-8' });
      const lines = output.split('\n');
      const errors = [];
      
      for (const line of lines) {
        if (line.includes('@typescript-eslint/no-unused-vars') && 
            line.includes('is defined but never used')) {
          
          // 解析文件路径、行号和变量名
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4) {
            const location = parts[0]; // 如 "15:3"
            const errorType = parts[1]; // "error"
            const message = line.substring(line.indexOf("'"));
            
            const varMatch = message.match(/'([^']+)' is defined but never used/);
            if (varMatch) {
              const variable = varMatch[1];
              const [lineNum, colNum] = location.split(':').map(n => parseInt(n));
              
              errors.push({
                line: lineNum,
                column: colNum,
                variable: variable,
                message: line.trim()
              });
            }
          }
        }
      }
      
      return errors;
    } catch (error) {
      console.error('获取ESLint输出失败:', error.message);
      return [];
    }
  }

  // 获取当前处理的文件路径（从ESLint输出推断）
  getCurrentFile(lintOutput) {
    const lines = lintOutput.split('\n');
    let currentFile = null;
    
    for (const line of lines) {
      if (line.startsWith('/') && line.includes('.tsx')) {
        currentFile = line;
      }
    }
    
    return currentFile;
  }

  // 安全地移除未使用的import
  removeUnusedImport(content, variable, lineNumber) {
    const lines = content.split('\n');
    const targetLineIndex = lineNumber - 1;
    
    if (targetLineIndex < 0 || targetLineIndex >= lines.length) {
      return content;
    }
    
    const line = lines[targetLineIndex];
    
    // 检查是否是import语句
    if (!line.includes('import') || !line.includes(variable)) {
      return content;
    }
    
    // 处理不同的import模式
    let newLine = line;
    
    // 模式1: import { var1, var2, var3 } from 'module'
    const namedImportMatch = line.match(/import\s*{\s*([^}]+)\s*}\s*from/);
    if (namedImportMatch) {
      const imports = namedImportMatch[1].split(',').map(i => i.trim()).filter(i => i.length > 0);
      const filteredImports = imports.filter(imp => {
        // 移除目标变量，但保留其他的
        const cleanImp = imp.replace(/\s+as\s+\w+/, ''); // 处理 "Foo as Bar"
        return cleanImp !== variable;
      });
      
      if (filteredImports.length === 0) {
        // 如果没有其他imports，移除整行
        lines.splice(targetLineIndex, 1);
        return lines.join('\n');
      } else if (filteredImports.length < imports.length) {
        // 重建import语句
        const newImportList = filteredImports.join(', ');
        newLine = line.replace(/{\s*[^}]+\s*}/, `{ ${newImportList} }`);
      }
    }
    
    // 模式2: import Foo from 'module' (default import)
    const defaultImportMatch = line.match(/import\s+(\w+)\s+from/);
    if (defaultImportMatch && defaultImportMatch[1] === variable) {
      // 移除整个default import
      lines.splice(targetLineIndex, 1);
      return lines.join('\n');
    }
    
    // 模式3: import * as Foo from 'module'
    const namespaceImportMatch = line.match(/import\s*\*\s*as\s+(\w+)\s+from/);
    if (namespaceImportMatch && namespaceImportMatch[1] === variable) {
      lines.splice(targetLineIndex, 1);
      return lines.join('\n');
    }
    
    // 如果行被修改了，更新它
    if (newLine !== line) {
      lines[targetLineIndex] = newLine;
      return lines.join('\n');
    }
    
    return content;
  }

  // 处理单个文件
  processFile(filePath, errors) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在: ${filePath}`);
      return false;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      const originalContent = content;
      
      // 按行号倒序处理，避免行号偏移
      const sortedErrors = errors.sort((a, b) => b.line - a.line);
      
      for (const error of sortedErrors) {
        const newContent = this.removeUnusedImport(content, error.variable, error.line);
        if (newContent !== content) {
          this.log(`移除 ${path.basename(filePath)}:${error.line} - ${error.variable}`);
          content = newContent;
          this.removedImports++;
        }
      }
      
      if (content !== originalContent) {
        if (!this.dryRun) {
          fs.writeFileSync(filePath, content, 'utf-8');
        }
        this.processedFiles++;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
      return false;
    }
  }

  // 验证TypeScript编译
  validateTypeScript() {
    try {
      execSync('npm run type-check', { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  // 通过文件名获取完整路径
  findFilePath(filename) {
    const srcDir = './src';
    
    function searchFile(dir, target) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          const found = searchFile(fullPath, target);
          if (found) return found;
        } else if (file === target) {
          return fullPath;
        }
      }
      return null;
    }
    
    return searchFile(srcDir, filename);
  }

  async run() {
    console.log('🧹 启动安全的未使用imports清理器...');
    console.log(`模式: ${this.dryRun ? 'DRY RUN (预览)' : '实际修复'}`);
    
    // 获取完整的lint输出，按文件分组处理
    try {
      const lintOutput = execSync('npm run lint 2>&1', { encoding: 'utf-8' });
      const lines = lintOutput.split('\n');
      
      let currentFile = null;
      const fileErrors = {};
      
      // 解析ESLint输出
      for (const line of lines) {
        // 检测文件路径行
        if (line.startsWith('/') && line.includes('.tsx')) {
          currentFile = line.trim();
          fileErrors[currentFile] = [];
        }
        // 检测错误行
        else if (currentFile && line.includes('@typescript-eslint/no-unused-vars') && 
                 line.includes('is defined but never used')) {
          
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4) {
            const location = parts[0]; // 如 "15:3"
            const message = line.substring(line.indexOf("'"));
            const varMatch = message.match(/'([^']+)' is defined but never used/);
            
            if (varMatch) {
              const variable = varMatch[1];
              const [lineNum, colNum] = location.split(':').map(n => parseInt(n));
              
              fileErrors[currentFile].push({
                line: lineNum,
                column: colNum,
                variable: variable
              });
            }
          }
        }
      }
      
      const filesWithErrors = Object.keys(fileErrors).filter(f => fileErrors[f].length > 0);
      console.log(`📊 发现 ${filesWithErrors.length} 个文件有未使用的imports`);
      
      if (filesWithErrors.length === 0) {
        console.log('✅ 没有发现未使用的imports');
        return;
      }
      
      // 处理每个文件
      for (const filePath of filesWithErrors) {
        const errors = fileErrors[filePath];
        console.log(`\n📝 处理文件: ${path.basename(filePath)} (${errors.length} 个未使用imports)`);
        
        if (this.dryRun) {
          for (const error of errors) {
            console.log(`   预览: 将移除 ${error.variable} (行 ${error.line})`);
          }
          continue;
        }
        
        const success = this.processFile(filePath, errors);
        if (success) {
          // 验证TypeScript
          if (!this.validateTypeScript()) {
            console.error(`❌ 文件 ${filePath} 的修改导致了TypeScript错误`);
            console.log('   建议手动检查或回滚此文件');
            // 不要中断，继续处理其他文件
          } else {
            console.log('✅ TypeScript验证通过');
          }
        }
      }
      
      console.log('\n📊 处理结果:');
      console.log(`   处理文件: ${this.processedFiles}`);
      console.log(`   移除imports: ${this.removedImports}`);
      
      if (!this.dryRun && this.processedFiles > 0) {
        console.log('\n🔍 最终验证TypeScript...');
        const finalCheck = this.validateTypeScript();
        if (finalCheck) {
          console.log('✅ 所有修复完成，TypeScript编译正常');
        } else {
          console.log('❌ 发现TypeScript错误，请检查修改');
        }
      }

    } catch (error) {
      console.error('处理过程中出错:', error.message);
    }
  }
}

// 运行清理器
const cleaner = new SafeUnusedImportsCleaner();
cleaner.run().catch(console.error);