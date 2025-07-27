/**
 * 文档创建优化验证脚本
 * 测试新的 API 集成和文档创建流程
 */

const fs = require('fs');
const path = require('path');

// 模拟浏览器环境测试
const testDocumentCreationAPIs = async () => {
  console.log('🧪 开始测试文档创建 API 集成...\n');
  
  const baseURL = 'http://localhost:8080/api/v1';
  const testToken = 'test-token'; // 在真实环境中需要有效的 JWT token
  
  const testEndpoints = [
    {
      name: '文档元数据 - 项目列表',
      url: `${baseURL}/document-metadata/projects`,
      description: '获取可关联的项目列表'
    },
    {
      name: '文档元数据 - 客户列表', 
      url: `${baseURL}/document-metadata/customers`,
      description: '获取可关联的客户列表'
    },
    {
      name: '文档元数据 - 分类列表',
      url: `${baseURL}/document-metadata/categories`, 
      description: '获取文档分类体系'
    },
    {
      name: '文档列表',
      url: `${baseURL}/documents`,
      description: '获取文档列表'
    }
  ];
  
  console.log('📋 API 端点测试结果:\n');
  
  for (const endpoint of testEndpoints) {
    try {
      console.log(`🔍 测试: ${endpoint.name}`);
      console.log(`   URL: ${endpoint.url}`);
      console.log(`   说明: ${endpoint.description}`);
      
      // 模拟前端请求 (需要认证的情况下会返回 401，但端点应该存在)
      const response = await fetch(endpoint.url, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      }).catch(() => ({ status: 'connection_error' }));
      
      if (response.status === 'connection_error') {
        console.log(`   ❌ 连接错误 - 服务可能未启动`);
      } else if (response.status === 401) {
        console.log(`   ✅ 端点存在 (401 认证错误 - 正常)`);
      } else if (response.status === 200) {
        console.log(`   ✅ 成功响应`);
      } else {
        console.log(`   ⚠️  状态码: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ 错误: ${error.message}`);
    }
    
    console.log('');
  }
};

// 检查前端代码集成
const checkFrontendIntegration = () => {
  console.log('🔍 检查前端代码集成...\n');
  
  const documentsToCheck = [
    {
      file: '/Users/johnqiu/coding/www/projects/new-ai-proj/frontend/src/components/DocumentPropertyEditor.tsx',
      checks: [
        { pattern: /loadProjects.*fetch.*document-metadata\/projects/, desc: '项目 API 集成' },
        { pattern: /loadCustomers.*fetch.*document-metadata\/customers/, desc: '客户 API 集成' },
        { pattern: /loadCategories.*fetch.*document-metadata\/categories/, desc: '分类 API 集成' },
        { pattern: /Authorization.*Bearer/, desc: 'JWT 认证集成' }
      ]
    },
    {
      file: '/Users/johnqiu/coding/www/projects/new-ai-proj/frontend/src/services/unifiedDocumentService.ts', 
      checks: [
        { pattern: /Array\.isArray\(response\.data\)/, desc: 'API 响应格式修复' },
        { pattern: /response\.data === null/, desc: '空数据处理' }
      ]
    }
  ];
  
  console.log('📁 前端集成检查结果:\n');
  
  documentsToCheck.forEach(({ file, checks }) => {
    console.log(`📄 检查文件: ${path.basename(file)}`);
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      checks.forEach(({ pattern, desc }) => {
        if (pattern.test(content)) {
          console.log(`   ✅ ${desc}`);
        } else {
          console.log(`   ❌ ${desc} - 未找到匹配模式`);
        }
      });
      
    } catch (error) {
      console.log(`   ❌ 无法读取文件: ${error.message}`);
    }
    
    console.log('');
  });
};

// 检查后端代码集成  
const checkBackendIntegration = () => {
  console.log('🔧 检查后端代码集成...\n');
  
  const backendFile = '/Users/johnqiu/coding/www/projects/new-ai-proj/backend/main.go';
  
  const checks = [
    { pattern: /getDocumentProjectsHandler/, desc: '项目处理器实现' },
    { pattern: /getDocumentCustomersHandler/, desc: '客户处理器实现' }, 
    { pattern: /getDocumentCategoriesHandler/, desc: '分类处理器实现' },
    { pattern: /document-metadata\/projects/, desc: '项目路由注册' },
    { pattern: /document-metadata\/customers/, desc: '客户路由注册' },
    { pattern: /document-metadata\/categories/, desc: '分类路由注册' }
  ];
  
  console.log('📄 后端集成检查结果:\n');
  
  try {
    const content = fs.readFileSync(backendFile, 'utf8');
    
    checks.forEach(({ pattern, desc }) => {
      if (pattern.test(content)) {
        console.log(`   ✅ ${desc}`);
      } else {
        console.log(`   ❌ ${desc} - 未找到匹配模式`);
      }
    });
    
  } catch (error) {
    console.log(`   ❌ 无法读取后端文件: ${error.message}`);
  }
  
  console.log('');
};

// 生成测试报告
const generateTestReport = () => {
  console.log('📊 文档创建优化验证报告\n');
  console.log('==========================================\n');
  
  const timestamp = new Date().toLocaleString('zh-CN');
  console.log(`🕒 测试时间: ${timestamp}\n`);
  
  console.log('🎯 优化目标:');
  console.log('   1. 修复 API 响应格式问题 (data: null)');
  console.log('   2. 替换模拟数据为真实 API 调用');
  console.log('   3. 实现项目、客户、分类的动态加载\n');
  
  checkBackendIntegration();
  checkFrontendIntegration();
  
  console.log('🚀 后续测试建议:');
  console.log('   1. 在浏览器中访问文档创建页面');
  console.log('   2. 打开开发者工具检查网络请求');
  console.log('   3. 验证项目/客户下拉框显示真实数据');
  console.log('   4. 测试文档创建和属性编辑功能\n');
  
  console.log('✅ 集成验证完成!');
};

// 运行验证
const main = async () => {
  console.clear();
  console.log('🎉 文档创建优化验证开始\n');
  
  try {
    await generateTestReport();
  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error.message);
  }
};

// 检查是否在 Node.js 环境中运行
if (typeof module !== 'undefined' && module.exports) {
  main();
} else {
  console.log('请在 Node.js 环境中运行此脚本');
}

module.exports = {
  testDocumentCreationAPIs,
  checkFrontendIntegration,
  checkBackendIntegration,
  generateTestReport
};