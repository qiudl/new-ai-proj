#!/usr/bin/env node

/**
 * 统一调试工具集 - Debug Toolkit
 * 合并所有调试功能，包括前端、后端、API等调试工具
 * 
 * 包含功能:
 * - 前端文档列表调试
 * - 计时器功能调试  
 * - API连接调试
 * - 服务状态检查
 * - 用户认证调试
 */

const axios = require('axios');
const fs = require('fs');
const { execSync } = require('child_process');
const crypto = require('crypto');

// =============================================================================
// 配置和工具函数
// =============================================================================

const CONFIG = {
  API_BASE_URL: 'http://localhost:8080/api/v1',
  FRONTEND_URL: 'http://localhost:3000',
  JWT_SECRET: 'dev-secret-key-change-in-production',
};

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateTestJWT(payload = null) {
  const now = Math.floor(Date.now() / 1000);
  const defaultPayload = {
    user_id: 34,
    username: 'debug_user',
    role: 'admin',
    user_type: 'system',
    exp: now + 3600,
    iat: now,
    nbf: now,
    sub: 'debug_user'
  };

  const jwtPayload = payload || defaultPayload;
  
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

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`, CONFIG.JWT_SECRET);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// =============================================================================
// 调试模块 1: 服务状态检查
// =============================================================================

async function debugServiceStatus() {
  colorLog('cyan', '\n🔍 服务状态调试');
  colorLog('cyan', '='.repeat(50));

  const checks = [
    {
      name: 'Docker容器状态',
      test: async () => {
        try {
          const result = execSync('docker-compose ps', { encoding: 'utf8' });
          const isHealthy = result.includes('Up') && 
                           result.includes('backend') && 
                           result.includes('frontend');
          return { success: isHealthy, details: result };
        } catch (error) {
          return { success: false, details: error.message };
        }
      }
    },
    {
      name: '后端服务连接',
      test: async () => {
        try {
          const response = await axios.get(`${CONFIG.API_BASE_URL.replace('/api/v1', '')}/health`, 
            { timeout: 5000 });
          return { success: response.status === 200, details: `Status: ${response.status}` };
        } catch (error) {
          return { success: false, details: error.message };
        }
      }
    },
    {
      name: '前端服务连接',
      test: async () => {
        try {
          const response = await axios.get(CONFIG.FRONTEND_URL, { timeout: 5000 });
          return { success: response.status === 200, details: `Status: ${response.status}` };
        } catch (error) {
          return { success: false, details: error.message };
        }
      }
    },
    {
      name: '数据库连接',
      test: async () => {
        try {
          const response = await axios.get(`${CONFIG.API_BASE_URL}/health/db`, { timeout: 5000 });
          return { success: response.data.success === true, details: response.data.message };
        } catch (error) {
          return { success: false, details: error.message };
        }
      }
    }
  ];

  for (const check of checks) {
    const result = await check.test();
    const icon = result.success ? '✅' : '❌';
    colorLog(result.success ? 'green' : 'red', `${icon} ${check.name}`);
    if (!result.success) {
      colorLog('yellow', `   错误: ${result.details}`);
    }
  }
}

// =============================================================================
// 调试模块 2: API功能调试
// =============================================================================

async function debugAPIFunctionality() {
  colorLog('cyan', '\n🔌 API功能调试');
  colorLog('cyan', '='.repeat(50));

  const token = generateTestJWT();
  colorLog('green', '✅ 测试JWT生成成功');

  const apiTests = [
    {
      name: '文档列表API',
      endpoint: '/documents',
      method: 'GET'
    },
    {
      name: '用户信息API',
      endpoint: '/user/profile',
      method: 'GET'
    },
    {
      name: '计时器状态API',
      endpoint: '/timer/current',
      method: 'GET'
    },
    {
      name: '任务列表API',
      endpoint: '/tasks?limit=5',
      method: 'GET'
    }
  ];

  for (const test of apiTests) {
    try {
      const response = await axios({
        method: test.method,
        url: `${CONFIG.API_BASE_URL}${test.endpoint}`,
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 5000
      });

      const icon = response.status === 200 ? '✅' : '⚠️';
      colorLog(response.status === 200 ? 'green' : 'yellow', 
        `${icon} ${test.name} - Status: ${response.status}`);
      
      if (response.data && typeof response.data === 'object') {
        colorLog('blue', `   数据: ${response.data.success ? '成功' : '失败'} - ${response.data.message || 'N/A'}`);
      }
    } catch (error) {
      colorLog('red', `❌ ${test.name} - 失败: ${error.message}`);
    }
  }
}

// =============================================================================
// 调试模块 3: 计时器功能调试
// =============================================================================

async function debugTimerFunctionality() {
  colorLog('cyan', '\n⏱️ 计时器功能调试');
  colorLog('cyan', '='.repeat(50));

  const token = generateTestJWT();

  try {
    // 1. 检查当前计时器状态
    colorLog('blue', '1️⃣ 检查当前计时器状态...');
    const currentResponse = await axios.get(`${CONFIG.API_BASE_URL}/timer/current`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    colorLog('green', `✅ 当前计时器状态: ${currentResponse.data.success ? '成功获取' : '获取失败'}`);
    
    if (currentResponse.data.data) {
      const timer = currentResponse.data.data;
      colorLog('blue', `   状态: ${timer.is_running ? '运行中' : '未运行'}`);
      if (timer.task_id) {
        colorLog('blue', `   任务ID: ${timer.task_id}`);
        colorLog('blue', `   开始时间: ${timer.start_time}`);
      }
    }

    // 2. 获取可用任务
    colorLog('blue', '\n2️⃣ 获取可用任务...');
    const tasksResponse = await axios.get(`${CONFIG.API_BASE_URL}/tasks?status=todo,in_progress&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (tasksResponse.data.success && tasksResponse.data.data?.data?.length > 0) {
      const tasks = tasksResponse.data.data.data;
      colorLog('green', `✅ 找到 ${tasks.length} 个可用任务`);
      
      const firstTask = tasks[0];
      colorLog('blue', `   测试任务: ${firstTask.id} - ${firstTask.title}`);

      // 3. 测试启动计时器
      colorLog('blue', '\n3️⃣ 测试启动计时器...');
      const startResponse = await axios.post(`${CONFIG.API_BASE_URL}/timer/start`, 
        { task_id: firstTask.id },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      colorLog(startResponse.data.success ? 'green' : 'red', 
        `${startResponse.data.success ? '✅' : '❌'} 启动计时器: ${startResponse.data.message}`);

      if (startResponse.data.success) {
        // 等待2秒后检查状态
        colorLog('blue', '\n4️⃣ 等待2秒后检查状态...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const statusResponse = await axios.get(`${CONFIG.API_BASE_URL}/timer/current`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (statusResponse.data.data?.is_running) {
          colorLog('green', '✅ 计时器正在运行');
          colorLog('blue', `   运行时长: ${statusResponse.data.data.elapsed_time || 'N/A'}`);

          // 5. 停止计时器
          colorLog('blue', '\n5️⃣ 停止计时器...');
          const stopResponse = await axios.post(`${CONFIG.API_BASE_URL}/timer/stop`, {},
            { headers: { 'Authorization': `Bearer ${token}` } }
          );

          colorLog(stopResponse.data.success ? 'green' : 'red',
            `${stopResponse.data.success ? '✅' : '❌'} 停止计时器: ${stopResponse.data.message}`);
        } else {
          colorLog('red', '❌ 计时器未能正确启动');
        }
      }
    } else {
      colorLog('yellow', '⚠️ 没有找到可用任务用于测试');
    }

  } catch (error) {
    colorLog('red', `❌ 计时器调试失败: ${error.message}`);
  }
}

