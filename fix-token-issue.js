#!/usr/bin/env node

/**
 * JWT Token问题自动修复脚本
 * 
 * 这个脚本会：
 * 1. 生成新的有效JWT token
 * 2. 提供前端修复指令
 * 3. 测试API连通性
 */

const crypto = require('crypto');
const http = require('http');

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

// 测试API连通性
function testAPI(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 80,
      path: '/api/v1/projects',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, data: JSON.parse(data) });
        } else {
          resolve({ success: false, status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function main() {
  console.log('🔧 JWT Token问题自动修复工具\n');

  // 1. 生成新的有效token
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    user_id: 34,
    username: 'qiudl',
    role: 'admin',
    user_type: 'system',
    exp: now + 7 * 24 * 3600, // 7天后过期
    iat: now,
    nbf: now,
    sub: 'qiudl'
  };

  const secret = 'dev-secret-key-change-in-production';
  const newToken = generateJWT(payload, secret);

  console.log('✅ 生成新的JWT Token:');
  console.log(newToken);
  console.log();

  // 2. 测试新token
  console.log('🧪 测试API连通性...');
  try {
    const result = await testAPI(newToken);
    if (result.success) {
      console.log('✅ API测试成功！获取到', result.data.data.data.length, '个项目');
    } else {
      console.log('❌ API测试失败，状态码:', result.status);
      console.log('响应:', result.data);
    }
  } catch (error) {
    console.log('❌ API连接失败:', error.message);
  }

  // 3. 提供修复指令
  console.log('\n📋 前端修复指令（在浏览器控制台执行）:');
  console.log('────────────────────────────────────────────────');
  console.log(`localStorage.removeItem('token');`);
  console.log(`localStorage.setItem('token', '${newToken}');`);
  console.log(`location.reload();`);
  console.log('────────────────────────────────────────────────');

  console.log('\n🛠️  或者，使用重新登录修复:');
  console.log('1. 访问: http://localhost/login');
  console.log('2. 用户名: qiudl');
  console.log('3. 密码: 123456');

  console.log('\n📚 问题分析:');
  console.log('- 原因: JWT Token签名失效导致401认证错误');
  console.log('- 表现: Chrome显示为ERR_INSUFFICIENT_RESOURCES');
  console.log('- 解决: 更新前端token或重新登录');

  console.log('\n🔄 长期解决方案:');
  console.log('- 实现Token自动刷新机制');
  console.log('- 改进401错误处理');
  console.log('- 添加友好的认证错误提示');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateJWT, testAPI };
