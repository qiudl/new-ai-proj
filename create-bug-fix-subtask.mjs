import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function createBugFixSubtask() {
  const mcp = new TaskMCPServer();
  
  try {
    console.log('查找任务397...');
    const task = await mcp.findTaskById(397);
    console.log('任务397详情:', JSON.stringify({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      project_id: task.project_id,
      parent_id: task.parent_id
    }, null, 2));
    
    // 创建子任务
    console.log('\n创建子任务...');
    const description = `## 任务描述
本任务总结了批量父任务功能中的两个重要Bug修复：

### 1. 修复了批量更改父任务时的"Title is required and must be a non-empty string"错误
**问题描述：** 在批量更改父任务时，系统返回400错误，提示"Title is required and must be a non-empty string"

**原因分析：** 前端代码使用了逐个TaskService.updateTask而不是专门的批量API，导致每次更新都需要提供完整的title字段

**解决方案：** 改用TaskService.batchUpdateTasks方法，避免个别任务的title验证问题

### 2. 修复了父任务选择器显示当前选中任务的问题  
**问题描述：** 当选中4个任务进行批量父任务更改时，这4个任务也出现在父任务选择列表中，导致逻辑错误

**解决方案：** 通过Agent工具分析并提供了完整的前后端修复方案，确保选中的任务不会出现在可选父任务列表中

## 涉及文件
- \`backend/main.go\` - 批量更新handler增加空title保护
- \`frontend/src/components/EnhancedProjectTaskManager.tsx\` - 修复批量父任务更新逻辑

## 技术要点
1. 前端批量操作API调用优化
2. 父任务选择器逻辑改进
3. 错误处理和用户体验提升

## 完成状态
✅ 已完成所有修复工作，功能正常运行`;

    const result = await mcp.createSubTask(397, {
      title: '批量父任务功能重要Bug修复 - title验证和选择器排除问题',
      description: description,
      status: 'completed',
      priority: 'high'
    });
    
    console.log('\n创建结果:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('执行失败:', error.message);
  }
}

createBugFixSubtask();