#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Final Error Fixer - Comprehensive solution for remaining TypeScript and ESLint errors
 * Targets the most common remaining error patterns after targeted-batch-fixer.js
 */

// Statistics tracking
const stats = {
  filesProcessed: 0,
  emptyImportIdentifiers: 0,
  duplicateImports: 0,
  unusedVariables: 0,
  malformedImports: 0,
  syntaxErrors: 0,
  missingImports: 0,
  typeErrors: 0
};

// Comprehensive error patterns with fixes
const errorPatterns = [
  // Pattern 1: Empty import identifiers - highest priority
  {
    name: 'Empty import identifiers',
    pattern: /import\s*{\s*,\s*([^}]+)\s*}\s*from\s*(['"][^'"]+['"])/g,
    fix: (match, imports, source) => {
      const cleanImports = imports.split(',').map(i => i.trim()).filter(i => i && i.length > 0);
      stats.emptyImportIdentifiers++;
      return `import { ${cleanImports.join(', ')} } from ${source}`;
    }
  },
  
  // Pattern 2: Duplicate React imports
  {
    name: 'Duplicate React imports', 
    pattern: /(import\s+React\s+from\s+['"]react['"];\s*)(import\s+React(?:\s*,\s*{[^}]*})?\s+from\s+['"]react['"];?)/g,
    fix: (match, first, second) => {
      stats.duplicateImports++;
      // Extract named imports from second import if any
      const namedMatch = second.match(/import\s+React\s*,\s*({[^}]*})/);
      if (namedMatch) {
        return `import React, ${namedMatch[1]} from 'react';`;
      }
      return first; // Keep only the first import
    }
  },

  // Pattern 3: Multiple imports from same module
  {
    name: 'Multiple imports from same module',
    pattern: /(import\s+{[^}]+}\s+from\s+['"]([^'"]+)['"];?\s*)(import\s+{[^}]+}\s+from\s+['"](\2)['"];?)/g,
    fix: (match, first, module, second) => {
      const firstImports = first.match(/import\s+{([^}]+)}/)?.[1] || '';
      const secondImports = second.match(/import\s+{([^}]+)}/)?.[1] || '';
      
      const allImports = [...new Set([
        ...firstImports.split(',').map(i => i.trim()).filter(Boolean),
        ...secondImports.split(',').map(i => i.trim()).filter(Boolean)
      ])];
      
      stats.duplicateImports++;
      return `import { ${allImports.join(', ')} } from '${module}';`;
    }
  },

  // Pattern 4: Malformed service imports at start of files
  {
    name: 'Malformed service imports',
    pattern: /^(\s*\/\*[\s\S]*?\*\/\s*)?\/\* .* \*\/\s*/g,
    fix: (match) => {
      stats.malformedImports++;
      return ''; // Remove malformed comments
    }
  },

  // Pattern 5: Fix incomplete function definitions
  {
    name: 'Incomplete function definitions',
    pattern: /(\w+:\s*\(\w*\)\s*=>\s*{\s*return\s*)(matches\s*\?)/g,
    fix: (match, prefix, condition) => {
      stats.syntaxErrors++;
      return `${prefix}${condition}`;
    }
  },

  // Pattern 6: Missing import identifiers in Antd imports
  {
    name: 'Missing Antd import identifiers',
    pattern: /import\s*{\s*,\s*([A-Z][^}]*)\s*}\s*from\s*['"]antd['"];?/g,
    fix: (match, imports) => {
      const cleanImports = imports.split(',').map(i => i.trim()).filter(i => i && i.length > 0);
      stats.emptyImportIdentifiers++;
      return `import { ${cleanImports.join(', ')} } from 'antd';`;
    }
  },

  // Pattern 7: Missing import identifiers in icons
  {
    name: 'Missing icon import identifiers',
    pattern: /import\s*{\s*,\s*([A-Z][^}]*)\s*}\s*from\s*['"]@ant-design\/icons['"];?/g,
    fix: (match, imports) => {
      const cleanImports = imports.split(',').map(i => i.trim()).filter(i => i && i.length > 0);
      stats.emptyImportIdentifiers++;
      return `import { ${cleanImports.join(', ')} } from '@ant-design/icons';`;
    }
  },

  // Pattern 8: Handle extracted variables pattern from template manager
  {
    name: 'Extracted variables syntax fix',
    pattern: /return\s*\(\s*matches\s*\?\s*matches\.map\([^)]+\)\s*:\s*\[\]\s*;\s*\}\s*;/g,
    fix: (match) => {
      stats.syntaxErrors++;
      return `return matches ? matches.map((match) => match.replace(/\\{\\{\\.\\(\\w+\\)\\}\\}/, "$1")) : [];
  };`;
    }
  }
];

