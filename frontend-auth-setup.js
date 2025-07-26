#!/usr/bin/env node

// 前端认证设置脚本
const crypto = require('crypto');

// 简单的Base64URL编码函数
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// HMAC-SHA256签名函数
function sign(message, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// 生成JWT token
function generateJWT(payload, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const signature = sign(`${encodedHeader}.${encodedPayload}`, secret);
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// 生成用于开发的有效token
const now = Math.floor(Date.now() / 1000);
const payload = {
  user_id: 2,  // 使用数据库中存在的用户ID
  username: 'dev_user_1',
  role: 'developer',
  user_type: 'system',
  exp: now + 86400, // 24小时后过期
  iat: now,
  nbf: now,
  sub: 'dev_user_1'
};

const secret = 'dev-secret-key-change-in-production';
const token = generateJWT(payload, secret);

console.log('========================================');
console.log('前端认证设置');
console.log('========================================');
console.log('');
console.log('1. 生成的JWT Token (24小时有效):');
console.log(token);
console.log('');
console.log('2. 在浏览器开发者工具中执行以下代码:');
console.log('----------------------------------------');
console.log(`localStorage.setItem('token', '${token}');`);
console.log('console.log("Token已设置，刷新页面生效");');
console.log('');
console.log('3. 或者使用curl测试API:');
console.log('----------------------------------------');
console.log(`curl -X GET "http://localhost:8080/api/v1/documents" \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -H "Authorization: Bearer ${token}"`);
console.log('');
console.log('4. Token信息:');
console.log('----------------------------------------');
console.log('用户ID:', payload.user_id);
console.log('用户名:', payload.username);
console.log('角色:', payload.role);
console.log('用户类型:', payload.user_type);
console.log('过期时间:', new Date(payload.exp * 1000).toLocaleString());
console.log('');
console.log('========================================');

module.exports = { generateJWT, token };
