#!/usr/bin/env node

const jwt = require('jsonwebtoken');

// JWT配置
const secret = 'dev-secret-key-change-in-production';
const payload = {
  user_id: 1,
  username: 'admin',
  role: 'admin',
  user_type: 'admin'
};

const options = {
  expiresIn: '1h',
  issuer: 'ai-project-backend',
  subject: 'admin'
};

// 生成token
const token = jwt.sign(payload, secret, options);

console.log('生成的JWT Token:');
console.log(token);
console.log('\n用于curl测试:');
console.log(`curl -H "Authorization: Bearer ${token}" ...`);

// 验证token
try {
  const decoded = jwt.verify(token, secret);
  console.log('\nToken验证成功:');
  console.log(JSON.stringify(decoded, null, 2));
} catch (error) {
  console.error('Token验证失败:', error.message);
}

module.exports = { token };