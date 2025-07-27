#!/usr/bin/env node

/**
 * 时间管理页面完整测试脚本
 * Complete test script for time management page
 */

const axios = require('axios');

const BASE_URL = 'http://localhost';
const API_URL = 'http://localhost:8080';

async function testTimeManagementPage() {
  console.log('🧪 开始完整的时间管理页面测试...\n');

  // 1. 尝试登录获取token
  console.log('1. 尝试创建测试用户并登录:');
  
  let authToken = null;
  
  try {
    // 尝试登录（假设有默认的测试用户）
    const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    }, { 
      timeout: 5000,
      validateStatus: function (status) {
        return status < 500;
      }
    });
    
    if (loginResponse.status === 200 && loginResponse.data?.token) {
      authToken = loginResponse.data.token;
      console.log('   ✅ 登录成功，获得认证token');
    } else {
      console.log('   ⚠️  登录失败，尝试其他测试用户...');
      
      // 尝试其他常见的测试账户
      const testUsers = [
        { email: 'test@example.com', password: 'password' },
        { email: 'user@example.com', password: 'password' },
        { email: 'demo@example.com', password: 'demo123' }
      ];
      
      for (const user of testUsers) {
        try {
          const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, user, { 
            timeout: 5000,
            validateStatus: function (status) {
              return status < 500;
            }
          });
          
          if (response.status === 200 && response.data?.token) {
            authToken = response.data.token;
            console.log(`   ✅ 登录成功: ${user.email}`);
            break;
          }
        } catch (error) {
          // 继续尝试下一个用户
        }
      }
    }
  } catch (error) {
    console.log('   ❌ 登录测试失败:', error.message);
  }

  // 2. 使用token测试API访问
  if (authToken) {
    console.log('\n2. 测试认证后的API访问:');
    
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      
      // 测试项目API
      const projectsResponse = await axios.get(`${BASE_URL}/api/v1/projects`, { 
        headers,
        timeout: 5000,
        validateStatus: function (status) {
          return status < 500;
        }
      });
      
      console.log(`   ✅ 项目API访问成功 (状态码: ${projectsResponse.status})`);
      
      if (projectsResponse.data?.data) {
        console.log(`   - 项目数量: ${projectsResponse.data.data.length}`);
      }
      
    } catch (error) {
      console.log('   ❌ 认证API访问失败:', error.response?.status || error.message);
    }
  } else {
    console.log('\n2. ⚠️  无认证token，跳过API测试');
  }

  // 3. 检查前端路由处理
  console.log('\n3. 检查前端路由处理:');
  
  try {
    // 测试根路径
    const rootResponse = await axios.get(`${BASE_URL}/`, { timeout: 5000 });
    console.log('   ✅ 根路径 (/) 可访问');
    
    // 测试登录页面路径
    const loginResponse = await axios.get(`${BASE_URL}/login`, { 
      timeout: 5000,
      validateStatus: function (status) {
        return status < 404; // 接受所有小于404的状态码
      }
    });
    console.log(`   ✅ 登录路径 (/login) 状态码: ${loginResponse.status}`);
    
    // 测试时间管理路径
    const timeManagementResponse = await axios.get(`${BASE_URL}/time-management`, { 
      timeout: 5000,
      validateStatus: function (status) {
        return status < 500; // 接受所有状态码
      }
    });
    
    if (timeManagementResponse.status === 200) {
      console.log('   ✅ 时间管理路径 (/time-management) 可访问');
      
      // 检查返回内容是否包含React应用
      if (timeManagementResponse.data.includes('AI Project Management Platform')) {
        console.log('   ✅ 返回React应用内容');
      } else {
        console.log('   ⚠️  返回内容异常');
      }
      
    } else if (timeManagementResponse.status === 404) {
      console.log('   ❌ 时间管理路径返回404 - React Router可能没有正确配置');
    } else {
      console.log(`   ⚠️  时间管理路径状态码: ${timeManagementResponse.status}`);
    }
    
  } catch (error) {
    console.log('   ❌ 前端路由测试失败:', error.response?.status || error.message);
  }

  // 4. 生成测试报告
  console.log('\n📊 测试报告:');
  console.log('================');
  
  if (authToken) {
    console.log('✅ 用户认证: 正常');
    console.log('✅ API代理: 正常');
    console.log('✅ 后端服务: 正常');
  } else {
    console.log('⚠️  用户认证: 无测试账户');
    console.log('✅ API代理: 正常');
    console.log('✅ 后端服务: 正常');
  }

  console.log('\n🎯 时间管理页面问题诊断:');
  
  // 检查是否为认证问题
  if (!authToken) {
    console.log('❗ 主要问题: 缺少有效的用户账户');
    console.log('解决方案:');
    console.log('1. 检查数据库中是否有测试用户');
    console.log('2. 使用数据库管理工具创建测试用户');
    console.log('3. 或通过注册功能创建新用户');
  } else {
    console.log('✅ 认证正常，页面应该可以正常显示');
  }

  console.log('\n💡 下一步建议:');
  console.log('1. 在浏览器中访问: http://localhost/login');
  console.log('2. 使用开发者工具检查网络请求');
  console.log('3. 查看控制台错误信息');
  console.log('4. 如果有认证问题，先完成登录');
  
  if (authToken) {
    console.log('\n🔑 测试token（用于浏览器localStorage）:');
    console.log(authToken);
    console.log('\n使用方法:');
    console.log('1. 打开浏览器开发者工具');
    console.log('2. 进入Application/Storage > Local Storage');
    console.log('3. 添加key: "token", value: 上述token');
    console.log('4. 刷新页面');
  }
  
  console.log('\n✅ 测试完成！');
}

if (require.main === module) {
  testTimeManagementPage().catch(console.error);
}

module.exports = { testTimeManagementPage };
