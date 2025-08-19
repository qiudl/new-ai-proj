import axios from 'axios';

async function createTask() {
  try {
    const taskData = {
      title: '为项目任务列表增加任务文档数列显示功能',
      description: `# 为项目任务列表增加任务文档数列显示功能

## 🎯 需求目标
在项目任务列表中增加一列显示每个任务的关联文档数量，点击数字可直接跳转到该任务的文档页面。

## 📋 功能要求

### 显示需求
- 在任务列表表格中新增"文档数"列
- 显示每个任务关联的文档总数
- 如果没有文档显示"0"，有文档显示实际数量
- 样式与其他列保持一致

### 交互需求 
- 点击文档数字可跳转到该任务的文档页面
- 鼠标悬停时显示pointer cursor
- 数字显示为链接样式（蓝色可点击）

## 🔧 技术实现要点

### 后端修改
- 修改任务列表API，增加document_count字段
- 使用JOIN查询或子查询统计每个任务的文档数量
- 确保性能优化，避免N+1查询问题

### 前端修改
- TaskList组件增加"文档数"列
- 实现点击跳转到TaskDetailPageNew的文档Tab
- 使用react-router进行页面导航

## 📊 技术细节
- 数据库查询：LEFT JOIN documents表统计count
- API响应格式：在task对象中增加document_count字段
- 前端路由：跳转到/projects/{projectId}/tasks/{taskId}?tab=documents

## ⏱️ 预估工时
3小时（后端1.5h + 前端1.5h）`,
      status: 'todo',
      custom_fields: {
        priority: 'medium',
        tags: ['功能增强', 'UI优化', '任务列表', '文档系统']
      }
    };

    console.log('Creating task with data:', JSON.stringify(taskData, null, 2));
    
    // Use the same auth token as the MCP server
    const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTYwOTgwMDUsImlhdCI6MTc1NTQ5MzIwNSwibmJmIjoxNzU1NDkzMjA1LCJyb2xlIjoiYWRtaW4iLCJzdWIiOiJhZG1pbiIsInVzZXJfaWQiOjEsInVzZXJfdHlwZSI6InN5c3RlbSIsInVzZXJuYW1lIjoiYWRtaW4ifQ.Lguj_VFqr_2vGG_L2gUM_dsmnezCYFzdZ0Loudx6vcg';
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    };
    
    const response = await axios.post('http://localhost:8081/api/v1/projects/1/tasks', taskData, {
      headers,
      proxy: false
    });
    
    console.log('✅ Task created successfully!');
    console.log('Full response:', JSON.stringify(response.data, null, 2));
    
    const task = response.data.data || response.data;
    console.log('Task ID:', task.id);
    console.log('Task Title:', task.title);
    console.log('Project ID:', task.project_id);
    console.log('Status:', task.status);
    console.log('Priority:', task.custom_fields?.priority);
    console.log('Tags:', task.custom_fields?.tags);
    
    return response.data;
  } catch (error) {
    console.error('❌ Error creating task:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

createTask();