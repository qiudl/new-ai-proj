#!/usr/bin/env node

// Test script for parent-child task status synchronization
const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testStatusSync() {
  console.log('🚀 开始测试父子任务状态联动功能...\n');
  
  // Test case: Task 31 and its children
  const parentTaskId = 31;
  const childTaskId = 38;  // 托运方创建预约单
  const projectId = 1;
  
  try {
    // 1. 获取当前状态
    console.log('📊 1. 获取当前任务状态...');
    
    const parentOptions = {
      hostname: 'localhost',
      port: 80,
      path: `/api/v1/projects/${projectId}/tasks/${parentTaskId}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const parentResult = await makeRequest(parentOptions);
    console.log(`   父任务 ${parentTaskId}: ${parentResult.data?.data?.status || 'N/A'}`);
    
    const childOptions = {
      hostname: 'localhost',
      port: 80,
      path: `/api/v1/projects/${projectId}/tasks/${childTaskId}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const childResult = await makeRequest(childOptions);
    console.log(`   子任务 ${childTaskId}: ${childResult.data?.data?.status || 'N/A'}\n`);
    
    // 2. 测试子任务状态更新
    console.log('🔄 2. 更新子任务状态为 completed...');
    
    const updateOptions = {
      hostname: 'localhost',
      port: 80,
      path: `/api/v1/projects/${projectId}/tasks/${childTaskId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const updateData = {
      title: "托运方创建预约单",
      description: "",
      status: "completed",
      custom_fields: {}
    };
    
    const updateResult = await makeRequest(updateOptions, updateData);
    console.log(`   更新结果: ${updateResult.status === 200 ? '✅ 成功' : '❌ 失败'}`);
    
    if (updateResult.status !== 200) {
      console.log(`   错误信息:`, updateResult.data);
      return;
    }
    
    // 3. 等待并检查父任务状态是否自动更新
    console.log('\n⏳ 3. 等待状态同步并检查父任务...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const parentAfterUpdate = await makeRequest(parentOptions);
    const newParentStatus = parentAfterUpdate.data?.data?.status;
    
    console.log(`   父任务 ${parentTaskId} 新状态: ${newParentStatus || 'N/A'}`);
    
    // 4. 验证联动逻辑
    if (newParentStatus && newParentStatus !== parentResult.data?.data?.status) {
      console.log('\n🎉 状态联动测试成功！父任务状态已自动更新');
    } else {
      console.log('\n⚠️  状态联动可能未生效，父任务状态未改变');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testStatusSync();