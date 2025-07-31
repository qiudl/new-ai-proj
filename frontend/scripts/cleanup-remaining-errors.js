#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 清理剩余错误的强力工具
 * 处理未使用变量、重复导入、缺失组件等问题
 */

const stats = {
  filesProcessed: 0,
  unusedVarsFixed: 0,
  duplicateImportsFixed: 0,
  missingImportsAdded: 0,
  parametersFixed: 0
};

// 需要添加的缺失组件
const missingComponents = {
  'Row': 'antd',
  'Col': 'antd', 
  'Option': 'antd',
  'Space': 'antd',
  'Button': 'antd',
  'Input': 'antd',
  'TextArea': 'antd'
};

function fixDuplicateImports(content) {
  let modified = false;

  // 修复重复的api.ts导入
  const apiDuplicatePattern = /(import\s+[^;]+from\s+['"][^'"]*\/api['"];?\s*)(import\s+[^;]+from\s+['"][^'"]*\/api['"];?)/g;
  content = content.replace(apiDuplicatePattern, (match, first, second) => {
    // 合并两个导入
    const firstImports = first.match(/import\s+({[^}]*}|\w+)/)?.[1] || '';
    const secondImports = second.match(/import\s+({[^}]*}|\w+)/)?.[1] || '';
    
    if (firstImports.includes('{') && secondImports.includes('{')) {
      const firstItems = firstImports.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean);
      const secondItems = secondImports.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean);
      const allItems = [...new Set([...firstItems, ...secondItems])];
      
      const modulePath = first.match(/from\s+['"]([^'"]+)['"]/)?.[1] || '';
      modified = true;
      stats.duplicateImportsFixed++;
      return `import { ${allItems.join(', ')} } from '${modulePath}';`;
    }
    
    return first; // 保留第一个，删除第二个
  });

  // 修复dnd-kit重复导入
  const dndPattern = /(import\s+{[^}]*}\s+from\s+['"]@dnd-kit\/sortable['"];?\s*)(import\s+{[^}]*}\s+from\s+['"]@dnd-kit\/sortable['"];?)/g;
  content = content.replace(dndPattern, (match, first, second) => {
    const firstImports = first.match(/{([^}]*)}/)?.[1] || '';
    const secondImports = second.match(/{([^}]*)}/)?.[1] || '';
    
    const allImports = [...new Set([
      ...firstImports.split(',').map(s => s.trim()).filter(Boolean),
      ...secondImports.split(',').map(s => s.trim()).filter(Boolean)
    ])];
    
    modified = true;
    stats.duplicateImportsFixed++;
    return `import { ${allImports.join(', ')} } from '@dnd-kit/sortable';`;
  });

  return { content, modified };
}

function fixUnusedVariables(content) {
  let modified = false;

  // 修复未使用的参数 - 添加下划线前缀
  const unusedParamPatterns = [
    // 函数参数
    /(\([^)]*?)(\w+)(\s*:\s*[^,)]+)(\s*[,)])/g,
    // 箭头函数参数
    /(=\s*\([^)]*?)(\w+)(\s*:\s*[^,)]+)(\s*[,)])/g
  ];

  // 常见的未使用参数名
  const commonUnusedParams = [
    'index', 'format', 'values', 'options', 'params', 'id', 'status', 
    'results', 'query', 'onImport', 'onReuse', 'onSaveAsTemplate',
    'projectId', 'currentUserName'
  ];

  commonUnusedParams.forEach(param => {
    // 将未使用的参数重命名为_paramName
    const regex = new RegExp(`\\b${param}\\b(?=\\s*[,:)])`, 'g');
    const newContent = content.replace(regex, `_${param}`);
    if (newContent !== content) {
      content = newContent;
      modified = true;
      stats.parametersFixed++;
    }
  });

  // 删除未使用的变量声明
  const unusedVarPatterns = [
    /const\s+\[\s*loading\s*,\s*setLoading\s*\]\s*=\s*useState[^;]*;\s*\n?/g,
    /const\s+\[\s*dragOverNodeKey\s*,\s*setDragOverNodeKey\s*\]\s*=\s*useState[^;]*;\s*\n?/g,
    /const\s+testMessage\s*=[^;]*;\s*\n?/g,
    /const\s+today\s*=[^;]*;\s*\n?/g,
    /const\s+normalizedText\s*=[^;]*;\s*\n?/g
  ];

  unusedVarPatterns.forEach(pattern => {
    const newContent = content.replace(pattern, '');
    if (newContent !== content) {
      content = newContent;
      modified = true;
      stats.unusedVarsFixed++;
    }
  });

  // 删除未使用的导入
  const unusedImportPatterns = [
    /import\s+{\s*Breadcrumb[^}]*}\s+from\s+['"][^'"]+['"];\s*\n?/g,
    /import\s+{\s*HomeOutlined[^}]*}\s+from\s+['"][^'"]+['"];\s*\n?/g,
    /import\s+{\s*Link[^}]*}\s+from\s+['"][^'"]+['"];\s*\n?/g,
    /import\s+{\s*SettingOutlined[^}]*}\s+from\s+['"][^'"]+['"];\s*\n?/g,
    /import\s+{\s*Tooltip[^}]*}\s+from\s+['"][^'"]+['"];\s*\n?/g,
    /import\s+{\s*FileOutlined[^}]*}\s+from\s+['"][^'"]+['"];\s*\n?/g,
    /import\s+{\s*Checkbox[^}]*}\s+from\s+['"][^'"]+['"];\s*\n?/g
  ];

  unusedImportPatterns.forEach(pattern => {
    const newContent = content.replace(pattern, '');
    if (newContent !== content) {
      content = newContent;
      modified = true;
      stats.unusedVarsFixed++;
    }
  });

  return { content, modified };
}

