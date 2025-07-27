#!/usr/bin/env node

/**
 * 企业编辑功能修复验证脚本
 * Verification script for company edit fix
 */

const { execSync } = require('child_process');
const fs = require('fs');

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

function checkFileChanges() {
  colorLog('cyan', '🔍 验证修复文件...');
  
  const filesToCheck = [
    {
      path: './frontend/src/components/PrivateRoute.tsx',
      shouldContain: ['isTokenValid', 'payload.exp', 'Token无效或已过期'],
      name: 'PrivateRoute组件'
    },
    {
      path: './frontend/src/services/api.ts',
      shouldContain: ['setNavigateFunction', 'http://localhost:8080', 'navigateFunction'],
      name: 'API服务'
    },
    {
      path: './frontend/.env.development',
      shouldContain: ['REACT_APP_API_URL=http://localhost:8080/api/v1'],
      name: '环境变量配置'
    }
  ];
  
  filesToCheck.forEach(({ path, shouldContain, name }) => {
    if (fs.existsSync(path)) {
      const content = fs.readFileSync(path, 'utf8');
      const missingItems = shouldContain.filter(item => !content.includes(item));
      
      if (missingItems.length === 0) {
        colorLog('green', `✅ ${name}: 修复完成`);
      } else {
        colorLog('red', `❌ ${name}: 缺少 ${missingItems.join(', ')}`);
      }
    } else {
      colorLog('red', `❌ ${name}: 文件不存在 ${path}`);
    }
  });
}

function checkServices() {
  colorLog('cyan', '\n🔍 检查服务状态...');
  
  // 检查前端服务
  try {
    execSync('curl -s http://localhost:3000 > /dev/null', { timeout: 3000 });
    colorLog('green', '✅ 前端服务运行正常 (localhost:3000)');
  } catch (error) {
    colorLog('red', '❌ 前端服务不可访问');
    colorLog('yellow', '💡 请运行: cd frontend && npm start');
  }
  
  // 检查后端服务
  try {
    execSync('curl -s http://localhost:8080/health > /dev/null', { timeout: 3000 });
    colorLog('green', '✅ 后端服务运行正常 (localhost:8080)');
  } catch (error) {
    colorLog('red', '❌ 后端服务不可访问');
    colorLog('yellow', '💡 请运行: cd backend && go run main.go');
  }
}

function generateTestInstructions() {
  const instructions = `
企业编辑功能测试指南
==================

🧪 测试步骤:

第1步: 准备测试环境
- 确保前端服务运行在 http://localhost:3000
- 确保后端服务运行在 http://localhost:8080
- 清除浏览器缓存和localStorage

第2步: 登录系统
- 访问 http://localhost:3000/login
- 使用有效凭据登录
- 确认获得了新的token

第3步: 测试企业编辑功能
- 访问企业列表页: http://localhost:3000/companies
- 点击任意企业进入详情页
- 点击"编辑"按钮
- 观察是否正常跳转到编辑页面

第4步: 测试token过期处理
在浏览器Console中执行:
\`\`\`javascript
// 设置过期token
localStorage.setItem('token', 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ0ZXN0IiwiZXhwIjoxfQ.invalid');
// 刷新页面
location.reload();
\`\`\`
- 应该自动跳转到登录页

第5步: 测试API错误处理
- 停止后端服务
- 尝试访问企业编辑页面
- 观察错误提示和处理

✅ 预期结果:
- 点击编辑按钮正常跳转，不退出登录
- Token过期时自动跳转到登录页
- 显示友好的错误提示
- 不会出现强制页面刷新

❌ 如果仍有问题:
1. 检查浏览器Console的错误信息
2. 检查Network标签的API请求
3. 确认后端服务端口配置
4. 重启前端开发服务器
  `;
  
  fs.writeFileSync('./test-company-edit-fix.md', instructions);
  colorLog('green', '✅ 测试指南已保存到 test-company-edit-fix.md');
}

function main() {
  colorLog('bright', '🚀 企业编辑功能修复验证开始...\n');
  
  checkFileChanges();
  checkServices();
  generateTestInstructions();
  
  colorLog('bright', '\n🎉 修复验证完成！');
  colorLog('yellow', '\n📋 下一步:');
  colorLog('white', '1. 重启前端开发服务器以应用配置更改');
  colorLog('white', '2. 按照 test-company-edit-fix.md 中的指南进行测试');
  colorLog('white', '3. 如果仍有问题，检查浏览器Console错误信息');
  
  colorLog('blue', '\n🔄 重启命令:');
  colorLog('white', 'cd frontend && npm start');
}

main();
