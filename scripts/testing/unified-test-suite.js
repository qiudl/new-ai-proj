#!/usr/bin/env node

/**
 * 统一测试套件 - 合并所有功能测试
 * Unified Test Suite - Combined functionality tests
 * 
 * 包含的测试模块:
 * - 用户类型系统测试 (User Type System Tests)
 * - 任务状态联动测试 (Task Status Synchronization Tests)
 * - 文档API测试 (Document API Tests)
 * - 计时器功能测试 (Timer Functionality Tests)
 * - 验证脚本 (Validation Scripts)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const http = require('http');

// =============================================================================
// 全局配置和工具函数
// =============================================================================

const CONFIG = {
  API_BASE_URL: 'http://localhost:8080/api/v1',
  JWT_SECRET: 'dev-secret-key-change-in-production',
  PROJECT_ID: 1
};

// 颜色输出函数
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
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

// 测试结果收集器
class TestCollector {
  constructor() {
    this.suites = new Map();
    this.currentSuite = null;
  }

  createSuite(name) {
    this.currentSuite = {
      name,
      tests: [],
      passed: 0,
      failed: 0,
      total: 0,
      startTime: Date.now()
    };
    this.suites.set(name, this.currentSuite);
    return this;
  }

  recordTest(name, passed, details = '') {
    if (!this.currentSuite) throw new Error('No active test suite');
    
    this.currentSuite.total++;
    if (passed) {
      this.currentSuite.passed++;
      colorLog('green', `  ✅ ${name}`);
    } else {
      this.currentSuite.failed++;
      colorLog('red', `  ❌ ${name}`);
      if (details) colorLog('red', `     ${details}`);
    }
    
    this.currentSuite.tests.push({ name, passed, details });
    return this;
  }

  finishSuite() {
    if (this.currentSuite) {
      this.currentSuite.endTime = Date.now();
      this.currentSuite.duration = this.currentSuite.endTime - this.currentSuite.startTime;
    }
    return this;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      suites: Array.from(this.suites.values()),
      summary: {
        totalSuites: this.suites.size,
        totalTests: 0,
        totalPassed: 0,
        totalFailed: 0
      }
    };

    // 计算总计
    report.suites.forEach(suite => {
      report.summary.totalTests += suite.total;
      report.summary.totalPassed += suite.passed;
      report.summary.totalFailed += suite.failed;
    });

    report.summary.successRate = Math.round((report.summary.totalPassed / report.summary.totalTests) * 100);

    return report;
  }
}

// JWT工具函数
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sign(message, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`, secret);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// HTTP请求工具
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// =============================================================================
// 测试套件 1: 用户类型系统测试
// =============================================================================

async function testUserTypeSystem(collector) {
  collector.createSuite('用户类型系统测试');
  colorLog('cyan', '\n🔍 开始用户类型系统测试...');

  // 1. 检查后端文件
  const backendFiles = [
    {
      path: 'backend/models/user.go',
      checks: ['UserType.*string', 'CompanyID.*\\*int', 'ValidateUserRole']
    },
    {
      path: 'backend/handlers/user_management_handlers.go',
      checks: ['ValidateUserRole', 'user_type']
    },
    {
      path: 'backend/database/user_management_repository.go',
      checks: ['user_type', 'company_id']
    }
  ];

  for (const file of backendFiles) {
    try {
      const content = fs.readFileSync(file.path, 'utf8');
      let allPassed = true;
      
      for (const check of file.checks) {
        const regex = new RegExp(check);
        if (!regex.test(content)) {
          allPassed = false;
          break;
        }
      }
      
      collector.recordTest(`后端文件 ${file.path}`, allPassed, 
        allPassed ? '' : 'Missing required patterns');
    } catch (error) {
      collector.recordTest(`后端文件 ${file.path}`, false, `File not found: ${error.message}`);
    }
  }

  // 2. 检查前端文件
  const frontendFiles = [
    {
      path: 'frontend/src/types/user.ts',
      checks: ['UserType', 'SystemUserRole', 'CompanyUserRole']
    },
    {
      path: 'frontend/src/pages/UserManagementPage.tsx',
      checks: ['user_type', 'UserType', 'Radio.Group']
    }
  ];

  for (const file of frontendFiles) {
    try {
      const content = fs.readFileSync(file.path, 'utf8');
      let allPassed = true;
      
      for (const check of file.checks) {
        const regex = new RegExp(check);
        if (!regex.test(content)) {
          allPassed = false;
          break;
        }
      }
      
      collector.recordTest(`前端文件 ${file.path}`, allPassed,
        allPassed ? '' : 'Missing required patterns');
    } catch (error) {
      collector.recordTest(`前端文件 ${file.path}`, false, `File not found: ${error.message}`);
    }
  }

  // 3. API功能测试
  try {
    const systemUser = {
      username: 'test_system_user',
      email: 'system@test.com',
      password: 'password123',
      user_type: 'system',
      role: 'project_manager'
    };

    const response = await axios.post(`${CONFIG.API_BASE_URL}/admin/users`, systemUser);
    collector.recordTest('创建系统用户API', response.data.success === true);
  } catch (error) {
    collector.recordTest('创建系统用户API', false, error.message);
  }

  collector.finishSuite();
}

// =============================================================================
// 测试套件 2: 任务状态联动测试
// =============================================================================

async function testTaskStatusSync(collector) {
  collector.createSuite('任务状态联动测试');
  colorLog('cyan', '\n🔗 开始任务状态联动测试...');

  const projectId = CONFIG.PROJECT_ID;

  async function getTaskStatus(taskId) {
    const options = {
      hostname: 'localhost',
      port: 80,
      path: `/api/v1/projects/${projectId}/tasks/${taskId}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    try {
      const result = await makeRequest(options);
      return result.data?.data?.status || 'N/A';
    } catch (error) {
      return 'ERROR';
    }
  }

  async function updateTaskStatus(taskId, status) {
    const options = {
      hostname: 'localhost',
      port: 80,
      path: `/api/v1/projects/${projectId}/tasks/${taskId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const updateData = {
      title: `Test Task ${taskId}`,
      description: "",
      status: status,
      custom_fields: {}
    };
    
    try {
      const result = await makeRequest(options, updateData);
      return result.status === 200;
    } catch (error) {
      return false;
    }
  }

  // 测试父子任务联动
  const parentTask = 31;
  const childTasks = [38, 39, 41, 42];

  try {
    // 检查API可访问性
    const initialStatus = await getTaskStatus(parentTask);
    collector.recordTest('任务API可访问性', initialStatus !== 'ERROR');

    // 测试子任务完成时父任务状态更新
    for (const childId of childTasks) {
      const success = await updateTaskStatus(childId, 'completed');
      collector.recordTest(`更新子任务 ${childId} 状态`, success);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    const parentStatus = await getTaskStatus(parentTask);
    collector.recordTest('父任务自动更新为完成', parentStatus === 'completed');

  } catch (error) {
    collector.recordTest('任务状态联动测试', false, error.message);
  }

  collector.finishSuite();
}

// =============================================================================
// 测试套件 3: 文档API测试
// =============================================================================

async function testDocumentAPI(collector) {
  collector.createSuite('文档API测试');
  colorLog('cyan', '\n📄 开始文档API测试...');

  // 生成测试JWT
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    user_id: 2,
    username: 'test_user',
    role: 'developer',
    user_type: 'system',
    exp: now + 3600,
    iat: now
  };

  const token = generateJWT(payload, CONFIG.JWT_SECRET);
  collector.recordTest('JWT Token生成', !!token);

  // 测试文档列表API
  try {
    const curlCommand = `curl -s -X GET "${CONFIG.API_BASE_URL}/documents" \\
      -H "Content-Type: application/json" \\
      -H "Authorization: Bearer ${token}"`;
    
    const response = execSync(curlCommand, { encoding: 'utf8' });
    const data = JSON.parse(response);
    
    collector.recordTest('文档列表API响应', data.success === true);
    collector.recordTest('文档数据格式正确', Array.isArray(data.data));
    
    if (data.data && data.data.length > 0) {
      const firstDoc = data.data[0];
      const hasRequiredFields = firstDoc.title && firstDoc.owner_name && firstDoc.updated_at;
      collector.recordTest('文档字段完整性', hasRequiredFields);
    }

  } catch (error) {
    collector.recordTest('文档API测试', false, error.message);
  }

  collector.finishSuite();
}

// =============================================================================
// 测试套件 4: 计时器功能测试
// =============================================================================

async function testTimerFunctionality(collector) {
  collector.createSuite('计时器功能测试');
  colorLog('cyan', '\n⏱️ 开始计时器功能测试...');

  // 检查前端组件文件
  const componentFiles = [
    'frontend/src/components/TimerCard.tsx',
    'frontend/src/components/TodayStatsCard.tsx',
    'frontend/src/services/timerService.ts',
    'frontend/src/types/timer.ts'
  ];

  componentFiles.forEach(file => {
    const exists = fs.existsSync(file);
    collector.recordTest(`组件文件 ${path.basename(file)}`, exists);
  });

  // 检查后端文件
  const backendFiles = [
    'backend/handlers/timer_handlers.go',
    'backend/database/timer_repository.go'
  ];

  backendFiles.forEach(file => {
    const exists = fs.existsSync(file);
    collector.recordTest(`后端文件 ${path.basename(file)}`, exists);
  });

  // 检查关键功能实现
  const functionalChecks = [
    {
      name: 'TimerCard组件功能',
      file: 'frontend/src/components/TimerCard.tsx',
      keywords: ['startTimer', 'stopTimer', 'timerState']
    },
    {
      name: 'Timer服务功能',
      file: 'frontend/src/services/timerService.ts',
      keywords: ['startTimer', 'stopTimer', 'getCurrentTimer']
    }
  ];

  functionalChecks.forEach(check => {
    if (fs.existsSync(check.file)) {
      try {
        const content = fs.readFileSync(check.file, 'utf8');
        const hasAllKeywords = check.keywords.every(keyword => content.includes(keyword));
        collector.recordTest(check.name, hasAllKeywords);
      } catch (error) {
        collector.recordTest(check.name, false, 'Error reading file');
      }
    } else {
      collector.recordTest(check.name, false, 'File missing');
    }
  });

  collector.finishSuite();
}

// =============================================================================
// 测试套件 5: 系统验证测试
// =============================================================================

async function testSystemValidation(collector) {
  collector.createSuite('系统验证测试');
  colorLog('cyan', '\n🔧 开始系统验证测试...');

  // 检查Docker容器状态
  try {
    const dockerStatus = execSync('docker-compose ps', { encoding: 'utf8' });
    const isRunning = dockerStatus.includes('Up') && dockerStatus.includes('backend') && dockerStatus.includes('frontend');
    collector.recordTest('Docker容器运行状态', isRunning);
  } catch (error) {
    collector.recordTest('Docker容器运行状态', false, 'Docker命令执行失败');
  }

  // 检查端口可访问性
  try {
    const backendResponse = await axios.get('http://localhost:8080/health', { timeout: 5000 });
    collector.recordTest('后端服务可访问性', backendResponse.status === 200);
  } catch (error) {
    collector.recordTest('后端服务可访问性', false, '连接失败');
  }

  try {
    const frontendResponse = await axios.get('http://localhost:3000', { timeout: 5000 });
    collector.recordTest('前端服务可访问性', frontendResponse.status === 200);
  } catch (error) {
    collector.recordTest('前端服务可访问性', false, '连接失败');
  }

  // 检查数据库连接
  try {
    const dbResponse = await axios.get(`${CONFIG.API_BASE_URL}/health/db`, { timeout: 5000 });
    collector.recordTest('数据库连接状态', dbResponse.data.success === true);
  } catch (error) {
    collector.recordTest('数据库连接状态', false, '数据库连接失败');
  }

  collector.finishSuite();
}

// =============================================================================
// 主测试流程
// =============================================================================

async function runUnifiedTestSuite() {
  const collector = new TestCollector();
  
  colorLog('bright', '🚀 启动统一测试套件');
  colorLog('bright', '='.repeat(80));
  
  try {
    // 运行所有测试套件
    await testSystemValidation(collector);
    await testUserTypeSystem(collector);
    await testTaskStatusSync(collector);
    await testDocumentAPI(collector);
    await testTimerFunctionality(collector);
    
    // 生成测试报告
    const report = collector.generateReport();
    
    // 保存报告到文件
    const reportPath = 'unified-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // 输出测试摘要
    colorLog('bright', '\n' + '='.repeat(80));
    colorLog('bright', '📊 统一测试套件报告');
    colorLog('bright', '='.repeat(80));
    
    report.suites.forEach(suite => {
      const successRate = Math.round((suite.passed / suite.total) * 100);
      const statusColor = successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red';
      
      colorLog('white', `\n📋 ${suite.name}`);
      colorLog(statusColor, `   通过: ${suite.passed}/${suite.total} (${successRate}%)`);
      colorLog('white', `   耗时: ${suite.duration}ms`);
    });
    
    colorLog('bright', '\n' + '-'.repeat(50));
    colorLog('white', `🎯 总体结果: ${report.summary.totalPassed}/${report.summary.totalTests}`);
    colorLog('white', `📈 成功率: ${report.summary.successRate}%`);
    colorLog('white', `📁 详细报告: ${reportPath}`);
    
    // 最终评估
    if (report.summary.successRate >= 90) {
      colorLog('green', '\n🎉 系统状态优秀！所有主要功能正常运行。');
    } else if (report.summary.successRate >= 70) {
      colorLog('yellow', '\n⚠️ 系统基本正常，存在少量问题需要修复。');
    } else {
      colorLog('red', '\n❌ 系统存在较多问题，需要进一步调试和修复。');
    }
    
    colorLog('bright', '='.repeat(80));
    
  } catch (error) {
    colorLog('red', `💥 测试过程中发生错误: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  // 检查参数，支持运行特定测试套件
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
使用方法: node unified-test-suite.js [选项]

选项:
  --help, -h     显示帮助信息
  --user         仅运行用户类型系统测试
  --task         仅运行任务状态联动测试  
  --document     仅运行文档API测试
  --timer        仅运行计时器功能测试
  --system       仅运行系统验证测试
  
示例:
  node unified-test-suite.js          # 运行所有测试
  node unified-test-suite.js --user   # 仅运行用户系统测试
    `);
    process.exit(0);
  }
  
  runUnifiedTestSuite();
}

module.exports = {
  runUnifiedTestSuite,
  testUserTypeSystem,
  testTaskStatusSync,
  testDocumentAPI,
  testTimerFunctionality,
  testSystemValidation
};
