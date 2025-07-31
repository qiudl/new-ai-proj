#!/usr/bin/env node

/**
 * 渐进式ESLint问题清理器
 * 安全的、逐步的修复方式，每次只处理少量文件
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class IncrementalCleanup {
  constructor() {
    this.dryRun = process.argv.includes('--dry-run');
    this.maxFiles = parseInt(process.argv.find(arg => arg.startsWith('--max-files='))?.split('=')[1]) || 5;
    this.verbose = process.argv.includes('--verbose');
  }

  log(message) {
    if (this.verbose || !this.dryRun) {
      console.log(message);
    }
  }

  // 获取ESLint错误统计
  getErrorStats() {
    try {
      const output = execSync('npm run lint 2>&1', { encoding: 'utf-8' });
      const lines = output.split('\n');
      
      // 提取最后的统计行
      const statsLine = lines.find(line => line.includes('problems'));
      if (statsLine) {
        const match = statsLine.match(/(\d+) problems \((\d+) errors, (\d+) warnings\)/);
        if (match) {
          return {
            total: parseInt(match[1]),
            errors: parseInt(match[2]),
            warnings: parseInt(match[3])
          };
        }
      }
      
      return { total: 0, errors: 0, warnings: 0 };
    } catch (error) {
      return { total: 0, errors: 0, warnings: 0 };
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

  // 安全地移除未使用的简单imports
  cleanupFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      const originalContent = content;
      let modifications = 0;

      // 获取该文件的ESLint错误
      const lintOutput = execSync(`npx eslint ${filePath} 2>&1 || true`, { encoding: 'utf-8' });
      const errorLines = lintOutput.split('\n').filter(line => 
        line.includes('@typescript-eslint/no-unused-vars') && 
        line.includes('is defined but never used')
      );

      // 处理每个未使用的变量
      for (const errorLine of errorLines) {
        const match = errorLine.match(/'([^']+)' is defined but never used/);
        if (!match) continue;
        
        const unusedVar = match[1];
        this.log(`  检查未使用变量: ${unusedVar}`);

        // 安全的清理模式
        const lines = content.split('\n');
        let modified = false;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // 模式1: 从导入中移除单个未使用的变量
          if (line.includes('import') && line.includes(unusedVar)) {
            // 简单的命名导入: import { A, B, C } from 'module'
            const namedImportMatch = line.match(/import\s*{\s*([^}]+)\s*}\s*from/);
            if (namedImportMatch) {
              const imports = namedImportMatch[1].split(',').map(s => s.trim()).filter(s => s);
              const filteredImports = imports.filter(imp => {
                const cleanImp = imp.replace(/\s+as\s+\w+/, '').trim();
                return cleanImp !== unusedVar;
              });
              
              if (filteredImports.length !== imports.length) {
                if (filteredImports.length === 0) {
                  // 移除整个import行
                  lines.splice(i, 1);
                  i--; // 调整索引
                } else {
                  // 重建import语句
                  lines[i] = line.replace(/{\s*[^}]+\s*}/, `{ ${filteredImports.join(', ')} }`);
                }
                modified = true;
                modifications++;
                this.log(`    ✓ 移除了 ${unusedVar}`);
                break;
              }
            }
            
            // 默认导入: import Foo from 'module'
            const defaultImportMatch = line.match(/import\s+(\w+)\s+from/);
            if (defaultImportMatch && defaultImportMatch[1] === unusedVar) {
              lines.splice(i, 1);
              modified = true;
              modifications++;
              this.log(`    ✓ 移除了默认导入 ${unusedVar}`);
              break;
            }
          }
          
          // 模式2: 解构赋值中移除未使用的变量
          if (line.includes(unusedVar) && (line.includes('const {') || line.includes('= Typography'))) {
            const destructureMatch = line.match(/const\s*{\s*([^}]+)\s*}\s*=/);
            if (destructureMatch) {
              const vars = destructureMatch[1].split(',').map(s => s.trim()).filter(s => s);
              const filteredVars = vars.filter(v => v !== unusedVar);
              
              if (filteredVars.length !== vars.length && filteredVars.length > 0) {
                lines[i] = line.replace(/{\s*[^}]+\s*}/, `{ ${filteredVars.join(', ')} }`);
                modified = true;
                modifications++;
                this.log(`    ✓ 从解构中移除了 ${unusedVar}`);
                break;
              }
            }
          }
        }

        if (modified) {
          content = lines.join('\n');
        }
      }

      // 如果有修改，验证并保存
      if (content !== originalContent) {
        if (!this.dryRun) {
          fs.writeFileSync(filePath, content, 'utf-8');
          
          // 立即验证TypeScript
          if (!this.validateTypeScript()) {
            this.log(`    ❌ TypeScript错误，回滚 ${path.basename(filePath)}`);
            fs.writeFileSync(filePath, originalContent, 'utf-8');
            return false;
          }
        }
        
        this.log(`  ✅ 修改了 ${modifications} 个未使用的变量`);
        return true;
      }

      return false;
    } catch (error) {
      this.log(`  ❌ 处理文件失败: ${error.message}`);
      return false;
    }
  }

  // 获取有未使用变量错误的文件列表
  getFilesWithErrors() {
    try {
      const output = execSync('npm run lint 2>&1', { encoding: 'utf-8' });
      const lines = output.split('\n');
      
      const files = [];
      let currentFile = null;
      let errorCount = 0;
      
      for (const line of lines) {
        if (line.startsWith('/') && line.includes('.tsx')) {
          if (currentFile && errorCount > 0) {
            files.push({ path: currentFile, errors: errorCount });
          }
          currentFile = line.trim();
          errorCount = 0;
        } else if (currentFile && line.includes('@typescript-eslint/no-unused-vars')) {
          errorCount++;
        }
      }
      
      // 添加最后一个文件
      if (currentFile && errorCount > 0) {
        files.push({ path: currentFile, errors: errorCount });
      }
      
      // 按错误数量排序，优先处理错误少的文件
      return files.sort((a, b) => a.errors - b.errors).slice(0, this.maxFiles);
    } catch (error) {
      return [];
    }
  }

  async run() {
    console.log('🔧 启动渐进式ESLint清理器');
    console.log(`模式: ${this.dryRun ? 'DRY RUN (预览)' : '实际修复'}`);
    console.log(`最大文件数: ${this.maxFiles}`);
    
    const initialStats = this.getErrorStats();
    console.log(`\n📊 初始状态: ${initialStats.total} 个问题 (${initialStats.errors} 错误, ${initialStats.warnings} 警告)`);
    
    const filesToProcess = this.getFilesWithErrors();
    if (filesToProcess.length === 0) {
      console.log('✅ 没有发现未使用变量错误');
      return;
    }
    
    console.log(`\n📁 将处理 ${filesToProcess.length} 个文件:`);
    filesToProcess.forEach(file => {
      console.log(`  - ${path.basename(file.path)} (${file.errors} 个错误)`);
    });
    
    if (this.dryRun) {
      console.log('\n🔍 预览模式 - 不会实际修改文件');
      return;
    }
    
    let processedFiles = 0;
    let successfulFiles = 0;
    
    for (const file of filesToProcess) {
      console.log(`\n📝 处理: ${path.basename(file.path)}`);
      processedFiles++;
      
      const success = this.cleanupFile(file.path);
      if (success) {
        successfulFiles++;
      }
      
      // 每处理一个文件检查一次整体状态
      const currentStats = this.getErrorStats();
      console.log(`  当前状态: ${currentStats.total} 个问题`);
    }
    
    const finalStats = this.getErrorStats();
    const improvement = initialStats.total - finalStats.total;
    
    console.log('\n📊 最终结果:');
    console.log(`  处理文件: ${processedFiles}/${filesToProcess.length}`);
    console.log(`  成功文件: ${successfulFiles}`);
    console.log(`  问题减少: ${improvement} (${initialStats.total} → ${finalStats.total})`);
    
    if (improvement > 0) {
      console.log('✅ 成功改善了代码质量！');
    } else {
      console.log('ℹ️  这批文件可能需要手动处理');
    }
    
    // 最后验证TypeScript
    if (!this.dryRun) {
      const tsOk = this.validateTypeScript();
      console.log(`TypeScript编译: ${tsOk ? '✅ 正常' : '❌ 有错误'}`);
    }
  }
}

// 运行清理器
const cleaner = new IncrementalCleanup();
cleaner.run().catch(console.error);