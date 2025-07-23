#!/usr/bin/env node

/**
 * 用户类型系统完整测试脚本
 * 包括后端API、前端类型定义和数据迁移验证
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:8080/api/v1';

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 测试结果收集
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function recordTest(name, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    colorLog('green', `✅ ${name}`);
  } else {
    testResults.failed++;
    colorLog('red', `❌ ${name}`);
    if (details) colorLog('red', `   ${details}`);
  }
  testResults.details.push({ name, passed, details });
}

// 1. 检查后端文件修改
async function checkBackendFiles() {
  colorLog('cyan', '\n🔍 检查后端文件修改...');
  
  const filesToCheck = [
    {
      path: 'backend/models/user.go',
      checks: [
        'UserType.*string',
        'CompanyID.*\\*int',
        'ValidateUserRole',
        'GetValidRolesForUserType'
      ]
    },
    {
      path: 'backend/handlers/user_management_handlers.go',
      checks: [
        'ValidateUserRole',
        'ValidateCompanyUserFields',
        'user_type'
      ]
    },
    {
      path: 'backend/database/user_management_repository.go',
      checks: [
        'user_type',
        'company_id',
        'company_user_id'
      ]
    },
    {
      path: 'backend/middleware/user_type_middleware.go',
      checks: [
        'UserTypeAccessMiddleware',
        'CompanyAccessMiddleware'
      ]
    }
  ];

  for (const file of filesToCheck) {
    try {
      const content = fs.readFileSync(file.path, 'utf8');
      let allPassed = true;
      
      for (const check of file.checks) {
        const regex = new RegExp(check);
        if (!regex.test(content)) {
          allPassed = false;
          recordTest(`${file.path} - ${check}`, false, `Missing pattern: ${check}`);
        }
      }
      
      if (allPassed) {
        recordTest(`${file.path} - All checks`, true);
      }
    } catch (error) {
      recordTest(`${file.path}`, false, `File not found or error: ${error.message}`);
    }
  }
}

// 2. 检查前端文件修改
async function checkFrontendFiles() {
  colorLog('cyan', '\n🔍 检查前端文件修改...');
  
  const filesToCheck = [
    {
      path: 'frontend/src/types/user.ts',
      checks: [
        'UserType.*=.*system.*company',
        'SystemUserRole',
        'CompanyUserRole',
        'USER_TYPE_CONFIG',
        'getRoleConfigByType'
      ]
    },
    {
      path: 'frontend/src/pages/UserManagementPage.tsx',
      checks: [
        'user_type',
        'UserType',
        'Radio.Group',
        'BuildOutlined',
        'BankOutlined'
      ]
    }
  ];

  for (const file of filesToCheck) {
    try {
      const content = fs.readFileSync(file.path, 'utf8');
      let allPassed = true;
      
      for (const check of file.checks) {
        const regex = new RegExp(check);
        if (!regex.test(content)) {
          allPassed = false;
          recordTest(`${file.path} - ${check}`, false, `Missing pattern: ${check}`);
        }
      }
      
      if (allPassed) {
        recordTest(`${file.path} - All checks`, true);
      }
    } catch (error) {
      recordTest(`${file.path}`, false, `File not found or error: ${error.message}`);
    }
  }
}

// 3. 测试API功能
async function testAPIFunctionality() {
  colorLog('cyan', '\n🧪 测试API功能...');
  
  // 测试用户创建
  const systemUser = {
    username: 'test_system_user',
    email: 'system@test.com',
    password: 'password123',
    user_type: 'system',
    role: 'project_manager',
    profile: { name: '测试系统用户' }
  };

  const companyUser = {
    username: 'test_company_user',
    email: 'company@test.com', 
    password: 'password123',
    user_type: 'company',
    company_id: 1,
    role: 'company_user',
    profile: { name: '测试企业用户' }
  };

  const invalidUser = {
    username: 'invalid_user',
    email: 'invalid@test.com',
    password: 'password123',
    user_type: 'system',
    role: 'company_admin', // 系统用户不能有company_admin角色
    profile: { name: '无效用户' }
  };

  // 测试系统用户创建
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/users`, systemUser);
    if (response.data.data && response.data.data.user_type === 'system') {
      recordTest('创建系统用户', true);
    } else {
      recordTest('创建系统用户', false, '返回数据格式错误');
    }
  } catch (error) {
    recordTest('创建系统用户', false, error.response?.data?.message || error.message);
  }

  // 测试企业用户创建
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/users`, companyUser);
    if (response.data.data && response.data.data.user_type === 'company') {
      recordTest('创建企业用户', true);
    } else {
      recordTest('创建企业用户', false, '返回数据格式错误');
    }
  } catch (error) {
    recordTest('创建企业用户', false, error.response?.data?.message || error.message);
  }

  // 测试无效用户创建（应该失败）
  try {
    await axios.post(`${API_BASE_URL}/admin/users`, invalidUser);
    recordTest('拒绝无效用户', false, '应该失败但成功了');
  } catch (error) {
    if (error.response?.status === 400) {
      recordTest('拒绝无效用户', true);
    } else {
      recordTest('拒绝无效用户', false, `错误状态码: ${error.response?.status}`);
    }
  }

  // 测试用户列表筛选
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/users?user_type=system`);
    if (response.data.data && Array.isArray(response.data.data)) {
      recordTest('用户类型筛选', true);
    } else {
      recordTest('用户类型筛选', false, '返回数据格式错误');
    }
  } catch (error) {
    recordTest('用户类型筛选', false, error.response?.data?.message || error.message);
  }
}

// 4. 检查文件完整性
async function checkFileIntegrity() {
  colorLog('cyan', '\n📋 检查文件完整性...');
  
  const requiredFiles = [
    'backend/models/user.go',
    'backend/handlers/user_management_handlers.go',
    'backend/database/user_management_repository.go',
    'backend/database/user_repository.go',
    'backend/middleware/user_type_middleware.go',
    'frontend/src/types/user.ts',
    'frontend/src/pages/UserManagementPage.tsx',
    'test-user-types-api.js',
    'migrate_user_types.sql'
  ];

  for (const file of requiredFiles) {
    try {
      fs.accessSync(file, fs.constants.F_OK);
      recordTest(`文件存在: ${file}`, true);
    } catch (error) {
      recordTest(`文件存在: ${file}`, false, '文件不存在');
    }
  }
}

// 5. 生成测试报告
function generateReport() {
  colorLog('cyan', '\n📊 测试报告生成...');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      success_rate: Math.round((testResults.passed / testResults.total) * 100)
    },
    details: testResults.details
  };

  // 保存报告到文件
  fs.writeFileSync('user-type-system-test-report.json', JSON.stringify(report, null, 2));
  
  // 控制台输出摘要
  colorLog('bright', '\n' + '='.repeat(60));
  colorLog('bright', '📋 用户类型系统测试报告');
  colorLog('bright', '='.repeat(60));
  colorLog('white', `总测试项: ${report.summary.total}`);
  colorLog('green', `通过: ${report.summary.passed}`);
  colorLog('red', `失败: ${report.summary.failed}`);
  colorLog('yellow', `成功率: ${report.summary.success_rate}%`);
  
  if (report.summary.success_rate >= 90) {
    colorLog('green', '\n🎉 用户类型系统实现基本完成！');
  } else if (report.summary.success_rate >= 70) {
    colorLog('yellow', '\n⚠️ 用户类型系统大部分功能完成，需要修复部分问题。');
  } else {
    colorLog('red', '\n❌ 用户类型系统需要更多工作。');
  }

  colorLog('cyan', `\n详细报告已保存到: user-type-system-test-report.json`);
  colorLog('bright', '='.repeat(60));
}

// 主测试流程
async function runCompleteTest() {
  colorLog('bright', '🚀 开始用户类型系统完整测试\n');
  
  try {
    await checkFileIntegrity();
    await checkBackendFiles();
    await checkFrontendFiles();
    await testAPIFunctionality();
    
    generateReport();
    
  } catch (error) {
    colorLog('red', `💥 测试过程中发生错误: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runCompleteTest();
}

module.exports = { runCompleteTest };
