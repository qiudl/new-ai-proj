import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

const subtasks = [
  {
    title: "31-02-06：update_task - 更新任务信息",
    description: `作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现update_task功能。

**任务目标**：
- 在TaskMCPServer类中添加updateTask方法
- 在MCP工具列表中注册update_task工具
- 实现灵活的任务字段更新机制

**技术要求**：
1. API集成：调用PUT /api/v1/projects/{projectId}/tasks/{taskId}端点
2. 字段验证：验证更新字段的有效性和格式
3. 部分更新：支持只更新指定字段，保持其他字段不变
4. 状态管理：正确处理任务状态转换逻辑
5. 变更记录：记录字段变更历史和操作者信息

**输入参数**：
- id (number): 要更新的任务ID
- updates (object): 更新字段对象
  - title (string, 可选): 新标题
  - description (string, 可选): 新描述
  - status (string, 可选): 新状态
  - priority (string, 可选): 新优先级
  - due_date (string, 可选): 新截止日期

**输出格式**：
- success: boolean
- message: string
- updated_task: Task对象
- changed_fields: string[]

**代码文件**：
- /mcp-task-bridge/task-mcp.ts (添加updateTask方法)
- /mcp-task-bridge/index.ts (注册update_task工具)

请确保输入验证严格、支持增量更新，并维护数据一致性。`
  },
  {
    title: "31-02-07：archive_task - 归档任务",
    description: `作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现archive_task功能。

**任务目标**：
- 在TaskMCPServer类中添加archiveTask方法
- 在MCP工具列表中注册archive_task工具
- 实现完整的任务归档和恢复机制

**技术要求**：
1. API集成：调用POST /api/v1/projects/{projectId}/tasks/{taskId}/archive端点
2. 归档逻辑：实现软删除机制，保持数据完整性
3. 批量操作：支持单个和批量任务归档
4. 状态管理：正确设置archived_at时间戳和归档状态
5. 恢复功能：提供unarchiveTask反向操作

**输入参数**：
- id (number): 要归档的任务ID
- reason (string, 可选): 归档原因
- archive_subtasks (boolean, 可选): 是否同时归档子任务

**输出格式**：
- success: boolean
- message: string
- archived_task_id: number
- archived_at: string (ISO日期)
- archived_subtasks: number[]

**代码文件**：
- /mcp-task-bridge/task-mcp.ts (添加archiveTask和unarchiveTask方法)
- /mcp-task-bridge/index.ts (注册archive_task和unarchive_task工具)

请确保归档操作可逆、支持批量处理，并维护完整的审计跟踪。`
  },
  {
    title: "31-02-08：move_task - 移动任务到其他项目",
    description: `作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现move_task功能。

**任务目标**：
- 在TaskMCPServer类中添加moveTask方法
- 在MCP工具列表中注册move_task工具
- 实现安全的跨项目任务移动机制

**技术要求**：
1. API集成：调用POST /api/v1/projects/{sourceProjectId}/tasks/{taskId}/move端点
2. 权限验证：验证用户对源项目和目标项目的操作权限
3. 关系保持：正确处理任务层级关系和依赖
4. 数据一致性：确保移动过程中的数据完整性
5. 事务处理：使用事务确保操作的原子性

**输入参数**：
- task_id (number): 要移动的任务ID
- source_project_id (number): 源项目ID
- target_project_id (number): 目标项目ID
- move_subtasks (boolean, 可选): 是否移动子任务
- preserve_hierarchy (boolean, 可选): 是否保持层级结构

**输出格式**：
- success: boolean
- message: string
- moved_task_id: number
- source_project: number
- target_project: number
- moved_subtasks: number[]
- operation_id: string

**代码文件**：
- /mcp-task-bridge/task-mcp.ts (添加moveTask方法)
- /mcp-task-bridge/index.ts (注册move_task工具)

请确保移动操作安全可靠、支持复杂层级结构，并提供详细的操作日志。`
  }
];

async function createRemainingSubtasks() {
  console.log('🚀 创建剩余3个子任务...\n');
  
  const parentId = 66;
  const results = [];

  for (let i = 0; i < subtasks.length; i++) {
    const subtask = subtasks[i];
    console.log(`📝 正在创建子任务 ${i + 2}/4: ${subtask.title}`);
    
    try {
      // 创建子任务
      const result = await taskServer.createSubTask(parentId, subtask.title);
      
      if (result.success) {
        console.log(`✅ 子任务创建成功: ID ${result.id}`);
        
        // 更新描述
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
    
    // 添加短暂延迟，避免过快的连续请求
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n🎯 剩余任务创建总结:');
  results.forEach((result, index) => {
    const icon = result.status === 'success' ? '✅' : '❌';
    console.log(`${icon} 任务 ${index + 2}: ${result.title}`);
    if (result.id) {
      console.log(`   ID: ${result.id}`);
    }
    if (result.error) {
      console.log(`   错误: ${result.error}`);
    }
  });

  const successCount = results.filter(r => r.status === 'success').length;
  console.log(`\n📊 成功创建 ${successCount}/3 个剩余子任务`);
  console.log(`🎉 总计: 已创建 ${successCount + 1}/4 个子任务（包括第一个）`);
  
  return results;
}

createRemainingSubtasks().catch(console.error);