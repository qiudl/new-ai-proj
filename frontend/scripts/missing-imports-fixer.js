#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Missing Imports Fixer - Specifically targets missing component import errors
 */

const stats = {
  filesProcessed: 0,
  importsAdded: 0,
  componentsFixed: 0
};

// Common missing components and their source modules
const missingComponents = {
  // Antd components
  'ThunderboltOutlined': '@ant-design/icons',
  'CheckCircleOutlined': '@ant-design/icons',
  'SaveOutlined': '@ant-design/icons',
  'SettingOutlined': '@ant-design/icons',
  'Space': 'antd',
  'Button': 'antd', 
  'Option': 'antd',
  'TextArea': 'antd',
  'Progress': 'antd',
  'Switch': 'antd',
  'Tooltip': 'antd',
  'Divider': 'antd',
  'Input': 'antd',
  'Select': 'antd'
};

function addMissingImport(content, component, module) {
  // Check if component is already imported
  if (content.includes(component)) {
    const importRegex = new RegExp(`import\\s*{[^}]*${component}[^}]*}\\s*from\\s*['"]${module}['"]`, 'g');
    if (importRegex.test(content)) {
      return content; // Already imported
    }
  }

  // Find existing import from the same module
  const moduleImportRegex = new RegExp(`(import\\s*{([^}]*)}\\s*from\\s*['"]${module}['"];?)`, 'g');
  const match = moduleImportRegex.exec(content);
  
  if (match) {
    // Add to existing import
    const existingImports = match[2].trim();
    const allImports = existingImports ? `${existingImports}, ${component}` : component;
    const newImportLine = `import { ${allImports} } from '${module}';`;
    content = content.replace(match[1], newImportLine);
    stats.importsAdded++;
  } else {
    // Add new import line
    const importInsertPoint = content.indexOf('import React') !== -1 
      ? content.indexOf('\n', content.indexOf('import React')) + 1
      : 0;
    
    const newImportLine = `import { ${component} } from '${module}';\n`;
    content = content.slice(0, importInsertPoint) + newImportLine + content.slice(importInsertPoint);
    stats.importsAdded++;
  }
  
  return content;
}

function fixMissingImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check for missing components in the file content
    for (const [component, module] of Object.entries(missingComponents)) {
      // Check if component is used in JSX but not imported
      const componentUsageRegex = new RegExp(`<${component}[\\s/>]`, 'g');
      if (componentUsageRegex.test(content)) {
        // Check if it's already properly imported
        const importRegex = new RegExp(`import\\s*{[^}]*${component}[^}]*}\\s*from\\s*['"]${module}['"]`, 'g');
        if (!importRegex.test(content)) {
          console.log(`  - Adding missing import: ${component} from ${module}`);
          content = addMissingImport(content, component, module);
          modified = true;
          stats.componentsFixed++;
        }
      }
    }

    // Special handling for Select.Option
    if (content.includes('<Option') && !content.includes('const { Option } = Select')) {
      // Add destructuring for Option
      const selectImportMatch = content.match(/import\s*{[^}]*Select[^}]*}\s*from\s*['"]antd['"];?/);
      if (selectImportMatch) {
        // Add destructuring after imports
        const insertPoint = content.indexOf('\n', content.lastIndexOf('import')) + 1;
        content = content.slice(0, insertPoint) + '\nconst { Option } = Select;\n' + content.slice(insertPoint);
        modified = true;
        stats.componentsFixed++;
        console.log(`  - Added Option destructuring from Select`);
      }
    }

    // Special handling for Input.TextArea
    if (content.includes('<TextArea') && !content.includes('const { TextArea } = Input')) {
      // Add destructuring for TextArea
      const inputImportMatch = content.match(/import\s*{[^}]*Input[^}]*}\s*from\s*['"]antd['"];?/);
      if (inputImportMatch) {
        // Add destructuring after imports
        const insertPoint = content.indexOf('\n', content.lastIndexOf('import')) + 1;
        content = content.slice(0, insertPoint) + '\nconst { TextArea } = Input;\n' + content.slice(insertPoint);
        modified = true;
        stats.componentsFixed++;
        console.log(`  - Added TextArea destructuring from Input`);
      }
    }

    if (modified) {
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

function findFilesToProcess(dir, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
  const files = [];
  
  function walkDir(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && 
          !['node_modules', '.git', 'build', 'dist', 'coverage'].includes(entry.name)) {
        walkDir(fullPath);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  walkDir(dir);
  return files;
}

// Main execution
function main() {
  console.log('🔧 Missing Imports Fixer - Adding missing component imports');
  console.log('===============================================================');
  
  const srcDir = './src';
  if (!fs.existsSync(srcDir)) {
    console.error('❌ src directory not found!');
    return;
  }

  // Focus on component files that are most likely to have missing imports
  const componentFiles = findFilesToProcess('./src/components')
    .concat(findFilesToProcess('./src/pages'));
    
  console.log(`📁 Found ${componentFiles.length} component files to process`);

  componentFiles.forEach((file) => {
    const relativePath = path.relative(process.cwd(), file);
    console.log(`\n📝 Processing: ${relativePath}`);
    
    if (fixMissingImports(file)) {
      console.log('  ✅ Fixed imports');
    } else {
      console.log('  - No changes needed');
    }
  });

  // Print summary
  console.log('\n🎯 Missing Imports Fixer Summary:');
  console.log('================================');
  console.log(`📁 Files processed: ${stats.filesProcessed}`);
  console.log(`📦 Imports added: ${stats.importsAdded}`);
  console.log(`🔧 Components fixed: ${stats.componentsFixed}`);

  if (stats.filesProcessed > 0) {
    console.log('\n✅ Processing complete! Run the following to verify:');
    console.log('npm run lint:fix');
  } else {
    console.log('\n✅ No files needed import fixes.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixMissingImports, missingComponents, stats };