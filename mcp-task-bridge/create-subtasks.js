import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function createSubtasks() {
  console.log('🚀 开始创建4个子任务...\n');
  
  const subtasks = [
    {
      title: "31-02-05：delete_task - 删除单个任务",
      description: "作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现delete_task功能。\n\n**任务目标**：\n- 在TaskMCPServer类中添加deleteTask方法\n- 在MCP工具列表中注册delete_task工具\n- 实现安全的任务删除机制\n\n**技术要求**：\n1. API集成：调用DELETE /api/v1/projects/{projectId}/tasks/{taskId}端点\n2. 安全验证：验证用户权限和任务所有权\n3. 级联处理：检查并处理子任务的删除逻辑\n4. 错误处理：提供详细的错误信息和回滚机制\n5. 日志记录：记录删除操作的审计日志\n\n**输入参数**：\n- id (number): 要删除的任务ID\n- force (boolean, 可选): 是否强制删除（包含子任务）\n\n**输出格式**：\n- success: boolean\n- message: string\n- deleted_task_id: number\n- affected_subtasks: number[]\n\n**代码文件**：\n- /mcp-task-bridge/task-mcp.ts (添加deleteTask方法)\n- /mcp-task-bridge/index.ts (注册delete_task工具)\n\n请确保代码质量、错误处理完善，并遵循现有代码风格。"
    },
    {
      title: "31-02-06：update_task - 更新任务信息",
      description: "作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现update_task功能。\n\n**任务目标**：\n- 在TaskMCPServer类中添加updateTask方法\n- 在MCP工具列表中注册update_task工具\n- 实现灵活的任务字段更新机制\n\n**技术要求**：\n1. API集成：调用PUT /api/v1/projects/{projectId}/tasks/{taskId}端点\n2. 字段验证：验证更新字段的有效性和格式\n3. 部分更新：支持只更新指定字段，保持其他字段不变\n4. 状态管理：正确处理任务状态转换逻辑\n5. 变更记录：记录字段变更历史和操作者信息\n\n**输入参数**：\n- id (number): 要更新的任务ID\n- updates (object): 更新字段对象\n  - title (string, 可选): 新标题\n  - description (string, 可选): 新描述\n  - status (string, 可选): 新状态\n  - priority (string, 可选): 新优先级\n  - due_date (string, 可选): 新截止日期\n\n**输出格式**：\n- success: boolean\n- message: string\n- updated_task: Task对象\n- changed_fields: string[]\n\n**代码文件**：\n- /mcp-task-bridge/task-mcp.ts (添加updateTask方法)\n- /mcp-task-bridge/index.ts (注册update_task工具)\n\n请确保输入验证严格、支持增量更新，并维护数据一致性。"
    },
    {
      title: "31-02-07：archive_task - 归档任务",
      description: "作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现archive_task功能。\n\n**任务目标**：\n- 在TaskMCPServer类中添加archiveTask方法\n- 在MCP工具列表中注册archive_task工具\n- 实现完整的任务归档和恢复机制\n\n**技术要求**：\n1. API集成：调用POST /api/v1/projects/{projectId}/tasks/{taskId}/archive端点\n2. 归档逻辑：实现软删除机制，保持数据完整性\n3. 批量操作：支持单个和批量任务归档\n4. 状态管理：正确设置archived_at时间戳和归档状态\n5. 恢复功能：提供unarchiveTask反向操作\n\n**输入参数**：\n- id (number): 要归档的任务ID\n- reason (string, 可选): 归档原因\n- archive_subtasks (boolean, 可选): 是否同时归档子任务\n\n**输出格式**：\n- success: boolean\n- message: string\n- archived_task_id: number\n- archived_at: string (ISO日期)\n- archived_subtasks: number[]\n\n**代码文件**：\n- /mcp-task-bridge/task-mcp.ts (添加archiveTask和unarchiveTask方法)\n- /mcp-task-bridge/index.ts (注册archive_task和unarchive_task工具)\n\n请确保归档操作可逆、支持批量处理，并维护完整的审计跟踪。"
    },
    {
      title: "31-02-08：move_task - 移动任务到其他项目",
      description: "作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现move_task功能。\n\n**任务目标**：\n- 在TaskMCPServer类中添加moveTask方法\n- 在MCP工具列表中注册move_task工具\n- 实现安全的跨项目任务移动机制\n\n**技术要求**：\n1. API集成：调用POST /api/v1/projects/{sourceProjectId}/tasks/{taskId}/move端点\n2. 权限验证：验证用户对源项目和目标项目的操作权限\n3. 关系保持：正确处理任务层级关系和依赖\n4. 数据一致性：确保移动过程中的数据完整性\n5. 事务处理：使用事务确保操作的原子性\n\n**输入参数**：\n- task_id (number): 要移动的任务ID\n- source_project_id (number): 源项目ID\n- target_project_id (number): 目标项目ID\n- move_subtasks (boolean, 可选): 是否移动子任务\n- preserve_hierarchy (boolean, 可选): 是否保持层级结构\n\n**输出格式**：\n- success: boolean\n- message: string\n- moved_task_id: number\n- source_project: number\n- target_project: number\n- moved_subtasks: number[]\n- operation_id: string\n\n**代码文件**：\n- /mcp-task-bridge/task-mcp.ts (添加moveTask方法)\n- /mcp-task-bridge/index.ts (注册move_task工具)\n\n请确保移动操作安全可靠、支持复杂层级结构，并提供详细的操作日志。"
    }
  ];

  const parentId = 66;
  const results = [];

  for (let i = 0; i < subtasks.length; i++) {
    const subtask = subtasks[i];
    console.log(`📝 正在创建子任务 ${i + 1}/4: ${subtask.title}`);
    
    try {
      // 首先创建子任务
      const result = await taskServer.createSubTask(parentId, subtask.title);
      
      if (result.success) {
        console.log(`✅ 子任务创建成功: ID ${result.id}`);
        
        // 然后更新描述
        const updateResult = await taskServer.updateTaskDescription(result.id, subtask.description);
        
        if (updateResult.success) {
          console.log(`✅ 描述更新成功`);
        } else {
          console.log(`⚠️ 描述更新失败: ${updateResult.error}`);
        }
        
        results.push({
          id: result.id,
          title: subtask.title,
          status: 'success'
        });
      } else {
        console.log(`❌ 子任务创建失败: ${result.error}`);
        results.push({
          title: subtask.title,
          status: 'failed',
          error: result.error
        });
      }
    } catch (error) {
      console.log(`❌ 执行失败: ${error.message}`);
      results.push({
        title: subtask.title,
        status: 'error',
        error: error.message
      });
    }
    
    console.log('---');
  }

  console.log('\n🎯 任务创建总结:');
  results.forEach((result, index) => {
    const icon = result.status === 'success' ? '✅' : '❌';
    console.log(`${icon} 任务 ${index + 1}: ${result.title}`);
    if (result.id) {
      console.log(`   ID: ${result.id}`);
    }
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });

  const successCount = results.filter(r => r.status === 'success').length;
  console.log(`\n📊 成功创建 ${successCount}/4 个子任务`);
}

createSubtasks().catch(console.error);