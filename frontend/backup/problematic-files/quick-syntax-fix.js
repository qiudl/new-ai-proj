#!/usr/bin/env node

/**
 * 快速语法修复工具
 * 针对特定的语法错误进行修复
 */

const fs = require('fs');
const path = require('path');

// 修复文件中的常见语法错误
function quickFixFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let modified = false;
  
  // 1. 修复错误的模板字符串（反引号被转义）
  content = content.replace(/\\`/g, '`');
  
  // 2. 修复不完整的模板字符串
  // 查找不匹配的反引号
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 如果行包含单独的 } 元`); 这样的错误模式
    if (line.includes('} 元`);)) {
      lines[i] = line.replace('} 元`);, '元`););
      modified = true;
    }
    
    // 如果行只有 ...'); 这样的错误模式
    if (line.trim() === "...');") {
      lines[i] = line.replace("...(')", "// 加载数据");
      modified = true;
    }
    
    // 修复未闭合的template literal
    if (line.includes('`') && !line.match(/`[^`]*`/)) {
      const backtickCount = (line.match(/`/g) || []).length;
      if (backtickCount % 2 === 1 && i < lines.length - 1) {
        const nextLine = lines[i + 1];
        if (nextLine && !nextLine.includes('`')) {
          // 在当前行末尾添加闭合的反引号
          lines[i] += '`';
          modified = true;
        }
      }
    }
  }
  
  if (modified) {
    content = lines.join('\n');
  }
  
  // 3. 修复 as unknown 类型断言错误
  content = content.replace(/\|\| 0 as unknown/g, '|| 0');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  return false;
}

// 获取需要修复的文件列表
function getErrorFiles() {
  return [
    'src/components/CompanyForm.tsx',
    'src/components/DocumentFileManager.tsx', 
    'src/components/SimpleHistoryTasks.tsx',
    'src/hooks/useCache.ts',
    'src/hooks/useRealtimeCollaboration.ts',
    'src/hooks/useSmartPreload.ts
  ];
}

// 主函数
function main() {
  console.log('🔧 快速修复TypeScript语法错误...\n');
  
  const errorFiles = getErrorFiles();
  let fixedCount = 0;
  
  for (const file of errorFiles) {
    const fullPath = path.join(__dirname, '..', '..', file);
    if (fs.existsSync(fullPath)) {
      if (quickFixFile(fullPath)) {
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
  console.log(`✨ 快速语法修复完成！`);
}

if (require.main === module) {
  main();
}

module.exports = { quickFixFile };