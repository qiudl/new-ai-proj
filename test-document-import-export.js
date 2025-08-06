#!/usr/bin/env node

/**
 * 文档导入导出功能完整性测试
 * 测试各种格式的导入导出功能
 */

const fs = require('fs');
const path = require('path');

// 创建测试数据
const createTestFiles = () => {
  console.log('🔧 创建测试文件...');
  
  // 创建测试目录
  const testDir = '/tmp/document-import-export-test';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // 1. CSV 测试文件
  const csvContent = `title,description,type,status,tags
"测试文档1","这是第一个测试文档","markdown","draft","测试,导入"
"测试文档2","这是第二个测试文档","text","published","测试,样本"
"测试文档3","包含,逗号的描述","markdown","draft","特殊字符,测试"`;

  fs.writeFileSync(path.join(testDir, 'test-documents.csv'), csvContent, 'utf8');
  console.log('✅ CSV 测试文件创建成功');

  // 2. JSON 测试文件
  const jsonContent = JSON.stringify([
    {
      title: "JSON测试文档1",
      description: "通过JSON格式导入的测试文档",
      type: "markdown",
      status: "draft",
      tags: ["JSON", "导入", "测试"]
    },
    {
      title: "JSON测试文档2", 
      description: "第二个JSON测试文档",
      type: "text",
      status: "published",
      tags: ["JSON", "格式"]
    }
  ], null, 2);

  fs.writeFileSync(path.join(testDir, 'test-documents.json'), jsonContent, 'utf8');
  console.log('✅ JSON 测试文件创建成功');

  // 3. Markdown 测试文件
  const markdownContent = `# 测试文档导入导出功能

## 概述

这是一个用于测试文档导入导出功能的Markdown文档。

## 功能验证

### 导入功能
- [x] CSV 格式导入
- [x] JSON 格式导入  
- [x] Excel 格式导入
- [ ] Markdown 格式导入

### 导出功能
- [x] CSV 格式导出
- [x] JSON 格式导出
- [x] Excel 格式导出
- [x] PDF 格式导出
- [x] Markdown 格式导出

## 测试数据

| 字段 | 类型 | 是否必需 | 说明 |
|------|------|----------|------|
| title | string | ✅ | 文档标题 |
| description | string | ❌ | 文档描述 |
| type | string | ❌ | 文档类型 |
| status | string | ❌ | 文档状态 |
| tags | array | ❌ | 标签数组 |

## 特殊字符测试

- 中文字符：测试文档
- 特殊符号：@#$%^&*()
- 引号："测试引号"
- 逗号：测试,逗号
- 换行符测试

## 结论

文档导入导出功能应该能够正确处理各种格式和特殊字符。
`;

  fs.writeFileSync(path.join(testDir, 'test-document.md'), markdownContent, 'utf8');
  console.log('✅ Markdown 测试文件创建成功');

  console.log(`\n📁 测试文件已创建在: ${testDir}`);
  console.log('📋 可用的测试文件:');
  console.log('  - test-documents.csv (CSV格式)');
  console.log('  - test-documents.json (JSON格式)');
  console.log('  - test-document.md (Markdown格式)');
  
  return testDir;
};

// 测试API访问
const testAPIAccess = async () => {
  console.log('\n🌐 测试API访问...');
  
  try {
    const response = await fetch('http://localhost/documents', {
      method: 'HEAD'
    });
    
    if (response.ok) {
      console.log('✅ 前端文档管理页面可访问 (HTTP 200)');
    } else {
      console.log(`❌ 前端页面访问失败 (HTTP ${response.status})`);
    }
  } catch (error) {
    console.log('❌ 无法访问前端页面:', error.message);
  }
};

// 功能验证检查清单
const generateTestChecklist = () => {
  console.log('\n📋 文档导入导出功能验证清单');
  console.log('==================================');
  
  const checks = [
    { category: '前端界面', items: [
      '文档管理页面正常加载',
      '导入导出按钮可见',
      '模态框正常打开',
      '选项卡切换正常'
    ]},
    { category: '导入功能', items: [
      'CSV 文件上传和解析',
      'JSON 文件上传和解析', 
      'Excel 文件上传和解析',
      '文件格式验证',
      '数据验证和错误处理',
      '导入结果显示'
    ]},
    { category: '导出功能', items: [
      'CSV 格式导出',
      'JSON 格式导出',
      'Excel 格式导出', 
      'PDF 格式导出',
      'Markdown 格式导出',
      '导出选项配置',
      '文件下载功能'
    ]},
    { category: '数据处理', items: [
      '中文字符支持',
      '特殊字符处理',
      '空值处理',
      '数据类型转换',
      '批量处理'
    ]},
    { category: '错误处理', items: [
      '无效文件格式提示',
      '文件大小限制',
      '导入失败错误显示',
      '网络错误处理'
    ]}
  ];

  checks.forEach(category => {
    console.log(`\n${category.category}:`);
    category.items.forEach(item => {
      console.log(`  ⏳ ${item}`);
    });
  });

  console.log('\n💡 手动测试步骤:');
  console.log('1. 访问 http://localhost/documents');
  console.log('2. 点击"导入文档"或"导出文档"按钮');
  console.log('3. 测试不同格式的文件导入');
  console.log('4. 验证导出功能生成的文件');
  console.log('5. 检查错误处理和用户提示');
  
  return checks;
};

// 主函数
const main = async () => {
  console.log('🧪 文档导入导出功能完整性测试');
  console.log('====================================');
  
  // 创建测试文件
  const testDir = createTestFiles();
  
  // 测试API访问
  await testAPIAccess();
  
  // 生成验证清单
  generateTestChecklist();
  
  console.log('\n🎯 下一步操作:');
  console.log('1. 在浏览器中访问文档管理页面');
  console.log('2. 使用生成的测试文件验证导入功能');
  console.log('3. 测试各种导出格式');
  console.log('4. 验证错误处理机制');
  
  console.log('\n✨ 测试准备完成！');
};

// 运行测试
main().catch(console.error);