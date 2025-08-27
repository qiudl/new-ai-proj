#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 批量修复 service 文件中的 API 响应数据访问错误
 * 将 response.data.data 替换为 response.data
 * 将 Response.data.data 替换为 Response.data
 */

const serviceFiles = [
  'documentFolderService.ts',
  'archiveService.ts', 
  'timerService.ts',
  'systemService.ts',
  'workNotesService.ts',
  'taskDocumentService.ts',
  'enhancedPermissionService.ts',
  'dependencyService.ts',
  'taskService.ts'
];

const servicesDir = path.join(__dirname, '../frontend/src/services');

function fixFile(filePath) {
  console.log(`正在修复文件: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changeCount = 0;
  
  // 修复 response.data.data 和 Response.data.data
  const patterns = [
    { from: /response\.data\.data/g, to: 'response.data' },
    { from: /Response\.data\.data/g, to: 'Response.data' }
  ];
  
  patterns.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(from, to);
    }
  });
  
  if (changeCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${path.basename(filePath)} - 修复了 ${changeCount} 处错误`);
  } else {
    console.log(`⚪ ${path.basename(filePath)} - 无需修复`);
  }
  
  return changeCount;
}

function main() {
  let totalFixes = 0;
  
  console.log('开始批量修复 API 响应数据访问错误...\n');
  
  serviceFiles.forEach(fileName => {
    const filePath = path.join(servicesDir, fileName);
    
    if (fs.existsSync(filePath)) {
      totalFixes += fixFile(filePath);
    } else {
      console.log(`⚠️  文件不存在: ${fileName}`);
    }
  });
  
  console.log(`\n修复完成！总计修复了 ${totalFixes} 处错误。`);
  
  if (totalFixes > 0) {
    console.log('\n请重启前后端服务以应用修复。');
  }
}

main();
