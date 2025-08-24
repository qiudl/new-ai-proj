import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function findTask200() {
  try {
    console.log('🔍 Searching for task 200...');
    
    // Try to find task 200 directly
    const task200 = await taskServer.findTaskById(200);
    
    if (task200) {
      console.log('✅ Found task 200:');
      console.log(`   ID: ${task200.id}`);
      console.log(`   标题: ${task200.title}`);
      console.log(`   状态: ${task200.status}`);
      console.log(`   父任务ID: ${task200.parent_task_id || '无 (根任务)'}`);
      console.log(`   项目ID: ${task200.project_id}`);
      
      if (task200.description && task200.description.trim()) {
        console.log(`   描述: ${task200.description}`);
      }
      
      // Get children of task 200
      try {
        const children = await taskServer.getTaskChildren(200);
        if (children && children.length > 0) {
          console.log(`\n📋 Children of task 200 (${children.length} children):`);
          children.forEach(child => {
            console.log(`   - ID: ${child.id}, 标题: "${child.title}", 状态: ${child.status}`);
          });
        } else {
          console.log('\n📋 Task 200 has no children');
        }
      } catch (childError) {
        console.error('❌ Failed to get children:', childError.message);
      }
    } else {
      console.log('❌ Task 200 not found');
      
      // Get all tasks and show nearby tasks
      console.log('\n🔍 Searching for tasks near ID 200...');
      const allTasks = await taskServer.getAllTasks();
      const nearbyTasks = allTasks.filter(task => task.id >= 195 && task.id <= 205);
      
      if (nearbyTasks.length > 0) {
        console.log('📋 Tasks near ID 200:');
        nearbyTasks.forEach(task => {
          console.log(`   - ID: ${task.id}, 标题: "${task.title}", 状态: ${task.status}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findTask200();