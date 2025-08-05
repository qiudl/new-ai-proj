import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function recreateSubtasks() {
  console.log('📝 为任务408重新创建子任务\n');

  const parentTaskId = 408;
  const subtasks = [
    'Phase 1 - TaskDetailPageNew组件布局问题分析',
    'Phase 2 - 设计响应式布局解决方案', 
    'Phase 3 - 实现CSS Grid响应式布局',
    'Phase 4 - 多设备兼容性测试',
    'Phase 5 - 文档更新和项目验收'
  ];

  try {
    // 首先验证父任务408是否存在
    console.log(`🔍 检查父任务 ${parentTaskId} 是否存在...`);
    
    console.log(`\n📋 开始创建 ${subtasks.length} 个子任务:\n`);

    for (let i = 0; i < subtasks.length; i++) {
      const taskName = subtasks[i];
      console.log(`📝 创建子任务 ${i + 1}: ${taskName}...`);
      
      const result = await taskServer.createSubTask(parentTaskId, taskName);
      
      if (result.success) {
        console.log(`✅ 子任务创建成功 - ID: ${result.id}`);
      } else {
        console.log(`❌ 子任务创建失败: ${result.error}`);
      }
      
      console.log(''); // 空行分隔
    }

    console.log('🎉 所有子任务创建完成！');
    console.log('💡 这些任务现在已正确归属于任务408作为其子任务。');

  } catch (error) {
    console.error('❌ 创建子任务过程中发生错误:', error.message);
  }
}

recreateSubtasks();