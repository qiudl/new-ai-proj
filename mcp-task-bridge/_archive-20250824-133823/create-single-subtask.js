import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function createDeleteTaskSubtask() {
  console.log('🚀 创建子任务：31-02-05：delete_task - 删除单个任务');
  
  const parentId = 66;
  const title = "31-02-05：delete_task - 删除单个任务";
  
  const description = `作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现delete_task功能。

**任务目标**：
- 在TaskMCPServer类中添加deleteTask方法
- 在MCP工具列表中注册delete_task工具
- 实现安全的任务删除机制

**技术要求**：
1. API集成：调用DELETE /api/v1/projects/{projectId}/tasks/{taskId}端点
2. 安全验证：验证用户权限和任务所有权
3. 级联处理：检查并处理子任务的删除逻辑
4. 错误处理：提供详细的错误信息和回滚机制
5. 日志记录：记录删除操作的审计日志

**输入参数**：
- id (number): 要删除的任务ID
- force (boolean, 可选): 是否强制删除（包含子任务）

**输出格式**：
- success: boolean
- message: string
- deleted_task_id: number
- affected_subtasks: number[]

**代码文件**：
- /mcp-task-bridge/task-mcp.ts (添加deleteTask方法)
- /mcp-task-bridge/index.ts (注册delete_task工具)

请确保代码质量、错误处理完善，并遵循现有代码风格。`;

  try {
    // 创建子任务
    const result = await taskServer.createSubTask(parentId, title);
    
    if (result.success) {
      console.log(`✅ 子任务创建成功: ID ${result.id}`);
      
      // 更新描述
      const updateResult = await taskServer.updateTaskDescription(result.id, description);
      
      if (updateResult.success) {
        console.log(`✅ 描述更新成功`);
        console.log(`🎯 任务 "${title}" 创建完成！`);
        return {
          success: true,
          taskId: result.id,
          title: title
        };
      } else {
        console.log(`⚠️ 描述更新失败: ${updateResult.error}`);
        return {
          success: true,
          taskId: result.id,
          title: title,
          warning: '描述更新失败'
        };
      }
    } else {
      console.log(`❌ 子任务创建失败: ${result.error}`);
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.log(`❌ 执行失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

createDeleteTaskSubtask()
  .then(result => {
    console.log('\n📋 创建结果:', JSON.stringify(result, null, 2));
  })
  .catch(console.error);