// =============================================================================
// 调试模块 4: 前端调试脚本生成
// =============================================================================

function generateFrontendDebugScript() {
  colorLog('cyan', '\n🌐 前端调试脚本生成');
  colorLog('cyan', '='.repeat(50));

  const token = generateTestJWT();
  
  const debugScript = `
// 前端调试脚本 - 在浏览器控制台中执行
console.log('🔍 开始前端调试...');
console.log('='.repeat(50));

// 1. 检查Token状态
console.log('1️⃣ 检查当前Token状态:');
const currentToken = localStorage.getItem('token');
console.log('Token存在:', !!currentToken);
console.log('Token长度:', currentToken?.length || 0);

if (currentToken) {
  try {
    const payload = JSON.parse(atob(currentToken.split('.')[1]));
    console.log('Token用户:', payload.username);
    console.log('Token过期时间:', new Date(payload.exp * 1000));
    console.log('Token是否过期:', payload.exp < Date.now() / 1000);
  } catch (e) {
    console.log('❌ Token解析失败:', e.message);
  }
} else {
  console.log('❌ Token不存在');
}

// 2. 设置测试Token
console.log('\\n2️⃣ 设置测试Token:');
const testToken = '${token}';
localStorage.setItem('token', testToken);
console.log('✅ 测试Token已设置');

// 3. 测试API调用
console.log('\\n3️⃣ 测试文档API调用:');
fetch('/api/v1/documents', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + testToken,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('响应状态:', response.status, response.statusText);
  return response.json();
})
.then(data => {
  console.log('API响应:', data);
  if (data.success) {
    console.log('✅ 文档API调用成功，文档数量:', data.data?.length || 0);
  } else {
    console.log('❌ 文档API调用失败:', data.message);
  }
})
.catch(error => {
  console.log('❌ API调用错误:', error);
});

// 4. 检查页面状态
console.log('\\n4️⃣ 检查页面状态:');
console.log('当前URL:', window.location.href);
console.log('React开发模式:', process.env.NODE_ENV === 'development');

// 5. 重载页面以应用新Token
setTimeout(() => {
  console.log('\\n5️⃣ 3秒后自动刷新页面...');
  setTimeout(() => window.location.reload(), 3000);
}, 1000);
`;

  const scriptPath = 'frontend-debug-script.js';
  fs.writeFileSync(scriptPath, debugScript);
  
  colorLog('green', `✅ 前端调试脚本已生成: ${scriptPath}`);
  colorLog('blue', '💡 使用方法:');
  colorLog('blue', '   1. 打开浏览器开发者工具 (F12)');
  colorLog('blue', '   2. 复制脚本内容到控制台执行');
  colorLog('blue', '   3. 或者在控制台中执行:');
  colorLog('yellow', `   localStorage.setItem('token', '${token}'); location.reload();`);
}

