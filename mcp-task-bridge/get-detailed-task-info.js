import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

/**
 * 获取任务的详细信息，包括格式化的父任务、同级任务和子任务
 * 所有任务名称前会显示任务ID
 */
async function getDetailedTaskInfo(taskId) {
  try {
    console.log('🔍 获取任务详细信息...');
    
    // 获取目标任务
    const task = await taskServer.findTaskById(taskId);
    
    if (!task) {
      console.log(`❌ 未找到任务 ID: ${taskId}`);
      return null;
    }
    
    console.log(`\n======================================`);
    console.log(`📋 任务详情页`);
    console.log(`======================================\n`);
    
    // 基本信息
    console.log(`📌 任务ID: ${task.id}`);
    console.log(`📝 标题: ${task.title}`);
    console.log(`⚡ 状态: ${task.status}`);
    console.log(`🏢 项目ID: ${task.project_id}`);
    console.log(`⏰ 创建时间: ${task.created_at ? new Date(task.created_at).toLocaleString('zh-CN') : 'N/A'}`);
    console.log(`🔄 更新时间: ${task.updated_at ? new Date(task.updated_at).toLocaleString('zh-CN') : 'N/A'}`);
    
    // 优先级
    const priority = task.custom_fields?.priority || 'low';
    const priorityIcon = priority === 'high' ? '🔥' : priority === 'medium' ? '⚡' : '📋';
    console.log(`${priorityIcon} 优先级: ${priority}`);
    
    // 描述
    if (task.description && task.description.trim()) {
      console.log(`\n📄 描述:`);
      console.log(`   ${task.description}`);
    }
    
    // 工时信息
    if (task.estimated_hours) {
      console.log(`\n⏱️ 预估工时: ${task.estimated_hours}小时`);
    }
    if (task.actual_hours && task.actual_hours > 0) {
      console.log(`⏱️ 实际工时: ${task.actual_hours}小时`);
    }
    
    console.log(`\n--------------------------------------`);
    
    // 获取父任务信息（如果有）
    if (task.parent_id || task.parent_task_id) {
      const parentId = task.parent_id || task.parent_task_id;
      console.log(`\n👆 父任务:`);
      try {
        const parentTask = await taskServer.findTaskById(parentId);
        // 在任务名称前添加ID
        console.log(`   ├─ #${parentTask.id} ${parentTask.title}`);
        console.log(`   │  状态: ${parentTask.status}`);
        const parentPriority = parentTask.custom_fields?.priority || 'low';
        console.log(`   └─ 优先级: ${parentPriority}`);
      } catch (error) {
        console.log(`   └─ 无法获取父任务信息 (ID: ${parentId})`);
      }
    } else {
      console.log(`\n👆 父任务: 无 (这是根任务)`);
    }
    
    console.log(`\n--------------------------------------`);
    
    // 获取同级任务（兄弟任务）
    console.log(`\n👥 同级任务:`);
    try {
      const allTasksResponse = await taskServer.listTasks(task.project_id);
      if (allTasksResponse.success && allTasksResponse.tasks) {
        const parentId = task.parent_id || task.parent_task_id;
        // 筛选具有相同parent_id的任务（排除自己）
        const siblingTasks = allTasksResponse.tasks.filter(t => 
          (t.parent_id === parentId || t.parent_task_id === parentId) && 
          t.id !== taskId
        );
        
        if (siblingTasks.length > 0) {
          console.log(`   共 ${siblingTasks.length} 个同级任务:`);
          siblingTasks.forEach((sibling, index) => {
            const statusIcon = sibling.status === 'completed' ? '✅' : 
                             sibling.status === 'in_progress' ? '🚧' : '📋';
            const isLast = index === siblingTasks.length - 1;
            // 在任务名称前添加ID
            console.log(`   ${isLast ? '└─' : '├─'} ${statusIcon} #${sibling.id} ${sibling.title}`);
            console.log(`   ${isLast ? '   ' : '│  '} 状态: ${sibling.status}`);
          });
        } else {
          console.log(`   无同级任务`);
        }
      }
    } catch (error) {
      console.log(`   获取同级任务失败: ${error.message}`);
    }
    
    console.log(`\n--------------------------------------`);
    
    // 获取子任务
    console.log(`\n👇 子任务:`);
    try {
      const childrenResult = await taskServer.getTaskChildren(taskId);
      if (childrenResult.success && childrenResult.children && childrenResult.children.length > 0) {
        console.log(`   共 ${childrenResult.children.length} 个子任务:`);
        childrenResult.children.forEach((child, index) => {
          const statusIcon = child.status === 'completed' ? '✅' : 
                           child.status === 'in_progress' ? '🚧' : '📋';
          const isLast = index === childrenResult.children.length - 1;
          // 在任务名称前添加ID
          console.log(`   ${isLast ? '└─' : '├─'} ${statusIcon} #${child.id} ${child.title}`);
          console.log(`   ${isLast ? '   ' : '│  '} 状态: ${child.status}, 优先级: ${child.priority || 'low'}`);
        });
      } else {
        console.log(`   无子任务`);
      }
    } catch (error) {
      console.log(`   获取子任务失败: ${error.message}`);
    }
    
    console.log(`\n======================================\n`);
    
    return task;
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    return null;
  }
}

// 如果直接运行此文件，获取指定任务的详细信息
if (process.argv.length > 2) {
  const taskId = parseInt(process.argv[2]);
  if (!isNaN(taskId)) {
    getDetailedTaskInfo(taskId);
  } else {
    console.error('请提供有效的任务ID作为参数');
    console.error('用法: node get-detailed-task-info.js <taskId>');
  }
} else {
  // 默认示例：获取任务 #489 的详细信息
  console.log('使用示例任务ID: 489');
  getDetailedTaskInfo(489);
}

export { getDetailedTaskInfo };
