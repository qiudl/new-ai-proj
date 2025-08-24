import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function checkTaskStructure() {
  console.log('🔍 检查任务数据结构...\n');

  try {
    // 获取任务列表查看数据结构
    const listResult = await taskServer.listTasks(1);
    
    if (listResult.success && listResult.tasks.length > 0) {
      const sampleTask = listResult.tasks[0];
      console.log('📋 任务数据结构示例:');
      console.log(JSON.stringify(sampleTask, null, 2));
      
      // 获取详细任务信息
      console.log('\n🔍 获取详细任务信息...');
      const taskId = sampleTask.id;
      
      const task = await taskServer.findTaskById(taskId);
      console.log('\n📋 完整任务信息:');
      console.log(JSON.stringify(task, null, 2));
    } else {
      console.log('❌ 未找到任务');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

checkTaskStructure();