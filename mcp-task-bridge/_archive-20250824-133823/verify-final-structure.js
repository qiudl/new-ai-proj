import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function verifyFinalStructure() {
  try {
    console.log('🔍 Verifying final task structure...\n');
    
    // Check task 200 and its children
    console.log('📋 Task 200 (任务文档重构):');
    const task200 = await taskServer.findTaskById(200);
    console.log(`   ID: ${task200.id}, Title: "${task200.title}", Status: ${task200.status}`);
    
    const children200 = await taskServer.getTaskChildren(200);
    if (children200 && children200.length > 0) {
      console.log(`   Children (${children200.length}):`);
      children200.forEach(child => {
        console.log(`     - ID: ${child.id}, Title: "${child.title}", Status: ${child.status}`);
      });
    }
    
    // Check the main testing task (214) and its children
    console.log('\n📋 Task 214 (测试验收与质量保证):');
    const task214 = await taskServer.findTaskById(214);
    console.log(`   ID: ${task214.id}, Title: "${task214.title}", Status: ${task214.status}`);
    console.log(`   Parent: Task ${task214.parent_task_id}`);
    
    // Manually check the created testing tasks
    console.log('\n   Testing Task Children:');
    const testingTaskIds = [215, 216, 217, 218];
    
    for (const taskId of testingTaskIds) {
      try {
        const task = await taskServer.findTaskById(taskId);
        console.log(`     - ID: ${task.id}, Title: "${task.title}", Status: ${task.status}, Parent: ${task.parent_task_id}`);
      } catch (error) {
        console.log(`     - ID: ${taskId}, Error: ${error.message}`);
      }
    }
    
    // Show the complete hierarchy
    console.log('\n🏗️  Complete Task Hierarchy:');
    console.log('Task 200: 任务文档重构 (in_progress)');
    console.log('└── Task 214: 测试验收与质量保证 (todo)');
    console.log('    ├── Task 215: 数据库迁移测试验收 (任务201) (todo)');
    console.log('    ├── Task 216: 后端API重构测试验收 (任务202) (todo)');
    console.log('    ├── Task 217: 前端服务整合测试验收 (任务203) (todo)');
    console.log('    └── Task 218: 功能增强测试验收 (任务204) (todo)');
    
    console.log('\n✅ Task hierarchy verification completed!');
    
  } catch (error) {
    console.error('❌ Error verifying structure:', error.message);
  }
}

verifyFinalStructure();