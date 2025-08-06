import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function verifyTask632() {
  try {
    console.log('🔍 验证任务632的创建结果...');
    
    const task = await taskServer.findTaskById(632);
    console.log('\n✅ 任务创建成功！');
    console.log('📋 任务详情:');
    console.log(`   ID: ${task.id}`);
    console.log(`   标题: ${task.title}`);
    console.log(`   状态: ${task.status}`);
    console.log(`   优先级: ${task.custom_fields?.priority || '未设置'}`);
    console.log(`   父任务ID: ${task.parent_task_id || '无'}`);
    console.log(`   项目ID: ${task.project_id}`);
    console.log(`   创建时间: ${task.created_at}`);
    
    if (task.parent_task_id) {
      const parentTask = await taskServer.findTaskById(task.parent_task_id);
      console.log(`   父任务标题: ${parentTask.title}`);
    }
    
    if (task.description) {
      console.log(`\n📝 任务描述预览:`);
      console.log(task.description.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  }
}

verifyTask632();