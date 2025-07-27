#!/usr/bin/env node

/**
 * 企业详情页编辑功能退出登录问题调试工具
 * Debug tool for company edit logout issue
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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

async function checkServices() {
  colorLog('cyan', '🔍 检查服务状态...');
  
  // 检查前端服务
  try {
    const frontendResponse = execSync('curl -s http://localhost:3000', { timeout: 3000 });
    colorLog('green', '✅ 前端服务运行正常 (localhost:3000)');
  } catch (error) {
    colorLog('red', '❌ 前端服务不可访问');
  }
  
  // 检查后端服务
  try {
    const backendResponse = execSync('curl -s http://localhost:3001/api/v1/companies', { timeout: 3000 });
    colorLog('green', '✅ 后端API服务运行正常 (localhost:3001)');
  } catch (error) {
    colorLog('red', '❌ 后端API服务不可访问');
    colorLog('yellow', '💡 尝试启动后端服务...');
    try {
      execSync('cd backend && npm run dev > ../logs/backend.log 2>&1 &', { timeout: 2000 });
      colorLog('blue', '⏳ 后端服务启动中...');
    } catch (e) {
      colorLog('red', '❌ 无法启动后端服务');
    }
  }
}

function checkAuthConfiguration() {
  colorLog('cyan', '\n🔐 检查认证配置...');
  
  // 检查PrivateRoute组件
  const privateRoutePath = './frontend/src/components/PrivateRoute.tsx';
  if (fs.existsSync(privateRoutePath)) {
    const content = fs.readFileSync(privateRoutePath, 'utf8');
    
    if (content.includes('localStorage.getItem(\'token\')')) {
      colorLog('yellow', '⚠️ 发现问题: PrivateRoute只检查token存在性，未验证有效性');
      colorLog('blue', '💡 建议: 需要验证token是否有效和未过期');
    }
    
    if (!content.includes('jwt') && !content.includes('decode')) {
      colorLog('yellow', '⚠️ PrivateRoute未实现JWT token验证');
    }
  } else {
    colorLog('red', '❌ 未找到PrivateRoute组件');
  }
  
  // 检查API拦截器
  const apiPath = './frontend/src/services/api.ts';
  if (fs.existsSync(apiPath)) {
    const content = fs.readFileSync(apiPath, 'utf8');
    
    if (content.includes('401')) {
      colorLog('green', '✅ API拦截器包含401错误处理');
      
      if (content.includes('window.location.href = \'/login\'')) {
        colorLog('yellow', '⚠️ 发现可能问题: 使用window.location.href可能造成强制退出');
        colorLog('blue', '💡 建议: 使用navigate或其他React Router方式');
      }
    } else {
      colorLog('red', '❌ API拦截器缺少401错误处理');
    }
  }
}

function analyzeCompanyEditFlow() {
  colorLog('cyan', '\n📋 分析企业编辑流程...');
  
  // 检查CompanyDetailPage
  const detailPagePath = './frontend/src/pages/CompanyDetailPage.tsx';
  if (fs.existsSync(detailPagePath)) {
    const content = fs.readFileSync(detailPagePath, 'utf8');
    
    // 查找编辑按钮点击处理
    const editButtonMatch = content.match(/onClick.*navigate.*companies.*edit/);
    if (editButtonMatch) {
      colorLog('blue', '📍 找到编辑按钮处理: ' + editButtonMatch[0]);
    }
    
    // 检查API调用
    const apiCalls = content.match(/companyService\.\w+/g);
    if (apiCalls) {
      colorLog('blue', '🔗 API调用: ' + apiCalls.join(', '));
    }
  }
  
  // 检查CompanyEditPage
  const editPagePath = './frontend/src/pages/CompanyEditPage.tsx';
  if (fs.existsSync(editPagePath)) {
    const content = fs.readFileSync(editPagePath, 'utf8');
    
    // 检查错误处理
    if (content.includes('ErrorType.AUTHENTICATION')) {
      colorLog('green', '✅ CompanyEditPage包含认证错误处理');
    }
    
    // 检查loadCompany函数
    if (content.includes('loadCompany')) {
      colorLog('blue', '📍 CompanyEditPage包含loadCompany函数');
    }
  }
}

function createDebugInstructions() {
  colorLog('cyan', '\n🎯 调试步骤指南...');
  
  const instructions = `
企业详情页编辑退出登录问题调试指南
=====================================

🔍 问题现象:
- 在企业详情页点击"编辑"按钮后自动退出登录

🧐 可能原因分析:
1. Token无效或过期
2. API请求返回401错误
3. 权限验证失败
4. 路由保护机制触发

📋 调试步骤:

第一步: 检查浏览器控制台
1. 打开企业详情页 (如: http://localhost:3000/companies/1)
2. 按F12打开开发者工具
3. 切换到Network标签页
4. 点击编辑按钮
5. 观察网络请求是否有401错误

第二步: 检查Token状态
1. 在开发者工具Console中输入: localStorage.getItem('token')
2. 检查token是否存在
3. 如果存在，复制token到JWT.io验证是否过期

第三步: 检查API响应
1. 在Network中找到失败的API请求
2. 查看Response内容
3. 记录错误信息

第四步: 检查认证流程
1. 确认是否在点击编辑按钮前就发起了API请求
2. 检查CompanyEditPage是否在渲染时就调用了API

🛠️ 临时修复方案:
如果是token过期问题，可以尝试：
1. 清除localStorage中的token
2. 重新登录获取新token
3. 或者实现token自动刷新机制

💡 代码修复建议:
1. 在PrivateRoute中添加token有效性验证
2. 在API拦截器中添加token刷新机制  
3. 在CompanyEditPage中添加更好的错误处理
4. 避免在组件挂载时立即发起可能失败的API请求
  `;
  
  console.log(instructions);
  
  // 写入调试日志
  fs.writeFileSync('./debug-company-edit-analysis.md', instructions);
  colorLog('green', '✅ 调试指南已保存到 debug-company-edit-analysis.md');
}

function checkTokenValidity() {
  colorLog('cyan', '\n🔐 检查JWT Token工具函数...');
  
  const tokenCheckScript = `
// 在浏览器Console中运行此代码检查token
function checkToken() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('❌ 未找到token');
    return;
  }
  
  try {
    // 解码JWT token
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    
    console.log('📋 Token信息:');
    console.log('- 用户ID:', payload.userId || payload.sub);
    console.log('- 过期时间:', new Date(payload.exp * 1000));
    console.log('- 当前时间:', new Date());
    console.log('- 是否过期:', payload.exp * 1000 < Date.now());
    
    if (payload.exp * 1000 < Date.now()) {
      console.log('❌ Token已过期');
    } else {
      console.log('✅ Token有效');
    }
    
  } catch (error) {
    console.log('❌ Token格式无效:', error);
  }
}

checkToken();
  `;
  
  fs.writeFileSync('./check-token.js', tokenCheckScript);
  colorLog('green', '✅ Token检查脚本已保存到 check-token.js');
  colorLog('blue', '💡 在浏览器Console中粘贴运行此脚本检查token状态');
}

async function runDiagnostics() {
  colorLog('bright', '🚀 企业编辑退出登录问题诊断开始...\n');
  
  await checkServices();
  checkAuthConfiguration();
  analyzeCompanyEditFlow();
  checkTokenValidity();
  createDebugInstructions();
  
  colorLog('bright', '\n🎉 诊断完成！');
  colorLog('yellow', '👀 请查看生成的文件:');
  colorLog('white', '  - debug-company-edit-analysis.md (详细调试指南)');
  colorLog('white', '  - check-token.js (token检查脚本)');
  
  colorLog('blue', '\n🔧 下一步建议:');
  colorLog('white', '1. 按照调试指南进行操作');
  colorLog('white', '2. 在浏览器中运行token检查脚本');
  colorLog('white', '3. 记录具体的错误信息');
  colorLog('white', '4. 根据错误信息进行针对性修复');
}

if (require.main === module) {
  runDiagnostics().catch(error => {
    colorLog('red', `❌ 诊断过程出错: ${error.message}`);
  });
}
