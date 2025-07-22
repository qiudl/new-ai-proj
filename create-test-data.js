#!/usr/bin/env node

/**
 * 创建测试数据：父子任务结构
 */

const axios = require('axios');
const API_BASE = 'http://localhost:8080';

async function createTestData() {
  console.log('🏗️  创建层级测试数据...\n');

  try {
    const projectId = 34; // 李宁团购管理平台

    // 1. 创建父任务
    console.log('📝 创建父任务...');
    const parentTaskData = {
      title: '功能模块开发',
      description: '开发核心功能模块，包含前端、后端和测试',
      status: 'in_progress',
      due_date: '2025-08-15'
    };

    const parentResponse = await axios.post(`${API_BASE}/api/projects/${projectId}/tasks`, parentTaskData);
    const parentTask = parentResponse.data.data;
    console.log(`✅ 创建父任务成功: ${parentTask.title} (ID: ${parentTask.id})`);

    // 2. 创建第一级子任务
    console.log('\n📋 创建第一级子任务...');
    const childTasks = [
      {
        title: '前端界面开发',
        description: '开发用户界面和交互功能',
        status: 'todo',
        parent_id: parentTask.id,
        due_date: '2025-08-05'
      },
      {
        title: '后端API开发',
        description: '开发后端接口和业务逻辑',
        status: 'in_progress',
        parent_id: parentTask.id,
        due_date: '2025-08-10'
      },
      {
        title: '集成测试',
        description: '进行系统集成测试',
        status: 'todo',
        parent_id: parentTask.id,
        due_date: '2025-08-12'
      }
    ];

    const createdChildTasks = [];
    for (const childData of childTasks) {
      const childResponse = await axios.post(`${API_BASE}/api/projects/${projectId}/tasks`, childData);
      const childTask = childResponse.data.data;
      createdChildTasks.push(childTask);
      console.log(`✅ 创建子任务: ${childTask.title} (ID: ${childTask.id})`);
    }

    // 3. 为第一个子任务创建孙任务
    if (createdChildTasks.length > 0) {
      const frontendTask = createdChildTasks[0];
      console.log('\n🎯 创建第二级子任务（孙任务）...');
      
      const grandChildTasks = [
        {
          title: '登录页面开发',
          description: '开发用户登录界面',
          status: 'completed',
          parent_id: frontendTask.id,
          due_date: '2025-08-02'
        },
        {
          title: '主页面开发', 
          description: '开发系统主界面',
          status: 'in_progress',
          parent_id: frontendTask.id,
          due_date: '2025-08-04'
        }
      ];

      for (const grandChildData of grandChildTasks) {
        const grandChildResponse = await axios.post(`${API_BASE}/api/projects/${projectId}/tasks`, grandChildData);
        const grandChildTask = grandChildResponse.data.data;
        console.log(`✅ 创建孙任务: ${grandChildTask.title} (ID: ${grandChildTask.id})`);
      }
    }

    console.log('\n🎉 测试数据创建完成！');
    console.log('\n📊 创建的任务结构:');
    console.log('功能模块开发 (父任务)');
    console.log('├── 前端界面开发 (子任务)');
    console.log('│   ├── 登录页面开发 (孙任务)');
    console.log('│   └── 主页面开发 (孙任务)');
    console.log('├── 后端API开发 (子任务)');
    console.log('└── 集成测试 (子任务)');
    
    console.log('\n💡 现在可以访问 http://localhost/tasks 测试层级展开效果');

  } catch (error) {
    console.error('❌ 创建测试数据失败:', error.message);
    if (error.response) {
      console.error('响应错误:', error.response.data);
    }
  }
}

createTestData();
