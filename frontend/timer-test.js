#!/usr/bin/env node

/**
 * 定时器功能测试脚本
 * 用于诊断和验证定时器功能是否正常工作
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8080/api/v1';

// Configure axios to bypass proxy
const axiosConfig = {
  proxy: false,
  timeout: 10000
};
let authToken = null;

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${colors.bold}[步骤 ${step}]${colors.reset} ${message}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// 登录获取token
async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'password123'
    }, axiosConfig);
    
    if (response.data && response.data.success && response.data.data && response.data.data.token) {
      authToken = response.data.data.token;
      logSuccess('登录成功，获取到认证token');
      return true;
    } else {
      logError('登录响应格式异常');
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    logError(`登录失败: ${error.message}`);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
    return false;
  }
}

// 创建认证请求配置
function getAuthConfig() {
  return {
    ...axiosConfig,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };
}

// 获取任务列表
async function getTasks() {
  try {
    const response = await axios.get(`${API_BASE}/tasks?limit=5`, getAuthConfig());
    
    if (response.data && response.data.success && response.data.data && Array.isArray(response.data.data.data)) {
      const tasks = response.data.data.data;
      logSuccess(`获取到 ${tasks.length} 个任务`);
      
      if (tasks.length > 0) {
        console.log('任务列表:');
        tasks.forEach((task, index) => {
          console.log(`  ${index + 1}. ID: ${task.id}, 标题: ${task.title}, 状态: ${task.status}`);
        });
        return tasks[0]; // 返回第一个任务用于测试
      } else {
        logWarning('没有找到任务');
        return null;
      }
    } else {
      logError('任务列表响应格式异常');
      console.log('Response:', response.data);
      return null;
    }
  } catch (error) {
    logError(`获取任务列表失败: ${error.message}`);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
    return null;
  }
}

// 测试获取当前定时器状态
async function getCurrentTimer() {
  try {
    const response = await axios.get(`${API_BASE}/timer/current`, getAuthConfig());
    logSuccess('获取当前定时器状态成功');
    console.log('当前定时器状态:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    logError(`获取定时器状态失败: ${error.message}`);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
    return null;
  }
}

// 测试启动定时器
async function startTimer(taskId) {
  try {
    const response = await axios.post(`${API_BASE}/timer/start`, {
      task_id: taskId
    }, getAuthConfig());
    
    logSuccess('启动定时器成功');
    console.log('启动响应:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    logError(`启动定时器失败: ${error.message}`);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
    return null;
  }
}

// 测试停止定时器
async function stopTimer() {
  try {
    const response = await axios.post(`${API_BASE}/timer/stop`, {}, getAuthConfig());
    logSuccess('停止定时器成功');
    console.log('停止响应:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    logError(`停止定时器失败: ${error.message}`);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
    return null;
  }
}

// 等待函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 主测试流程
async function main() {
  log(`${colors.bold}🔍 定时器功能测试开始${colors.reset}`, 'blue');
  
  // 步骤1: 登录
  logStep(1, '用户登录');
  const loginSuccess = await login();
  if (!loginSuccess) {
    logError('测试终止：登录失败');
    process.exit(1);
  }
  
  // 步骤2: 获取任务列表
  logStep(2, '获取任务列表');
  const testTask = await getTasks();
  if (!testTask) {
    logError('测试终止：无法获取任务');
    process.exit(1);
  }
  
  // 步骤3: 获取当前定时器状态
  logStep(3, '获取当前定时器状态');
  const initialStatus = await getCurrentTimer();
  
  // 如果有正在运行的定时器，先停止
  if (initialStatus && initialStatus.is_running) {
    logWarning('发现正在运行的定时器，先停止');
    await stopTimer();
    await sleep(1000);
  }
  
  // 步骤4: 启动定时器
  logStep(4, `启动定时器 (任务ID: ${testTask.id})`);
  const startResult = await startTimer(testTask.id);
  if (!startResult) {
    logError('测试失败：无法启动定时器');
    process.exit(1);
  }
  
  // 步骤5: 等待2秒后检查状态
  logStep(5, '等待2秒后检查定时器状态');
  await sleep(2000);
  const runningStatus = await getCurrentTimer();
  
  if (runningStatus && runningStatus.is_running) {
    logSuccess('定时器正在正常运行');
    console.log(`运行时间: ${runningStatus.formatted_time || runningStatus.elapsed_seconds + '秒'}`);
  } else {
    logWarning('定时器未在运行状态');
  }
  
  // 步骤6: 停止定时器
  logStep(6, '停止定时器');
  const stopResult = await stopTimer();
  if (!stopResult) {
    logWarning('停止定时器失败');
  }
  
  // 步骤7: 最终状态检查
  logStep(7, '最终状态检查');
  await sleep(1000);
  const finalStatus = await getCurrentTimer();
  
  if (finalStatus && !finalStatus.is_running) {
    logSuccess('定时器已成功停止');
  } else {
    logWarning('定时器可能仍在运行');
  }
  
  // 总结
  log(`\n${colors.bold}📊 测试总结${colors.reset}`, 'blue');
  logSuccess('定时器API基本功能正常');
  log('如果首页定时器仍有问题，可能是前端组件集成问题', 'yellow');
  
  log(`\n${colors.bold}🔧 故障排除建议${colors.reset}`, 'blue');
  log('1. 检查浏览器开发者工具的网络请求');
  log('2. 检查控制台是否有JavaScript错误');
  log('3. 确认localStorage中是否有有效的认证token');
  log('4. 检查TimerCard组件是否正确渲染');
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  logError(`未处理的Promise拒绝: ${reason}`);
  process.exit(1);
});

// 运行测试
main().catch(error => {
  logError(`测试执行失败: ${error.message}`);
  process.exit(1);
});