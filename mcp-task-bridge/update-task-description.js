#!/usr/bin/env node

import axios from 'axios';

async function updateTaskDescription() {
  console.log('📝 更新任务 #64 的详细描述');
  console.log('============================');
  
  const apiBase = 'http://localhost:8080/api/v1';
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InN5c3RlbSIsInJvbGUiOiJhZG1pbiIsInVzZXJfdHlwZSI6InN5c3RlbSIsImlhdCI6MTc1NDEwNzk1MSwiZXhwIjoxNzU0MTExNTUxLCJpc3MiOiJhaS1wcm9qZWN0LWJhY2tlbmQiLCJzdWIiOiJzeXN0ZW0ifQ.N3GJ9s16OaG6rXJaFOIk9S5Go2CYFNZ4_2A5OGMC1j8';
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };
  
  try {
    // 获取任务列表，找到任务 64
    const listResponse = await axios.get(`${apiBase}/projects/1/tasks`, { headers });
    const tasks = listResponse.data.data.data;
    const task64 = tasks.find(t => t.id === 64);
    
    if (!task64) {
      console.error('❌ 找不到任务 #64');
      return;
    }
    
    console.log('📋 当前任务信息:');
    console.log(`ID: ${task64.id}`);
    console.log(`标题: ${task64.title}`);
    console.log(`状态: ${task64.status}`);
    console.log(`描述: ${task64.description}`);
    
    // 准备完整的描述
    const fullDescription = `用Playwright对**测试1: create_task功能验证任务进行测试，要求录视频，登录密码admin, password.**

测试步骤:
1) 登录后进入测试任务详情页http://localhost/projects/1/tasks/50
2) 根据测试任务名，用模拟人类操作的方式去完成任务。比如创建任务，那就是应该在任务详情页找到创建子任务按钮，对任务内容进行编辑，提交后查看任务
3) 让用户看到整个页面的变化过程,速度要放慢,每个页面的切换停留2秒钟

技术要求:
- 使用 Playwright 进行自动化测试
- 录制整个测试过程的视频
- 模拟真实的人类操作行为
- 每个页面操作间隔2秒
- 完成时间: 今天

父任务: #50 Claude Code MCP 集成测试任务`;

    // 更新任务
    const updateData = {
      title: task64.title,
      project_id: task64.project_id,
      status: task64.status,
      description: fullDescription,
      parent_id: task64.parent_id
    };
    
    const updateResponse = await axios.put(`${apiBase}/projects/1/tasks/64`, updateData, { headers });
    
    console.log('✅ 任务描述更新成功！');
    console.log('📖 新的描述内容:');
    console.log('================');
    console.log(fullDescription);
    
  } catch (error) {
    console.error('❌ 更新失败:', error.response?.data || error.message);
  }
}

updateTaskDescription().catch(console.error);