// =============================================================================
// 调试模块 5: 文件系统调试
// =============================================================================

async function debugFileSystem() {
  colorLog('cyan', '\n📁 文件系统调试');
  colorLog('cyan', '='.repeat(50));

  const criticalFiles = [
    // 前端关键文件
    'frontend/src/components/TimerCard.tsx',
    'frontend/src/services/timerService.ts',
    'frontend/src/pages/UserManagementPage.tsx',
    'frontend/package.json',
    
    // 后端关键文件
    'backend/handlers/timer_handlers.go',
    'backend/models/user.go',
    'backend/main.go',
    
    // 配置文件
    'docker-compose.yml',
    '.env',
    
    // 数据库文件
    'migrations/001_initial_setup.sql'
  ];

  let existingFiles = 0;
  let missingFiles = 0;

  for (const file of criticalFiles) {
    const exists = fs.existsSync(file);
    const icon = exists ? '✅' : '❌';
    const color = exists ? 'green' : 'red';
    
    colorLog(color, `${icon} ${file}`);
    
    if (exists) {
      existingFiles++;
      // 检查文件大小
      const stats = fs.statSync(file);
      if (stats.size === 0) {
        colorLog('yellow', `   ⚠️ 文件为空`);
      }
    } else {
      missingFiles++;
    }
  }

  colorLog('blue', `\n📊 文件检查结果: ${existingFiles}/${criticalFiles.length} 文件存在`);
  
  if (missingFiles > 0) {
    colorLog('yellow', `⚠️ ${missingFiles} 个文件缺失，可能影响系统功能`);
  }
}

// =============================================================================
// 主调试流程
// =============================================================================

async function runDebugToolkit() {
  colorLog('bright', '🛠️ 启动统一调试工具集');
  colorLog('bright', '='.repeat(80));
  
  try {
    await debugServiceStatus();
    await debugFileSystem();
    await debugAPIFunctionality();
    await debugTimerFunctionality();
    generateFrontendDebugScript();
    
    colorLog('bright', '\n' + '='.repeat(80));
    colorLog('green', '🎉 调试工具集执行完成！');
    colorLog('blue', '💡 接下来的建议操作:');
    colorLog('blue', '   1. 检查上述输出中的❌项目');
    colorLog('blue', '   2. 使用生成的前端调试脚本测试浏览器');
    colorLog('blue', '   3. 查看Docker日志: docker-compose logs');
    colorLog('blue', '   4. 重启有问题的服务: docker-compose restart [service]');
    colorLog('bright', '='.repeat(80));
    
  } catch (error) {
    colorLog('red', `💥 调试过程中发生错误: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
调试工具集使用说明:

使用方法: node debug-toolkit.js [选项]

选项:
  --help, -h      显示帮助信息
  --service       仅检查服务状态
  --api           仅测试API功能
  --timer         仅调试计时器功能
  --frontend      仅生成前端调试脚本
  --files         仅检查文件系统

示例:
  node debug-toolkit.js           # 运行完整调试
  node debug-toolkit.js --api     # 仅测试API
    `);
    process.exit(0);
  }
  
  // 支持单独运行特定调试模块
  if (args.includes('--service')) {
    debugServiceStatus();
  } else if (args.includes('--api')) {
    debugAPIFunctionality();
  } else if (args.includes('--timer')) {
    debugTimerFunctionality();
  } else if (args.includes('--frontend')) {
    generateFrontendDebugScript();
  } else if (args.includes('--files')) {
    debugFileSystem();
  } else {
    runDebugToolkit();
  }
}

module.exports = {
  runDebugToolkit,
  debugServiceStatus,
  debugAPIFunctionality,
  debugTimerFunctionality,
  generateFrontendDebugScript,
  debugFileSystem
};
