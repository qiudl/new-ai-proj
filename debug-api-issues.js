#!/usr/bin/env node

// API问题调试脚本
const http = require('http');

// JWT Token
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoiYWRtaW4iLCJleHAiOjE3NTM2Mzc3NDAsImlhdCI6MTc1MzYzNDE0MCwibmJmIjoxNzUzNjM0MTQwLCJzdWIiOiJhZG1pbiJ9.qsqAth_OZSQxWW7Vseu5RUK8YJU-6LF-Iv0NdzdUo3o';

// 测试API端点
function testAPI(host, port, path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          description,
          url: `http://${host}:${port}${path}`,
          status: res.statusCode,
          success: res.statusCode === 200,
          data: data.substring(0, 200) + (data.length > 200 ? '...' : '')
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        description,
        url: `http://${host}:${port}${path}`,
        status: 'ERROR',
        success: false,
        error: e.message
      });
    });

    req.end();
  });
}

// 测试任务更新API
function testTaskUpdate(host, port, projectId, taskId, description) {
  return new Promise((resolve) => {
    const updateData = JSON.stringify({
      title: '测试任务更新',
      description: '调试API调用'
    });

    const options = {
      hostname: host,
      port: port,
      path: `/api/v1/projects/${projectId}/tasks/${taskId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Length': Buffer.byteLength(updateData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          description,
          url: `http://${host}:${port}${options.path}`,
          method: 'PUT',
          status: res.statusCode,
          success: res.statusCode === 200,
          data: data.substring(0, 200) + (data.length > 200 ? '...' : '')
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        description,
        url: `http://${host}:${port}${options.path}`,
        method: 'PUT',
        status: 'ERROR',
        success: false,
        error: e.message
      });
    });

    req.write(updateData);
    req.end();
  });
}

async function runTests() {
  console.log('🔍 API问题调试测试\n');
  
  const tests = [
    // 直接后端API测试
    testAPI('localhost', 8080, '/api/v1/users/profile', '直接后端 - 用户API'),
    testAPI('localhost', 8080, '/api/v1/projects/39', '直接后端 - 项目API'),
    
    // 通过nginx代理测试
    testAPI('localhost', 80, '/api/v1/users/profile', 'Nginx代理 - 用户API'),
    testAPI('localhost', 80, '/api/v1/projects/39', 'Nginx代理 - 项目API'),
    
    // 任务更新API测试
    testTaskUpdate('localhost', 8080, 39, 46, '直接后端 - 任务更新'),
    testTaskUpdate('localhost', 80, 39, 46, 'Nginx代理 - 任务更新'),
  ];
  
  const results = await Promise.all(tests);
  
  console.log('📊 测试结果：\n');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.description}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   状态: ${result.status}`);
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    } else if (result.data) {
      console.log(`   响应: ${result.data}`);
    }
    console.log('');
  });
  
  // 分析结果
  console.log('🔍 问题分析：');
  const directSuccess = results.filter((r, i) => i < 2 && r.success).length;
  const proxySuccess = results.filter((r, i) => i >= 2 && i < 4 && r.success).length;
  const taskSuccess = results.filter((r, i) => i >= 4 && r.success).length;
  
  if (directSuccess === 2) {
    console.log('✅ 直接后端API正常');
  } else {
    console.log('❌ 直接后端API有问题');
  }
  
  if (proxySuccess === 2) {
    console.log('✅ Nginx代理API正常');
  } else {
    console.log('❌ Nginx代理API有问题');
  }
  
  if (taskSuccess === 2) {
    console.log('✅ 任务更新API正常');
  } else {
    console.log('❌ 任务更新API有问题');
  }
  
  console.log('\n💡 建议检查：');
  console.log('1. 前端环境变量 REACT_APP_API_URL 的配置');
  console.log('2. 浏览器localStorage中的JWT token');
  console.log('3. 浏览器Network面板中的实际API请求');
  console.log('4. 浏览器Console中的具体错误信息');
}

runTests().catch(console.error);