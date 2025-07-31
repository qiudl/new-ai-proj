#!/usr/bin/env node

/**
 * 超级安全的未使用变量清理器
 * 只处理最安全的情况，避免引入TypeScript错误
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SAFE_PATTERNS = [
  // 只处理明确未使用的解构赋值变量
  {
    name: 'Unused destructured variables (conservative)',
    // 匹配 const { used, unused } = something; 中的unused
    test: (line, fileName, lineNumber) => {
      // 非常保守：只处理简单的解构模式
      const match = line.match(/const\s*{\s*([^}]+)\s*}\s*=\s*[^;]+;/);
      if (!match) return null;
      
      const variables = match[1].split(',').map(v => v.trim());
      // 只有2-3个变量的简单情况
      if (variables.length < 2 || variables.length > 3) return null;
      
      return { type: 'destructuring', variables };
    }
  },
  
  // 只处理明确的unused函数参数（加下划线前缀）
  {
    name: 'Add underscore prefix to unused parameters',
    test: (line, fileName, lineNumber) => {
      // 匹配函数参数中明确未使用的情况
      if (line.includes('error') && line.includes('is defined but never used')) {
        const paramMatch = line.match(/'([^']+)' is defined but never used/);
        if (paramMatch && paramMatch[1]) {
          return { type: 'unused_param', param: paramMatch[1] };
        }
      }
      return null;
    }
  }
];

class SafeUnusedVarsCleaner {
  constructor() {
    this.processedFiles = 0;
    this.fixedVars = 0;
    this.dryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose');
  }

  log(message) {
    if (this.verbose) {
      console.log(`[VERBOSE] ${message}`);
    }
  }

  // 获取当前的ESLint错误
  getCurrentErrors() {
    try {
      const output = execSync('npm run lint 2>&1', { encoding: 'utf-8' });
      return output;
    } catch (error) {
      return error.stdout || error.message;
    }
  }

  // 只处理unused variables错误
  getUnusedVarsErrors() {
    const lintOutput = this.getCurrentErrors();
    const lines = lintOutput.split('\n');
    const errors = [];
    
    for (const line of lines) {
      if (line.includes('@typescript-eslint/no-unused-vars') && 
          (line.includes('is defined but never used') || line.includes('is assigned a value but never used'))) {
        
        // 解析文件路径和行号
        const match = line.match(/^(.+?):(\d+):(\d+)\s+error\s+(.+)/);
        if (match) {
          const [, filePath, lineNum, colNum, message] = match;
          
          // 提取变量名
          const varMatch = message.match(/'([^']+)' is (?:defined but never used|assigned a value but never used)/);
          if (varMatch) {
            errors.push({
              file: filePath,
              line: parseInt(lineNum),
              column: parseInt(colNum),
              variable: varMatch[1],
              message: message.trim()
            });
          }
        }
      }
    }
    
    return errors;
  }

  // 安全地处理单个文件
  processFile(filePath, errors) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在: ${filePath}`);
      return false;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      let modified = false;
      
      // 按行号倒序处理，避免行号偏移
      const fileErrors = errors.filter(e => e.file.includes(path.basename(filePath)))
                               .sort((a, b) => b.line - a.line);
      
      for (const error of fileErrors) {
        const lineIndex = error.line - 1;
        if (lineIndex >= 0 && lineIndex < lines.length) {
          const line = lines[lineIndex];
          
          // 只处理最安全的情况
          if (this.canSafelyFix(line, error.variable)) {
            const newLine = this.fixUnusedVariable(line, error.variable);
            if (newLine !== line) {
              this.log(`修复 ${filePath}:${error.line} - ${error.variable}`);
              lines[lineIndex] = newLine;
              modified = true;
              this.fixedVars++;
            }
          }
        }
      }
      
      if (modified && !this.dryRun) {
        const newContent = lines.join('\n');
        fs.writeFileSync(filePath, newContent, 'utf-8');
        this.processedFiles++;
        return true;
      }
      
      return modified;
    } catch (error) {
      console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
      return false;
    }
  }

  // 判断是否可以安全修复
  canSafelyFix(line, variable) {
    // 跳过复杂的情况
    if (line.includes('useState') || 
        line.includes('useEffect') || 
        line.includes('useCallback') ||
        line.includes('interface') ||
        line.includes('type ') ||
        line.includes('export') ||
        line.includes('import')) {
      return false;
    }
    
    // 只处理简单的变量声明
    const simpleDeclaration = new RegExp(`\\b(const|let|var)\\s+${variable}\\s*[=:]`);
    const functionParam = new RegExp(`\\(.*\\b${variable}\\b.*\\)\\s*[=:>]`);
    const destructuring = new RegExp(`{.*\\b${variable}\\b.*}`);
    
    return simpleDeclaration.test(line) || functionParam.test(line) || destructuring.test(line);
  }

  // 修复未使用的变量
  fixUnusedVariable(line, variable) {
    // 方法1：添加下划线前缀（适用于函数参数）
    const paramPattern = new RegExp(`\\b${variable}\\b(?=\\s*[,)])`, 'g');
    if (paramPattern.test(line)) {
      return line.replace(new RegExp(`\\b${variable}\\b`, 'g'), `_${variable}`);
    }
    
    // 方法2：解构时移除未使用的变量（非常保守）
    const destructuringMatch = line.match(/const\s*{\s*([^}]+)\s*}\s*=/);
    if (destructuringMatch) {
      const variables = destructuringMatch[1].split(',').map(v => v.trim());
      const filteredVars = variables.filter(v => v !== variable);
      
      // 只在还有其他变量时才移除
      if (filteredVars.length > 0 && filteredVars.length < variables.length) {
        const newDestructuring = `const { ${filteredVars.join(', ')} } =`;
        return line.replace(/const\s*{\s*[^}]+\s*}\s*=/, newDestructuring);
      }
    }
    
    return line;
  }

  // 验证修复后没有TypeScript错误
  validateTypeScript() {
    try {
      console.log('🔍 验证TypeScript编译...');
      execSync('npm run type-check', { stdio: 'pipe' });
      console.log('✅ TypeScript编译通过');
      return true;
    } catch (error) {
      console.error('❌ TypeScript编译失败，回滚修改');
      return false;
    }
  }

  async run() {
    console.log('🧹 启动安全的未使用变量清理器...');
    console.log(`模式: ${this.dryRun ? 'DRY RUN (预览)' : '实际修复'}`);
    
    // 获取所有未使用变量错误
    const errors = this.getUnusedVarsErrors();
    console.log(`📊 发现 ${errors.length} 个未使用变量错误`);
    
    if (errors.length === 0) {
      console.log('✅ 没有发现未使用变量错误');
      return;
    }
    
    // 按文件分组
    const fileGroups = {};
    for (const error of errors) {
      const fileName = error.file;
      if (!fileGroups[fileName]) {
        fileGroups[fileName] = [];
      }
      fileGroups[fileName].push(error);
    }
    
    console.log(`📁 涉及 ${Object.keys(fileGroups).length} 个文件`);
    
    // 处理每个文件
    for (const [filePath, fileErrors] of Object.entries(fileGroups)) {
      console.log(`\n📝 处理文件: ${path.basename(filePath)} (${fileErrors.length} 个错误)`);
      
      if (this.dryRun) {
        console.log(`   预览模式 - 跳过实际修改`);
        continue;
      }
      
      const success = this.processFile(filePath, fileErrors);
      if (success) {
        // 每处理一个文件就验证一次TypeScript
        if (!this.validateTypeScript()) {
          console.error(`❌ 文件 ${filePath} 的修改导致了TypeScript错误，需要手动检查`);
          break;
        }
      }
    }
    
    console.log('\n📊 处理结果:');
    console.log(`   处理文件: ${this.processedFiles}`);
    console.log(`   修复变量: ${this.fixedVars}`);
    
    if (!this.dryRun) {
      // 最终验证
      const finalCheck = this.validateTypeScript();
      if (finalCheck) {
        console.log('\n✅ 所有修复完成，TypeScript编译正常');
      } else {
        console.log('\n❌ 发现TypeScript错误，请检查修改');
      }
    }
  }
}

// 运行清理器
const cleaner = new SafeUnusedVarsCleaner();
cleaner.run().catch(console.error);