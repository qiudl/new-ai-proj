#!/usr/bin/env node

/**
 * 创建测试数据：带子任务的任务
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8080/api/v1';

async function createTestData() {
  console.log('🚀 创建测试数据...');
  
  try {
    // 1. 先获取现有项目
    console.log('📋 获取项目列表...');
    const projectsResponse = await axios.get(`${API_BASE}/projects`);
    const projects = projectsResponse.data;
    
    if (!projects || projects.length === 0) {
      console.log('❌ 没有找到项目，请先创建项目');
      return;
    }
    
    const projectId = projects[0].id;
    console.log(`✅ 使用项目: ${projects[0].name} (ID: ${projectId})`);
    
    // 2. 创建父任务
    console.log('👨‍👩‍👧‍👦 创建父任务...');
    const parentTaskResponse = await axios.post(`${API_BASE}/projects/${projectId}/tasks`, {
      title: '子任务表格测试-父任务',
      description: '用于测试子任务表格功能的父任务',
      status: 'in_progress',
      custom_fields: {
        priority: 'high'
      }
    });
    
    const parentTask = parentTaskResponse.data;
    console.log(`✅ 父任务创建成功: ${parentTask.title} (ID: ${parentTask.id})`);
    
    // 3. 创建多个子任务
    console.log('👶 创建子任务...');
    const subtasks = [
      {
        title: '子任务1-前端开发',
        description: '开发前端界面功能',
        status: 'todo',
        parent_id: parentTask.id,
        custom_fields: { priority: 'high' }
      },
      {
        title: '子任务2-后端API',
        description: '开发后端API接口',
        status: 'in_progress',
        parent_id: parentTask.id,
        custom_fields: { priority: 'medium' }
      },
      {
        title: '子任务3-数据库设计',
        description: '设计数据库表结构',
        status: 'completed',
        parent_id: parentTask.id,
        custom_fields: { priority: 'low' }
      },
      {
        title: '子任务4-测试用例编写',
        description: '编写单元测试和集成测试',
        status: 'todo',
        parent_id: parentTask.id,
        custom_fields: { priority: 'medium' }
      },
      {
        title: '子任务5-文档编写',
        description: '编写技术文档和用户手册',
        status: 'todo',
        parent_id: parentTask.id,
        custom_fields: { priority: 'low' }
      }
    ];
    
    const createdSubtasks = [];
    for (const subtaskData of subtasks) {
      try {
        const response = await axios.post(`${API_BASE}/projects/${projectId}/tasks`, subtaskData);
        createdSubtasks.push(response.data);
        console.log(`  ✅ ${response.data.title} (ID: ${response.data.id})`);
      } catch (error) {
        console.error(`  ❌ 创建子任务失败: ${subtaskData.title}`, error.response?.data || error.message);
      }
    }
    
    console.log(`🎉 测试数据创建完成！`);
    console.log(`📄 父任务详情页: http://localhost:3000/projects/${projectId}/tasks/${parentTask.id}`);
    console.log(`📊 共创建 ${createdSubtasks.length} 个子任务`);
    
    return {
      projectId,
      parentTask,
      subtasks: createdSubtasks
    };
    
  } catch (error) {
    console.error('❌ 创建测试数据失败:', error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🧪 子任务表格测试数据创建工具');
  console.log('===============================');
  
  try {
    const result = await createTestData();
    
    console.log('\n🔍 手动测试步骤:');
    console.log('1. 打开浏览器访问 http://localhost:3000');
    console.log('2. 使用 admin/admin123 登录');
    console.log(`3. 访问父任务详情页: http://localhost:3000/projects/${result.projectId}/tasks/${result.parentTask.id}`);
    console.log('4. 检查子任务列表中的第一列是否为"任务ID"');
    console.log('5. 检查各列标题是否有排序图标');
    console.log('6. 点击各列标题测试排序功能');
    
  } catch (error) {
    console.error('💥 程序执行失败');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
