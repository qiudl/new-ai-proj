#!/usr/bin/env node

/**
 * 快速登录测试脚本
 */

const axios = require('axios');

const BASE_URL = 'http://localhost';

async function testLogin() {
  console.log('🔐 测试登录...\n');

  const testCredentials = [
    { username: 'test_user', password: 'password' },
    { username: 'test_user', password: 'test123' },
    { username: 'test_user', password: 'password123' },
    { username: 'test_user', password: 'test' },
    { username: 'test_user', password: '123456' },
    { username: 'dev_user_2', password: 'password' },
    { username: 'dev_user_2', password: 'dev123' },
    { username: 'pm1', password: 'password' },
    { username: 'dev1', password: 'password' }
  ];

  for (const creds of testCredentials) {
    try {
      console.log(`尝试登录: ${creds.username} / ${creds.password}`);
      
      const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, creds, {
        timeout: 5000,
        validateStatus: function (status) {
          return status < 500;
        }
      });

      if (response.status === 200) {
        console.log('✅ 登录成功！');
        console.log(`用户: ${creds.username}`);
        console.log('响应数据:', JSON.stringify(response.data, null, 2));
        
        // 检查token的不同可能位置
        const token = response.data?.token || response.data?.data?.token || response.data?.access_token;
        
        if (token) {
          console.log(`Token: ${token}`);
          
          // 测试token是否有效
          const testResponse = await axios.get(`${BASE_URL}/api/v1/projects`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
            validateStatus: function (status) {
              return status < 500;
            }
          });
          
          console.log(`Token验证: ${testResponse.status === 200 ? '✅ 有效' : `❌ 无效 (${testResponse.status})`}`);
          
          return {
            username: creds.username,
            password: creds.password,
            token: token
          };
        } else {
          console.log('⚠️  登录成功但未找到token');
        }
        
      } else {
        console.log(`❌ 登录失败: ${response.status} - ${response.data?.error || response.data?.message || '未知错误'}`);
      }
      
    } catch (error) {
      console.log(`❌ 请求失败: ${error.response?.status || error.message}`);
    }
    
    console.log('');
  }
  
  console.log('❌ 所有登录尝试均失败');
  return null;
}

if (require.main === module) {
  testLogin().then(result => {
    if (result) {
      console.log('\n🎯 成功获得有效登录信息:');
      console.log(`用户名: ${result.username}`);
      console.log(`密码: ${result.password}`);
      console.log(`Token: ${result.token}`);
      console.log('\n💡 现在可以使用这个token测试时间管理页面了！');
    }
  }).catch(console.error);
}

module.exports = { testLogin };
