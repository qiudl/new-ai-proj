#!/usr/bin/env node

// 验证修复的问题
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

async function testFixes() {
  console.log('🔧 验证已修复的问题...\n');
  
  try {
    // 测试 1: 验证项目关联验证是否生效
    console.log('📋 测试 1: 项目关联验证');
    
    // 尝试创建没有项目关联的任务（应该被拒绝）
    const createTaskOptions = {
      hostname: 'localhost',
      port: 80,
      path: '/api/projects/0/tasks', // 无效的项目ID
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const invalidTaskData = {
      title: "测试无项目关联任务",
      description: "这个任务不应该被创建",
      status: "todo",
      custom_fields: {}
    };
    
    const result1 = await makeRequest(createTaskOptions, invalidTaskData);
    console.log(`   创建无项目关联任务: ${result1.status !== 200 ? '✅ 正确阻止' : '❌ 意外成功'} (状态: ${result1.status})`);
    
    // 测试 2: 验证父子任务状态联动仍然工作
    console.log('\\n📋 测试 2: 父子任务状态联动功能');
    
    const projectId = 1;
    const parentTaskId = 31;
    
    // 获取父任务当前状态
    const getParentOptions = {
      hostname: 'localhost',
      port: 80,
      path: `/api/projects/${projectId}/tasks/${parentTaskId}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const parentResult = await makeRequest(getParentOptions);
    if (parentResult.status === 200) {
      const originalStatus = parentResult.data?.data?.status;
      console.log(`   父任务 ${parentTaskId} 当前状态: ${originalStatus}`);
      
      // 获取子任务列表
      const getChildrenOptions = {
        hostname: 'localhost',
        port: 80,
        path: `/api/projects/${projectId}/tasks/${parentTaskId}/children`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      };
      
      const childrenResult = await makeRequest(getChildrenOptions);
      if (childrenResult.status === 200 && childrenResult.data?.length > 0) {
        const firstChild = childrenResult.data[0];
        console.log(`   找到子任务 ${firstChild.id}, 状态: ${firstChild.status}`);
        
        // 更新子任务状态
        const newChildStatus = firstChild.status === 'completed' ? 'todo' : 'completed';
        const updateChildOptions = {
          hostname: 'localhost',
          port: 80,
          path: `/api/projects/${projectId}/tasks/${firstChild.id}`,
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        };
        
        const updateChildData = {
          title: firstChild.title,
          description: firstChild.description || '',
          status: newChildStatus,
          custom_fields: firstChild.custom_fields || {}
        };
        
        const updateResult = await makeRequest(updateChildOptions, updateChildData);
        if (updateResult.status === 200) {
          console.log(`   ✅ 子任务状态更新成功: ${firstChild.status} → ${newChildStatus}`);
          
          // 等待同步并检查父任务状态
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const parentAfterUpdate = await makeRequest(getParentOptions);
          if (parentAfterUpdate.status === 200) {
            const newParentStatus = parentAfterUpdate.data?.data?.status;
            console.log(`   父任务状态: ${originalStatus} → ${newParentStatus}`);
            
            if (newParentStatus !== originalStatus) {
              console.log('   🎉 状态联动依然正常工作！');
            } else {
              console.log('   ⚠️  状态未变化，可能因为其他子任务状态');
            }
          }
        }
      } else {
        console.log('   ℹ️  该任务没有子任务，跳过联动测试');
      }
    }
    
    // 测试 3: 验证全局模式下的任务列表
    console.log('\\n📋 测试 3: 全局模式任务列表');
    
    const globalTasksOptions = {
      hostname: 'localhost',
      port: 80,
      path: '/api/tasks?page=1&page_size=10',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const globalResult = await makeRequest(globalTasksOptions);
    if (globalResult.status === 200) {
      const allTasks = globalResult.data?.data?.data || [];
      console.log(`   ✅ 全局任务列表正常访问，获取到 ${allTasks.length} 个任务`);
      
      // 检查是否所有任务都有项目关联
      const tasksWithoutProject = allTasks.filter(task => !task.project_id);
      if (tasksWithoutProject.length === 0) {
        console.log('   ✅ 所有任务都有有效的项目关联');
      } else {
        console.log(`   ⚠️  发现 ${tasksWithoutProject.length} 个任务没有项目关联`);
      }
    } else {
      console.log('   ❌ 无法访问全局任务列表');
    }
    
    console.log('\\n🎉 修复验证测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
  }
}

// 运行测试
testFixes();