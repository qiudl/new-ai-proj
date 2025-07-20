#!/usr/bin/env node

// 边界情况和异常场景测试脚本
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
    path: `/api/projects/${projectId}/tasks/${taskId}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  
  const result = await makeRequest(options);
  return result.status === 200 ? result.data?.data?.status : null;
}

async function updateTaskStatus(projectId, taskId, status, title = 'Test Task') {
  const options = {
    hostname: 'localhost',
    port: 80,
    path: `/api/projects/${projectId}/tasks/${taskId}`,
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
  return { success: result.status === 200, status: result.status, data: result.data };
}

async function testEdgeCases() {
  console.log('🧪 开始测试边界情况和异常场景...\n');
  
  const projectId = 1;
  
  try {
    // 测试 1: 不存在的任务ID
    console.log('📋 测试 1: 不存在的任务ID');
    const nonExistentTaskId = 99999;
    const result1 = await updateTaskStatus(projectId, nonExistentTaskId, 'completed', 'Non-existent Task');
    console.log(`   更新不存在的任务 ${nonExistentTaskId}: ${result1.success ? '✅ 意外成功' : '❌ 预期失败'} (状态: ${result1.status})`);
    
    // 测试 2: 无效的状态值
    console.log('\\n📋 测试 2: 无效的状态值');
    const validTaskId = 31; // 使用已知存在的任务
    const result2 = await updateTaskStatus(projectId, validTaskId, 'invalid_status', 'Test Task');
    console.log(`   使用无效状态值: ${result2.success ? '❌ 意外成功' : '✅ 预期失败'} (状态: ${result2.status})`);
    
    // 测试 3: 快速连续更新
    console.log('\\n📋 测试 3: 快速连续状态更新');
    const testTaskId = 38;
    const originalStatus = await getTaskStatus(projectId, testTaskId);
    console.log(`   原始状态: ${originalStatus}`);
    
    // 快速连续更新3次
    const updates = [
      updateTaskStatus(projectId, testTaskId, 'todo', 'Rapid Update 1'),
      updateTaskStatus(projectId, testTaskId, 'in_progress', 'Rapid Update 2'),
      updateTaskStatus(projectId, testTaskId, 'completed', 'Rapid Update 3')
    ];
    
    const results = await Promise.allSettled(updates);
    console.log(`   连续更新结果: ${results.filter(r => r.status === 'fulfilled' && r.value.success).length}/3 成功`);
    
    // 检查最终状态
    await new Promise(resolve => setTimeout(resolve, 2000));
    const finalStatus = await getTaskStatus(projectId, testTaskId);
    console.log(`   最终状态: ${finalStatus}`);
    
    // 测试 4: 空数据和null值
    console.log('\\n📋 测试 4: 空数据和特殊值处理');
    const result4 = await updateTaskStatus(projectId, testTaskId, '', 'Empty Status Test');
    console.log(`   空状态值: ${result4.success ? '❌ 意外成功' : '✅ 预期失败'} (状态: ${result4.status})`);
    
    // 测试 5: 大量子任务的父任务
    console.log('\\n📋 测试 5: 检查大量子任务场景');
    
    // 获取全局任务列表
    const globalOptions = {
      hostname: 'localhost',
      port: 80,
      path: '/api/tasks?page=1&page_size=100',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const globalResult = await makeRequest(globalOptions);
    let allTasks = [];
    if (globalResult.status === 200) {
      allTasks = globalResult.data?.data?.data || [];
      
      // 找到子任务最多的父任务
      const parentChildMap = new Map();
      allTasks.forEach(task => {
        if (task.parent_id) {
          const count = parentChildMap.get(task.parent_id) || 0;
          parentChildMap.set(task.parent_id, count + 1);
        }
      });
      
      const maxChildren = Math.max(...parentChildMap.values());
      const parentWithMostChildren = [...parentChildMap.entries()]
        .find(([_, count]) => count === maxChildren);
      
      if (parentWithMostChildren) {
        const [parentId, childCount] = parentWithMostChildren;
        console.log(`   找到最多子任务的父任务: ID ${parentId}, 子任务数: ${childCount}`);
        
        if (childCount > 10) {
          console.log(`   ⚠️  检测到大量子任务 (${childCount} 个)，建议关注性能`);
        } else {
          console.log(`   ✅ 子任务数量合理 (${childCount} 个)`);
        }
      }
    }
    
    // 测试 6: 网络超时模拟
    console.log('\\n📋 测试 6: 错误恢复机制');
    
    // 测试网络错误恢复
    const invalidPortOptions = {
      hostname: 'localhost',
      port: 9999, // 不存在的端口
      path: `/api/projects/${projectId}/tasks/${testTaskId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      timeout: 1000
    };
    
    try {
      await makeRequest(invalidPortOptions, { title: 'Network Test', status: 'todo' });
      console.log('   ❌ 网络错误测试意外成功');
    } catch (error) {
      console.log(`   ✅ 网络错误正确捕获: ${error.code}`);
    }
    
    // 测试 7: 循环引用检测
    console.log('\\n📋 测试 7: 潜在循环引用检测');
    
    // 检查是否存在可能的循环引用
    const taskHierarchy = new Map();
    allTasks.forEach(task => {
      if (task.parent_id) {
        taskHierarchy.set(task.id, task.parent_id);
      }
    });
    
    let circularRefs = 0;
    for (const [taskId, parentId] of taskHierarchy) {
      // 简单的循环检测：检查任务是否是自己的祖先
      let currentParent = parentId;
      const visited = new Set([taskId]);
      
      while (currentParent && !visited.has(currentParent)) {
        visited.add(currentParent);
        currentParent = taskHierarchy.get(currentParent);
        
        if (currentParent === taskId) {
          circularRefs++;
          console.log(`   ⚠️  检测到潜在循环引用: 任务 ${taskId}`);
          break;
        }
      }
    }
    
    if (circularRefs === 0) {
      console.log('   ✅ 未检测到循环引用');
    }
    
    console.log('\\n🎉 边界情况测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testEdgeCases();