#!/usr/bin/env node

const jwt = require('jsonwebtoken');

// 使用与后端相同的密钥
const testSecret = 'test-secret';

// 从之前的API调用中获取的token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo5MSwidXNlcm5hbWUiOiJndW95bSIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsInN1YiI6Imd1b3ltIiwiZXhwIjoxNzU2NDIyNjk4LCJuYmYiOjE3NTYzMzYyOTgsImlhdCI6MTc1NjMzNjI5OCwianRpIjoiZmUxN2Q5Y2RjMmRjZmEyZDBiNzhiNTgxY2E3ZTE4ODIifQ.waCvmRGNVCL4lkYGOBA-G7Im5vxseQpcsPZPski7Q9Y';

console.log('测试JWT令牌验证...');
console.log('使用密钥:', testSecret);
console.log('');

try {
  // 尝试验证token
  const decoded = jwt.verify(token, testSecret);
  console.log('✅ 令牌验证成功！');
  console.log('解码后的payload:');
  console.log(JSON.stringify(decoded, null, 2));
} catch (error) {
  console.log('❌ 令牌验证失败:');
  console.log('错误:', error.message);
  
  // 尝试不验证签名，仅解码
  try {
    const decoded = jwt.decode(token);
    console.log('\n🔍 无验证解码的payload:');
    console.log(JSON.stringify(decoded, null, 2));
  } catch (decodeError) {
    console.log('连解码都失败了:', decodeError.message);
  }
}

// 尝试使用其他可能的密钥
const possibleSecrets = [
  'test-secret',
  'docker-staging-secret-key-very-secure',
  'development-secret',
  'dev-secret',
  'ai-project-jwt-secret'
];

console.log('\n🔍 尝试不同的密钥...');
for (const secret of possibleSecrets) {
  try {
    const decoded = jwt.verify(token, secret);
    console.log(`✅ 密钥 "${secret}" 验证成功！`);
    console.log('用户ID:', decoded.user_id);
    console.log('用户名:', decoded.username);
    break;
  } catch (error) {
    console.log(`❌ 密钥 "${secret}" 验证失败`);
  }
}
