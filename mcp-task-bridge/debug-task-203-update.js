import { TaskMCPServer } from './task-mcp.js';
import axios from 'axios';

const taskServer = new TaskMCPServer();

async function debugTask203Update() {
  console.log('🔍 调试任务203父任务更新问题\n');

  try {
    // 1. 直接通过API查看任务203的详细信息
    console.log('📋 1. 直接通过API查看任务203...');
    
    const task203 = await taskServer.findTaskById(203);
    console.log('任务203原始数据:', JSON.stringify(task203, null, 2));
    
    // 2. 尝试直接调用API更新
    console.log('\n🔧 2. 直接调用API更新任务203...');
    
    const updateData = {
      title: task203.title,
      description: task203.description,
      status: task203.status,
      project_id: task203.project_id,
      parent_id: 200,
      custom_fields: task203.custom_fields || {}
    };
    
    console.log('更新数据:', JSON.stringify(updateData, null, 2));
    
    const response = await axios.put(
      `http://localhost:8081/api/v1/projects/${task203.project_id}/tasks/203`,
      updateData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTYwOTgwMDUsImlhdCI6MTc1NTQ5MzIwNSwibmJmIjoxNzU1NDkzMjA1LCJyb2xlIjoiYWRtaW4iLCJzdWIiOiJhZG1pbiIsInVzZXJfaWQiOjEsInVzZXJfdHlwZSI6InN5c3RlbSIsInVzZXJuYW1lIjoiYWRtaW4ifQ.Lguj_VFqr_2vGG_L2gUM_dsmnezCYFzdZ0Loudx6vcg`
        },
        proxy: false
      }
    );
    
    console.log('API响应状态:', response.status);
    console.log('API响应数据:', JSON.stringify(response.data, null, 2));
    
    // 3. 再次查看任务203
    console.log('\n📋 3. 更新后再次查看任务203...');
    const updatedTask203 = await taskServer.findTaskById(203);
    console.log('更新后的任务203:', JSON.stringify(updatedTask203, null, 2));
    
  } catch (error) {
    console.error('❌ 调试过程中发生错误:', error.message);
    if (error.response) {
      console.error('错误响应:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugTask203Update();