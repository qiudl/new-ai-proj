#!/usr/bin/env node

// 调试父任务逻辑问题
const axios = require('axios');

async function debugParentLogic() {
  console.log('🔍 调试父任务逻辑问题...\n');
  
  const baseURL = 'http://localhost:8080/api/v1';
  
  try {
    // 1. 登录获取token
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. 获取现有任务
    const tasksResponse = await axios.get(`${baseURL}/projects/1/tasks?page=1&page_size=5`, { headers });
    const tasks = tasksResponse.data.data.data;
    const testTask = tasks.find(t => !t.parent_id); // 找一个没有父任务的任务
    
    if (!testTask) {
      console.log('❌ 没有找到没有父任务的任务');
      return;
    }
    
    console.log(`📋 使用测试任务: #${testTask.id} - ${testTask.title}`);
    console.log('当前状态:', {
      parent_id: testTask.parent_id,
      status: testTask.status
    });
    
    // 3. 创建父任务
    const parentResponse = await axios.post(`${baseURL}/projects/1/tasks`, {
      title: 'Debug测试父任务-逻辑测试',
      description: '用于调试父任务逻辑的测试任务',
      status: 'in_progress'
    }, { headers });
    
    const parentTaskId = parentResponse.data.data?.task?.id || parentResponse.data.data?.id;
    console.log(`✅ 父任务创建成功，ID: ${parentTaskId}`);
    
    // 4. 测试不同的parent_id值和条件
    console.log('\n4. 测试不同parent_id更新场景...');
    
    // 场景1: 从null设置为具体值
    console.log('\n场景1: parent_id从null设置为具体值');
    console.log(`- 当前: parent_id = ${testTask.parent_id} (null)`);
    console.log(`- 目标: parent_id = ${parentTaskId}`);
    console.log(`- 条件: req.ParentID != nil (${parentTaskId} != nil) = true`);
    console.log(`- 条件: existingTask.ParentID == nil (${testTask.parent_id} == nil) = true`);
    console.log(`- 逻辑: req.ParentID != nil && (existingTask.ParentID == nil || *req.ParentID != *existingTask.ParentID)`);
    console.log(`- 计算: true && (true || N/A) = true`);
    console.log('- 预期结果: 应该进入更新逻辑');
    
    const updateData1 = {
      title: testTask.title,
      description: testTask.description || '',
      status: testTask.status,
      parent_id: parentTaskId
    };
    
    try {
      const updateResponse1 = await axios.put(`${baseURL}/projects/1/tasks/${testTask.id}`, updateData1, { headers });
      console.log('✅ 场景1更新成功');
      
      // 验证结果
      const verifyResponse1 = await axios.get(`${baseURL}/projects/1/tasks/${testTask.id}`, { headers });
      const updatedTask1 = verifyResponse1.data.data;
      console.log('📋 更新后状态:', {
        parent_id: updatedTask1.parent_id,
        expected: parentTaskId
      });
      
      if (updatedTask1.parent_id === parentTaskId) {
        console.log('✅ 场景1验证成功');
      } else {
        console.log('❌ 场景1验证失败');
      }
      
    } catch (error) {
      console.error('❌ 场景1更新失败:', error.response?.data);
    }
    
    // 等待一秒
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 场景2: 从具体值修改为另一个值
    console.log('\n场景2: parent_id从一个值修改为另一个值');
    
    // 创建另一个父任务
    const parentResponse2 = await axios.post(`${baseURL}/projects/1/tasks`, {
      title: 'Debug测试父任务2-逻辑测试',
      description: '第二个父任务',
      status: 'todo'
    }, { headers });
    
    const parentTaskId2 = parentResponse2.data.data?.task?.id || parentResponse2.data.data?.id;
    console.log(`✅ 第二个父任务创建成功，ID: ${parentTaskId2}`);
    
    // 获取当前任务状态
    const currentResponse = await axios.get(`${baseURL}/projects/1/tasks/${testTask.id}`, { headers });
    const currentTask = currentResponse.data.data;
    
    console.log(`- 当前: parent_id = ${currentTask.parent_id}`);
    console.log(`- 目标: parent_id = ${parentTaskId2}`);
    
    const updateData2 = {
      title: currentTask.title,
      description: currentTask.description || '',
      status: currentTask.status,
      parent_id: parentTaskId2
    };
    
    try {
      const updateResponse2 = await axios.put(`${baseURL}/projects/1/tasks/${testTask.id}`, updateData2, { headers });
      console.log('✅ 场景2更新成功');
      
      // 验证结果
      const verifyResponse2 = await axios.get(`${baseURL}/projects/1/tasks/${testTask.id}`, { headers });
      const updatedTask2 = verifyResponse2.data.data;
      console.log('📋 更新后状态:', {
        parent_id: updatedTask2.parent_id,
        expected: parentTaskId2
      });
      
      if (updatedTask2.parent_id === parentTaskId2) {
        console.log('✅ 场景2验证成功');
      } else {
        console.log('❌ 场景2验证失败');
      }
      
    } catch (error) {
      console.error('❌ 场景2更新失败:', error.response?.data);
    }
    
    // 场景3: 从具体值设置为null（移除父任务）
    console.log('\n场景3: parent_id从具体值设置为null');
    
    const updateData3 = {
      title: testTask.title,
      description: testTask.description || '',
      status: testTask.status,
      parent_id: null
    };
    
    try {
      const updateResponse3 = await axios.put(`${baseURL}/projects/1/tasks/${testTask.id}`, updateData3, { headers });
      console.log('✅ 场景3更新成功');
      
      // 验证结果
      const verifyResponse3 = await axios.get(`${baseURL}/projects/1/tasks/${testTask.id}`, { headers });
      const updatedTask3 = verifyResponse3.data.data;
      console.log('📋 更新后状态:', {
        parent_id: updatedTask3.parent_id,
        expected: null
      });
      
      if (updatedTask3.parent_id === null) {
        console.log('✅ 场景3验证成功');
      } else {
        console.log('❌ 场景3验证失败');
      }
      
    } catch (error) {
      console.error('❌ 场景3更新失败:', error.response?.data);
    }
    
  } catch (error) {
    console.error('❌ 调试过程失败:', error.response?.data || error.message);
  }
}

debugParentLogic();