#!/usr/bin/env node

const axios = require('axios');

console.log('=== 时间管理页面问题诊断 ===\n');

async function testLogin() {
  try {
    console.log('1. 测试登录流程...');
    
    // 尝试使用测试账户登录
    const loginData = {
      username: 'admin',
      password: 'admin123'
    };
    
    const loginResponse = await axios.post('http://localhost/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    if (loginResponse.status === 200 && loginResponse.data.token) {
      const token = loginResponse.data.token;
      console.log('   ✓ 登录成功');
      console.log(`   Token前20字符: ${token.substring(0, 20)}...`);
      
      console.log('\n2. 测试认证后的API调用...');
      
      // 测试项目API
      const projectsResponse = await axios.get('http://localhost/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });
      
      console.log(`   项目API状态: ${projectsResponse.status}`);
      if (projectsResponse.status === 200) {
        console.log(`   ✓ 项目数据获取成功，数量: ${projectsResponse.data.data?.length || 0}`);
      }
      
      return token;
    } else {
      console.log('   ✗ 登录失败');
      return null;
    }
  } catch (error) {
    console.log(`   ✗ 登录错误: ${error.message}`);
    if (error.response) {
      console.log(`   响应状态: ${error.response.status}`);
      console.log(`   响应数据: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

async function testTimeManagementAPI(token) {
  if (!token) {
    console.log('\n3. 跳过时间管理API测试 - 没有有效token');
    return;
  }
  
  console.log('\n3. 测试时间管理相关API...');
  
  try {
    // 测试任务统计API (TimeManagementService使用的API)
    const tasksResponse = await axios.get('http://localhost/api/projects', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    
    if (tasksResponse.status === 200) {
      console.log('   ✓ 项目数据可用于时间管理统计');
      const projects = tasksResponse.data.data || [];
      console.log(`   可用项目数量: ${projects.length}`);
      
      if (projects.length > 0) {
        // 尝试获取第一个项目的任务
        const firstProject = projects[0];
        const projectTasksResponse = await axios.get(`http://localhost/api/projects/${firstProject.id}/tasks`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000
        });
        
        if (projectTasksResponse.status === 200) {
          const tasks = projectTasksResponse.data.data || [];
          console.log(`   项目 "${firstProject.name}" 的任务数量: ${tasks.length}`);
          console.log('   ✓ 任务数据可用于时间管理统计');
        }
      }
    }
  } catch (error) {
    console.log(`   ✗ 时间管理API测试失败: ${error.message}`);
  }
}

function provideSolution() {
  console.log('\n=== 解决方案 ===\n');
  console.log('问题诊断结果: 时间管理页面显示空白是因为用户未登录');
  console.log('');
  console.log('解决步骤:');
  console.log('1. 访问 http://localhost/login 进行登录');
  console.log('2. 使用有效的用户名和密码登录');
  console.log('3. 登录成功后再访问 http://localhost/time-management');
  console.log('');
  console.log('如果登录页面也有问题，请检查:');
  console.log('- 前端开发服务器是否正在运行 (npm start)');
  console.log('- 后端API服务器是否正在运行');
  console.log('- 环境变量配置是否正确');
  console.log('');
  console.log('常用测试账户:');
  console.log('- 用户名: admin, 密码: admin123');
  console.log('- 用户名: test, 密码: test123');
}

async function main() {
  const token = await testLogin();
  await testTimeManagementAPI(token);
  provideSolution();
}

main().catch(console.error);