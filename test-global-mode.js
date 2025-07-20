#!/usr/bin/env node

// Test script for global mode functionality
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

async function testGlobalMode() {
  console.log('🌍 开始测试全局模式下的父子任务状态联动功能...\n');
  
  try {
    // 1. 获取全局任务列表
    console.log('📊 1. 获取全局任务列表...');
    
    const globalOptions = {
      hostname: 'localhost',
      port: 80,
      path: '/api/tasks?page=1&page_size=50',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const globalResult = await makeRequest(globalOptions);
    if (globalResult.status !== 200) {
      console.log('❌ 无法获取全局任务列表');
      return;
    }
    
    console.log('   API响应:', JSON.stringify(globalResult.data, null, 2).substring(0, 200) + '...');
    
    const allTasks = globalResult.data?.data?.data || [];
    console.log(`   找到 ${Array.isArray(allTasks) ? allTasks.length : 'N/A'} 个任务`);
    
    // 2. 查找有父子关系的任务
    console.log('\\n🔍 2. 查找父子任务关系...');
    
    const parentTasks = allTasks.filter(task => 
      allTasks.some(child => child.parent_id === task.id)
    );
    
    const childTasks = allTasks.filter(task => task.parent_id);
    
    console.log(`   父任务: ${parentTasks.length} 个`);
    console.log(`   子任务: ${childTasks.length} 个`);
    
    if (parentTasks.length === 0) {
      console.log('❌ 未找到父子任务关系，测试终止');
      return;
    }
    
    // 3. 选择一个测试案例
    const testParent = parentTasks[0];
    const testChildren = allTasks.filter(task => task.parent_id === testParent.id);
    
    console.log(`\\n🎯 3. 测试案例选择:`);
    console.log(`   父任务: ${testParent.id} - "${testParent.title}" (${testParent.status})`);
    console.log(`   子任务数量: ${testChildren.length}`);
    
    testChildren.forEach(child => {
      console.log(`     → ${child.id} - "${child.title}" (${child.status})`);
    });
    
    // 4. 测试状态联动
    if (testChildren.length > 0) {
      console.log('\\n🔄 4. 测试状态联动 (全局模式)...');
      
      const testChild = testChildren[0];
      const originalStatus = testChild.status;
      const newStatus = originalStatus === 'completed' ? 'todo' : 'completed';
      
      console.log(`   将子任务 ${testChild.id} 从 "${originalStatus}" 改为 "${newStatus}"`);
      
      // 更新子任务状态
      const updateOptions = {
        hostname: 'localhost',
        port: 80,
        path: `/api/v1/projects/${testChild.project_id}/tasks/${testChild.id}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      };
      
      const updateData = {
        title: testChild.title,
        description: testChild.description || "",
        status: newStatus,
        custom_fields: testChild.custom_fields || {}
      };
      
      const updateResult = await makeRequest(updateOptions, updateData);
      
      if (updateResult.status === 200) {
        console.log('   ✅ 子任务状态更新成功');
        
        // 等待同步
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 检查父任务状态
        const parentCheckOptions = {
          hostname: 'localhost',
          port: 80,
          path: `/api/v1/projects/${testParent.project_id}/tasks/${testParent.id}`,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        };
        
        const parentCheckResult = await makeRequest(parentCheckOptions);
        
        if (parentCheckResult.status === 200) {
          const updatedParentStatus = parentCheckResult.data?.data?.status;
          console.log(`   父任务状态: ${testParent.status} → ${updatedParentStatus}`);
          
          if (updatedParentStatus !== testParent.status) {
            console.log('   🎉 全局模式下状态联动成功！');
          } else {
            console.log('   ⚠️  父任务状态未改变，可能联动未生效');
          }
        } else {
          console.log('   ❌ 无法获取更新后的父任务状态');
        }
      } else {
        console.log('   ❌ 子任务状态更新失败');
      }
    }
    
    console.log('\\n🏁 全局模式测试完成');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testGlobalMode();