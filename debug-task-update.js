#!/usr/bin/env node

// 调试任务更新失败的问题
const axios = require('axios');

async function debugTaskUpdate() {
  console.log('🔍 调试任务更新失败问题...\n');
  
  const baseURL = 'http://localhost:8080/api/v1';
  
  try {
    // 1. 登录获取token
    console.log('1. 登录获取token...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ 登录成功');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. 获取现有任务进行测试
    console.log('\n2. 获取现有任务...');
    const tasksResponse = await axios.get(`${baseURL}/projects/1/tasks?page=1&page_size=5`, { headers });
    const tasks = tasksResponse.data.data.data;
    
    if (tasks.length === 0) {
      console.log('❌ 没有找到任务，先创建一个');
      return;
    }
    
    const testTask = tasks[0];
    console.log(`📋 使用测试任务: #${testTask.id} - ${testTask.title}`);
    console.log('当前状态:', {
      parent_id: testTask.parent_id,
      status: testTask.status,
      task_level: testTask.task_level
    });
    
    // 3. 创建一个父任务（如果需要）
    console.log('\n3. 创建父任务...');
    const parentResponse = await axios.post(`${baseURL}/projects/1/tasks`, {
      title: 'Debug测试父任务',
      description: '用于调试的父任务',
      status: 'in_progress',
      custom_fields: {
        priority: 'high',
        tags: ['父任务', '调试']
      }
    }, { headers });
    
    const parentTaskId = parentResponse.data.data.task.id;
    console.log(`✅ 父任务创建成功，ID: ${parentTaskId}`);
    
    // 4. 尝试更新任务（模拟前端TaskModal的请求）
    console.log('\n4. 尝试更新任务（模拟TaskModal请求）...');
    
    // 模拟TaskModal组件的数据格式
    const updateData = {
      title: testTask.title,
      description: testTask.description || '',
      status: testTask.status,
      assignee_id: testTask.assignee_id || undefined,
      due_date: testTask.due_date || undefined,
      parent_id: parentTaskId, // 设置新的父任务
      custom_fields: {
        priority: testTask.custom_fields?.priority || 'medium',
        tags: testTask.custom_fields?.tags || [],
        estimated_hours: testTask.custom_fields?.estimated_hours || undefined,
      }
    };
    
    console.log('📤 发送更新请求:', JSON.stringify(updateData, null, 2));
    
    try {
      const updateResponse = await axios.put(`${baseURL}/projects/1/tasks/${testTask.id}`, updateData, { headers });
      console.log('✅ 任务更新成功');
      console.log('📄 更新响应:', JSON.stringify(updateResponse.data, null, 2));
      
      // 验证更新结果
      const verifyResponse = await axios.get(`${baseURL}/projects/1/tasks/${testTask.id}`, { headers });
      const updatedTask = verifyResponse.data.data;
      console.log('📋 更新后任务状态:', {
        id: updatedTask.id,
        title: updatedTask.title,
        parent_id: updatedTask.parent_id,
        status: updatedTask.status,
        task_level: updatedTask.task_level
      });
      
      if (updatedTask.parent_id === parentTaskId) {
        console.log('✅ 父任务设置成功');
      } else {
        console.log('❌ 父任务设置失败，期望:', parentTaskId, '实际:', updatedTask.parent_id);
      }
      
    } catch (updateError) {
      console.error('❌ 任务更新失败:');
      console.error('状态码:', updateError.response?.status);
      console.error('错误信息:', updateError.response?.data);
      console.error('请求头:', updateError.config?.headers);
      console.error('请求URL:', updateError.config?.url);
      console.error('请求数据:', updateError.config?.data);
      
      // 检查具体错误类型
      if (updateError.response?.status === 400) {
        console.log('\n🔍 400错误分析：');
        const errorData = updateError.response.data;
        if (errorData?.error?.message) {
          console.log('- 后端错误消息:', errorData.error.message);
        }
        if (errorData?.error?.details) {
          console.log('- 错误详情:', errorData.error.details);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 调试过程失败:', error.response?.data || error.message);
  }
}

debugTaskUpdate();