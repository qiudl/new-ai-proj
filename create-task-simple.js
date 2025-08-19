// Create task using MCP TaskMCPServer class
import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function createTask() {
  try {
    console.log('创建任务: 为项目任务列表增加任务文档数列显示功能');
    
    // Initialize the TaskMCPServer with default API base
    const taskServer = new TaskMCPServer();
    
    // Create the task with detailed specification
    const result = await taskServer.createTask(
      '为项目任务列表增加任务文档数列显示功能', 
      1, // project ID
      {
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
        custom_fields: {
          tags: ['功能增强', 'UI优化', '任务列表', '文档系统']
        }
      }
    );
    
    if (result.success) {
      console.log('✅ 任务创建成功!');
      console.log(`任务ID: ${result.id}`);
      console.log(`任务标题: ${result.title}`);
      console.log(`状态: ${result.status}`);
      console.log(`优先级: ${result.priority}`);
      console.log(`消息: ${result.message}`);
      
      return result;
    } else {
      console.error('❌ 任务创建失败:', result.error);
      return null;
    }
    
  } catch (error) {
    console.error('❌ 创建任务时发生错误:', error.message);
    return null;
  }
}

// 执行任务创建
createTask().then(result => {
  if (result) {
    console.log('\n🎉 任务创建完成！');
    console.log('请在项目管理系统中查看新创建的任务。');
  } else {
    console.log('\n❌ 任务创建失败！');
    console.log('请检查系统状态或联系管理员。');
  }
  process.exit(result ? 0 : 1);
}).catch(error => {
  console.error('执行错误:', error);
  process.exit(1);
});