import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function findTasks201to204() {
  try {
    console.log('🔍 Searching for tasks 201-204...');
    
    for (let taskId = 201; taskId <= 204; taskId++) {
      try {
        const task = await taskServer.findTaskById(taskId);
        
        if (task) {
          console.log(`\n✅ Found task ${taskId}:`);
          console.log(`   标题: ${task.title}`);
          console.log(`   状态: ${task.status}`);
          console.log(`   父任务ID: ${task.parent_task_id || '无 (根任务)'}`);
          console.log(`   项目ID: ${task.project_id}`);
          
          if (task.description && task.description.trim()) {
            console.log(`   描述: ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}`);
          }
        } else {
          console.log(`❌ Task ${taskId} not found`);
        }
      } catch (error) {
        console.log(`❌ Error finding task ${taskId}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findTasks201to204();