#!/usr/bin/env node

// JWT生成脚本
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

// 生成测试token
const now = Math.floor(Date.now() / 1000);
const payload = {
  user_id: 1,
  username: 'admin',
  role: 'admin',
  user_type: 'admin',
  exp: now + 3600, // 1小时后过期
  iat: now,
  nbf: now,
  sub: 'admin'
};

const secret = 'dev-secret-key-change-in-production';
const token = generateJWT(payload, secret);

console.log('生成的JWT Token:');
console.log(token);
console.log('\n用于curl测试:');
console.log(`Authorization: Bearer ${token}`);

module.exports = { generateJWT, token };