// Common unused variable patterns to remove
const unusedVariablePatterns = [
  // Remove unused destructured Modal methods
  {
    pattern: /const\s*{\s*info,\s*success,\s*error(?:,\s*warning)?\s*}\s*=\s*Modal;\s*\n?/g,
    replacement: ''
  },
  // Remove unused Form destructuring
  {
    pattern: /const\s*{\s*useForm\s*}\s*=\s*Form;\s*\n?/g,
    replacement: ''
  },
  // Remove unused List destructuring  
  {
    pattern: /const\s*{\s*Item\s*}\s*=\s*List;\s*\n?/g,
    replacement: ''
  }
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const originalContent = content;

    // Apply error pattern fixes
    errorPatterns.forEach(({ name, pattern, fix }) => {
      const newContent = content.replace(pattern, fix);
      if (newContent !== content) {
        console.log(`  - Fixed: ${name}`);
        content = newContent;
        modified = true;
      }
    });

    // Remove unused variable patterns
    unusedVariablePatterns.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        console.log(`  - Removed unused variables`);
        content = newContent;
        modified = true;
        stats.unusedVariables++;
      }
    });

    // Additional specific fixes based on error analysis
    
    // Fix missing ContactsOutlined import (seen in AddCompanyUserModal)
    if (content.includes('ContactsOutlined') && !content.includes('ContactsOutlined') && !content.includes('import')) {
      const iconImportMatch = content.match(/import\s*{([^}]*)}\s*from\s*['"]@ant-design\/icons['"]/);
      if (iconImportMatch) {
        const existingIcons = iconImportMatch[1];
        if (!existingIcons.includes('ContactsOutlined')) {
          content = content.replace(
            /import\s*{([^}]*)}\s*from\s*['"]@ant-design\/icons['"]/,
            `import { ${existingIcons}, ContactsOutlined } from '@ant-design/icons'`
          );
          modified = true;
          stats.missingImports++;
          console.log(`  - Added missing ContactsOutlined import`);
        }
      }
    }

    // Fix ToolOutlined references if missing
    if (content.includes('<ToolOutlined') && !content.includes('ToolOutlined') && !content.includes('import')) {
      const iconImportMatch = content.match(/import\s*{([^}]*)}\s*from\s*['"]@ant-design\/icons['"]/);
      if (iconImportMatch) {
        const existingIcons = iconImportMatch[1];
        if (!existingIcons.includes('ToolOutlined')) {
          content = content.replace(
            /import\s*{([^}]*)}\s*from\s*['"]@ant-design\/icons['"]/,
            `import { ${existingIcons}, ToolOutlined } from '@ant-design/icons'`
          );
          modified = true;
          stats.missingImports++;
          console.log(`  - Added missing ToolOutlined import`);
        }
      }
    }

    // Fix FileTextOutlined references if missing
    if (content.includes('FileTextOutlined') && !content.includes('import')) {
      const iconImportMatch = content.match(/import\s*{([^}]*)}\s*from\s*['"]@ant-design\/icons['"]/);
      if (iconImportMatch) {
        const existingIcons = iconImportMatch[1];
        if (!existingIcons.includes('FileTextOutlined')) {
          content = content.replace(
            /import\s*{([^}]*)}\s*from\s*['"]@ant-design\/icons['"]/,
            `import { ${existingIcons}, FileTextOutlined } from '@ant-design/icons'`
          );
          modified = true;
          stats.missingImports++;
          console.log(`  - Added missing FileTextOutlined import`);
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      stats.filesProcessed++;
    }

    return modified;
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

// Create backup
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `./backups/final-fix-${timestamp}`;
  
  try {
    execSync(`mkdir -p ${backupDir}`);
    execSync(`cp -r src ${backupDir}/`);
    console.log(`✅ Created backup at ${backupDir}`);
    return backupDir;
  } catch (error) {
    console.error('Failed to create backup:', error.message);
    return null;
  }
}

// Main execution
function main() {
  console.log('🔧 Final Error Fixer - Comprehensive TypeScript & ESLint Error Resolution');
  console.log('====================================================================');
  
  // Create backup
  const backupPath = createBackup();
  if (!backupPath) {
    console.error('❌ Failed to create backup. Aborting.');
    return;
  }

  const srcDir = './src';
  if (!fs.existsSync(srcDir)) {
    console.error('❌ src directory not found!');
    return;
  }

  const files = findFilesToProcess(srcDir);
  console.log(`📁 Found ${files.length} files to process`);

  let processedCount = 0;
  files.forEach((file) => {
    const relativePath = path.relative(process.cwd(), file);
    console.log(`\n📝 Processing: ${relativePath}`);
    
    if (processFile(file)) {
      processedCount++;
    } else {
      console.log('  - No changes needed');
    }
  });

  // Print summary
  console.log('\n🎯 Final Error Fixer Summary:');
  console.log('============================');
  console.log(`📁 Files processed: ${stats.filesProcessed}`);
  console.log(`🔧 Empty import identifiers fixed: ${stats.emptyImportIdentifiers}`);
  console.log(`🔧 Duplicate imports merged: ${stats.duplicateImports}`);
  console.log(`🔧 Unused variables removed: ${stats.unusedVariables}`);
  console.log(`🔧 Malformed imports fixed: ${stats.malformedImports}`);
  console.log(`🔧 Syntax errors fixed: ${stats.syntaxErrors}`);
  console.log(`🔧 Missing imports added: ${stats.missingImports}`);
  console.log(`💾 Backup created at: ${backupPath}`);

  if (processedCount > 0) {
    console.log('\n✅ Processing complete! Run the following to verify:');
    console.log('npm run lint:fix');
    console.log('npm run type-check');
  } else {
    console.log('\n✅ No files needed modifications.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, errorPatterns, stats };