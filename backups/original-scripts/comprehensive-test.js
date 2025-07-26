#!/usr/bin/env node

// Comprehensive test for parent-child task status synchronization
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

async function getTaskStatus(projectId, taskId) {
  const options = {
    hostname: 'localhost',
    port: 80,
    path: `/api/v1/projects/${projectId}/tasks/${taskId}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  
  const result = await makeRequest(options);
  return result.data?.data?.status || 'N/A';
}

async function updateTaskStatus(projectId, taskId, status, title = 'Updated Task') {
  const options = {
    hostname: 'localhost',
    port: 80,
    path: `/api/v1/projects/${projectId}/tasks/${taskId}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  };
  
  const updateData = {
    title: title,
    description: "",
    status: status,
    custom_fields: {}
  };
  
  const result = await makeRequest(options, updateData);
  return result.status === 200;
}

async function comprehensiveTest() {
  console.log('🚀 开始综合测试父子任务状态联动功能...\n');
  
  const projectId = 1;
  
  // Test case 1: Task 31 (父任务) with children 38, 39, 41, 42
  console.log('📋 测试用例 1: 多子任务状态联动');
  const parent1 = 31;
  const children1 = [38, 39, 41, 42];
  
  try {
    // 获取初始状态
    console.log('📊 初始状态:');
    const parentStatus1 = await getTaskStatus(projectId, parent1);
    console.log(`   父任务 ${parent1}: ${parentStatus1}`);
    
    for (const child of children1) {
      const status = await getTaskStatus(projectId, child);
      console.log(`   子任务 ${child}: ${status}`);
    }
    
    // 测试 1.1: 全部子任务完成 → 父任务应该变为完成
    console.log('\\n🔄 测试 1.1: 将所有子任务标记为完成...');
    for (const child of children1) {
      const success = await updateTaskStatus(projectId, child, 'completed', `Child Task ${child}`);
      console.log(`   子任务 ${child}: ${success ? '✅' : '❌'}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newParentStatus1 = await getTaskStatus(projectId, parent1);
    console.log(`\\n   结果: 父任务 ${parent1} → ${newParentStatus1}`);
    console.log(`   预期: completed, 实际: ${newParentStatus1}, ${newParentStatus1 === 'completed' ? '✅ 通过' : '❌ 失败'}`);
    
    // 测试 1.2: 部分子任务待办 → 父任务应该变为进行中
    console.log('\\n🔄 测试 1.2: 将部分子任务重置为待办...');
    await updateTaskStatus(projectId, children1[0], 'todo', `Child Task ${children1[0]}`);
    await updateTaskStatus(projectId, children1[1], 'in_progress', `Child Task ${children1[1]}`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newParentStatus2 = await getTaskStatus(projectId, parent1);
    console.log(`\\n   结果: 父任务 ${parent1} → ${newParentStatus2}`);
    console.log(`   预期: in_progress, 实际: ${newParentStatus2}, ${newParentStatus2 === 'in_progress' ? '✅ 通过' : '❌ 失败'}`);
    
    // Test case 2: 层级任务测试 (Task 26 → 27 → 28)
    console.log('\\n\\n📋 测试用例 2: 多层级任务联动');
    const grandparent = 26;  // 根任务测试
    const parent2 = 27;      // 子任务1 - 已更新  
    const child2 = 28;       // 孙任务1
    
    console.log('📊 初始状态:');
    console.log(`   祖父任务 ${grandparent}: ${await getTaskStatus(projectId, grandparent)}`);
    console.log(`   父任务 ${parent2}: ${await getTaskStatus(projectId, parent2)}`);
    console.log(`   子任务 ${child2}: ${await getTaskStatus(projectId, child2)}`);
    
    // 测试多层级联动
    console.log('\\n🔄 测试 2.1: 最底层任务完成，检查向上传播...');
    await updateTaskStatus(projectId, child2, 'completed', 'Grandchild Task');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('   结果:');
    console.log(`   祖父任务 ${grandparent}: ${await getTaskStatus(projectId, grandparent)}`);
    console.log(`   父任务 ${parent2}: ${await getTaskStatus(projectId, parent2)}`);
    console.log(`   子任务 ${child2}: ${await getTaskStatus(projectId, child2)}`);
    
    console.log('\\n🎉 综合测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
comprehensiveTest();