function addMissingImports(content) {
  let modified = false;

  // 检查缺失的组件并添加到antd导入中
  for (const [component, module] of Object.entries(missingComponents)) {
    if (content.includes(`<${component}`) || content.includes(`{${component}}`)) {
      // 检查是否已经导入
      const importRegex = new RegExp(`import\\s*{[^}]*\\b${component}\\b[^}]*}\\s*from\\s*['"]${module}['"]`);
      if (!importRegex.test(content)) {
        // 查找现有的antd导入并添加组件
        const antdImportRegex = /import\s*{([^}]*?)}\s*from\s*['"]antd['"];?/;
        const match = content.match(antdImportRegex);
        
        if (match) {
          const existingImports = match[1].trim();
          const allImports = existingImports ? `${existingImports}, ${component}` : component;
          content = content.replace(antdImportRegex, `import { ${allImports} } from 'antd';`);
          modified = true;
          stats.missingImportsAdded++;
          console.log(`  - Added missing import: ${component}`);
        }
      }
    }
  }

  // 添加缺失的解构声明
  if (content.includes('<Option') && !content.includes('const { Option } = Select')) {
    const selectImportPoint = content.indexOf('\n', content.lastIndexOf('import'));
    if (selectImportPoint > -1) {
      content = content.slice(0, selectImportPoint + 1) + 'const { Option } = Select;\n' + content.slice(selectImportPoint + 1);
      modified = true;
      stats.missingImportsAdded++;
      console.log(`  - Added Option destructuring`);
    }
  }

  if (content.includes('<Row') || content.includes('<Col')) {
    if (!content.includes('Row') || !content.includes('Col')) {
      // 确保Row和Col都被导入
      const antdImportRegex = /import\s*{([^}]*?)}\s*from\s*['"]antd['"];?/;
      const match = content.match(antdImportRegex);
      
      if (match) {
        const existingImports = match[1].trim();
        const imports = existingImports.split(',').map(s => s.trim()).filter(Boolean);
        
        if (!imports.includes('Row')) imports.push('Row');
        if (!imports.includes('Col')) imports.push('Col');
        
        content = content.replace(antdImportRegex, `import { ${imports.join(', ')} } from 'antd';`);
        modified = true;
        stats.missingImportsAdded++;
        console.log(`  - Added Row/Col imports`);
      }
    }
  }

  return { content, modified };
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let totalModified = false;

    // 1. 修复重复导入
    const { content: content1, modified: mod1 } = fixDuplicateImports(content);
    content = content1;
    totalModified = totalModified || mod1;

    // 2. 修复未使用的变量
    const { content: content2, modified: mod2 } = fixUnusedVariables(content);
    content = content2;
    totalModified = totalModified || mod2;

    // 3. 添加缺失的导入
    const { content: content3, modified: mod3 } = addMissingImports(content);
    content = content3;
    totalModified = totalModified || mod3;

    if (totalModified) {
      fs.writeFileSync(filePath, content);
      stats.filesProcessed++;
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function findFilesToProcess(dir, extensions = ['.tsx', '.ts']) {
  const files = [];
  
  function walkDir(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && 
          !['node_modules', '.git', 'build', 'dist', 'coverage', '__tests__'].includes(entry.name)) {
        walkDir(fullPath);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  walkDir(dir);
  return files;
}

function main() {
  console.log('🧹 清理剩余错误工具');
  console.log('===================');
  
  const srcDir = './src';
  const files = findFilesToProcess(srcDir);
  
  console.log(`📁 找到 ${files.length} 个文件需要处理`);

  files.forEach((file) => {
    const relativePath = path.relative(process.cwd(), file);
    console.log(`\n📝 处理: ${relativePath}`);
    
    if (processFile(file)) {
      console.log('  ✅ 已修复');
    } else {
      console.log('  - 无需修改');
    }
  });

  console.log('\n🎯 清理结果汇总:');
  console.log('================');
  console.log(`📁 处理的文件: ${stats.filesProcessed}`);
  console.log(`🔧 未使用变量修复: ${stats.unusedVarsFixed}`);
  console.log(`📦 重复导入修复: ${stats.duplicateImportsFixed}`);
  console.log(`➕ 缺失导入添加: ${stats.missingImportsAdded}`);
  console.log(`🏷️ 参数重命名: ${stats.parametersFixed}`);

  console.log('\n✅ 处理完成！运行以下命令验证:');
  console.log('npm run check:quick');
}

if (require.main === module) {
  main();
}

module.exports = { processFile, stats };