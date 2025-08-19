const axios = require('axios');

async function createTask() {
  try {
    const taskData = {
      project_id: 1,
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
      priority: 'medium',
      tags: ['功能增强', 'UI优化', '任务列表', '文档系统']
    };

    console.log('Creating task with data:', JSON.stringify(taskData, null, 2));
    
    const response = await axios.post('http://localhost:8081/api/v1/projects/1/tasks', taskData);
    
    console.log('✅ Task created successfully!');
    console.log('Task ID:', response.data.id);
    console.log('Task Title:', response.data.title);
    console.log('Project ID:', response.data.project_id);
    console.log('Status:', response.data.status);
    console.log('Priority:', response.data.priority);
    console.log('Tags:', response.data.tags);
    
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