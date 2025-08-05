import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function deleteErrorTasks() {
  console.log('🗑️ 删除错误创建的任务 409-413\n');

  const tasksToDelete = [
    { id: 409, name: 'Phase 1 - TaskDetailPageNew组件布局问题分析' },
    { id: 410, name: 'Phase 2 - 设计响应式布局解决方案' },
    { id: 411, name: 'Phase 3 - 实现CSS Grid响应式布局' },
    { id: 412, name: 'Phase 4 - 多设备兼容性测试' },
    { id: 413, name: 'Phase 5 - 文档更新和项目验收' }
  ];

  try {
    for (const task of tasksToDelete) {
      console.log(`🔍 正在删除任务 ${task.id}: ${task.name}...`);
      
      const result = await taskServer.deleteTask(task.id, true); // 使用 force 删除
      
      if (result.success) {
        console.log(`✅ 任务 ${task.id} 删除成功`);
        if (result.affected_subtasks && result.affected_subtasks.length > 0) {
          console.log(`   同时删除了子任务: [${result.affected_subtasks.join(', ')}]`);
        }
      } else {
        console.log(`❌ 任务 ${task.id} 删除失败: ${result.error}`);
      }
      
      console.log(''); // 空行分隔
    }

    console.log('🎉 批量删除操作完成！');
    console.log('💡 现在可以使用 create_subtask 工具将这些任务重新创建为任务408的子任务。');

  } catch (error) {
    console.error('❌ 删除过程中发生错误:', error.message);
  }
}

deleteErrorTasks();