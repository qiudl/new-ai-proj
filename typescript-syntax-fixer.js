#!/usr/bin/env node

/**
 * TypeScript语法错误修复工具
 * 专门修复模板字符串和引号问题
 */

const fs = require('fs');
const path = require('path');

// 修复文件中的语法错误
function fixSyntaxErrors(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let modified = false;
  
  // 1. 修复错误的模板字符串语法（反引号被转义）
  content = content.replace(/\\`/g, '`');
  
  // 2. 修复错误的字符串引号
  content = content.replace(/[""]([^"""]*?)[""]"/g, '"$1"');
  
  // 3. 修复未闭合的模板字符串
  const lines = content.split('\n');
  const fixedLines = [];
  let inTemplateLiteral = false;
  let templateStartLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // 检查模板字符串开始
    const backtickCount = (line.match(/`/g) || []).length;
    if (backtickCount % 2 === 1) {
      if (!inTemplateLiteral) {
        inTemplateLiteral = true;
        templateStartLine = i;
      } else {
        inTemplateLiteral = false;
      }
    }
    
    // 如果在模板字符串中且行以非反引号结尾，添加反引号
    if (inTemplateLiteral && i > templateStartLine && !line.trim().endsWith('`')) {
      // 检查下一行是否开始新的语句
      const nextLine = lines[i + 1];
      if (nextLine && (nextLine.trim().startsWith('const ') || 
                      nextLine.trim().startsWith('let ') ||
                      nextLine.trim().startsWith('var ') ||
                      nextLine.trim().startsWith('function ') ||
                      nextLine.trim().startsWith('export ') ||
                      nextLine.trim().startsWith('import ') ||
                      nextLine.trim().startsWith('}'))) {
        line += '`';
        inTemplateLiteral = false;
        modified = true;
      }
    }
    
    fixedLines.push(line);
  }
  
  const newContent = fixedLines.join('\n');
  
  if (newContent !== originalContent) {
    fs.writeFileSync(filePath, newContent);
    modified = true;
  }
  
  return modified;
}

// 获取有语法错误的文件列表
function getErrorFiles() {
  return [
    'frontend/src/components/CompanyForm.tsx',
    'frontend/src/components/DocumentFileManager.tsx',
    'frontend/src/components/SimpleHistoryTasks.tsx',
    'frontend/src/hooks/useCache.ts',
    'frontend/src/hooks/useRealtimeCollaboration.ts',
    'frontend/src/hooks/useSmartPreload.ts',
    'frontend/src/utils/validation.ts',
    'frontend/src/utils/systemValidator.ts'
  ];
}

// 主函数
function main() {
  console.log('🔧 修复TypeScript语法错误...\n');
  
  const errorFiles = getErrorFiles();
  let fixedCount = 0;
  
  for (const file of errorFiles) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      if (fixSyntaxErrors(fullPath)) {
        console.log(`✅ 修复 ${file}`);
        fixedCount++;
      } else {
        console.log(`⏭️  跳过 ${file} (无需修复)`);
      }
    } else {
      console.log(`⚠️  文件不存在: ${file}`);
    }
  }
  
  console.log(`\n📊 修复统计:`);
  console.log(`   - 修复文件: ${fixedCount} 个`);
  console.log(`   - 总文件: ${errorFiles.length} 个`);
  console.log(`✨ 语法错误修复完成！`);
}

if (require.main === module) {
  main();
}