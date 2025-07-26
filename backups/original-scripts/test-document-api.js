#!/usr/bin/env node

// 文档列表API测试脚本
const { execSync } = require('child_process');
const crypto = require('crypto');

// JWT生成函数
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

console.log('🔍 文档列表API测试');
console.log('='.repeat(50));

// 生成测试token
const now = Math.floor(Date.now() / 1000);
const payload = {
  user_id: 2,
  username: 'dev_user_1',
  role: 'developer',
  user_type: 'system',
  exp: now + 3600,
  iat: now,
  nbf: now,
  sub: 'dev_user_1'
};

const secret = 'dev-secret-key-change-in-production';
const token = generateJWT(payload, secret);

console.log('✅ JWT Token生成成功');
console.log(`📅 Token有效期: ${new Date(payload.exp * 1000).toLocaleString()}`);
console.log();

// 测试API
try {
  console.log('🚀 测试文档列表API...');
  
  const curlCommand = `curl -s -X GET "http://localhost:8080/api/v1/documents" \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer ${token}"`;
  
  const response = execSync(curlCommand, { encoding: 'utf8' });
  const data = JSON.parse(response);
  
  if (data.success && data.data) {
    console.log('✅ API测试成功!');
    console.log(`📊 返回文档数量: ${data.data.length}`);
    console.log(`📝 消息: ${data.message}`);
    console.log();
    console.log('📋 文档列表预览:');
    console.log('-'.repeat(50));
    
    data.data.slice(0, 5).forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.title}`);
      console.log(`   📁 文件夹: ${doc.folder_name || '根目录'}`);
      console.log(`   👤 作者: ${doc.owner_name}`);
      console.log(`   📅 更新: ${new Date(doc.updated_at).toLocaleString()}`);
      console.log();
    });
    
    if (data.data.length > 5) {
      console.log(`   ... 还有 ${data.data.length - 5} 个文档`);
      console.log();
    }
    
    // 分析文件夹分布
    const folderStats = {};
    data.data.forEach(doc => {
      const folder = doc.folder_name || '根目录';
      folderStats[folder] = (folderStats[folder] || 0) + 1;
    });
    
    console.log('📂 文件夹分布:');
    console.log('-'.repeat(30));
    Object.entries(folderStats).forEach(([folder, count]) => {
      console.log(`   ${folder}: ${count} 个文档`);
    });
    
  } else {
    console.log('❌ API返回错误:');
    console.log(JSON.stringify(data, null, 2));
  }
  
} catch (error) {
  console.log('❌ API测试失败:');
  console.log(error.message);
  console.log();
  console.log('🔧 可能的原因:');
  console.log('1. 后端服务未启动 (检查 localhost:8080)');
  console.log('2. 数据库连接问题');
  console.log('3. JWT密钥不匹配');
  console.log();
  console.log('💡 解决步骤:');
  console.log('1. 检查后端服务: docker-compose ps');
  console.log('2. 检查后端日志: docker-compose logs backend');
  console.log('3. 重启服务: docker-compose restart backend');
}

console.log();
console.log('🌐 前端设置说明:');
console.log('-'.repeat(30));
console.log('1. 打开浏览器开发者工具 (F12)');
console.log('2. 在Console中执行:');
console.log(`   localStorage.setItem('token', '${token}');`);
console.log('3. 刷新页面查看效果');
console.log();
console.log('='.repeat(50));
