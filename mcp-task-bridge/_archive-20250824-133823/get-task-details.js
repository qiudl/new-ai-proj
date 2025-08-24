import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function getTaskDetails(taskIds) {
  try {
    console.log('🔍 获取任务详细信息...');
    
    for (const taskId of taskIds) {
      try {
        const task = await taskServer.findTaskById(taskId);
        
        if (!task) {
          console.log(`❌ 未找到任务 ID: ${taskId}`);
          continue;
        }
        
        console.log(`\n📋 任务 ID: ${task.id}`);
        console.log(`   标题: ${task.title}`);
        console.log(`   状态: ${task.status}`);
        console.log(`   创建时间: ${task.created_at ? new Date(task.created_at).toLocaleString('zh-CN') : 'N/A'}`);
        console.log(`   父任务ID: ${task.parent_task_id || '无 (根任务)'}`);
        
        if (task.description && task.description.trim()) {
          console.log(`   描述:`);
          console.log(`   ${task.description}`);
        } else {
          console.log(`   描述: 无`);
        }
        
        if (task.estimated_hours) {
          console.log(`   预估工时: ${task.estimated_hours}小时`);
        }
        
        if (task.actual_hours && task.actual_hours > 0) {
          console.log(`   实际工时: ${task.actual_hours}小时`);
        }
        
        // 获取子任务
        try {
          const childTasks = await taskServer.getTaskChildren(taskId);
          if (childTasks && childTasks.length > 0) {
            console.log(`   子任务 (${childTasks.length}个):`);
            childTasks.forEach(child => {
              console.log(`     - ID: ${child.id}, 标题: ${child.title}, 状态: ${child.status}`);
            });
          }
        } catch (childError) {
          console.log(`   子任务: 获取失败 - ${childError.message}`);
        }
        
      } catch (error) {
        console.error(`❌ 获取任务 ${taskId} 失败:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
}

// 查找任务ID #489的详细信息
const targetTaskIds = [489];

getTaskDetails(targetTaskIds);