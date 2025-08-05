import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function verifyTaskStructure() {
  console.log('🔍 验证任务408的结构\n');

  try {
    // 查看任务408的详细信息
    console.log('📋 查看任务408的详细信息...');
    const task408 = await taskServer.findTaskById(408);
    
    if (task408) {
      console.log(`✅ 任务408找到:`);
      console.log(`   标题: ${task408.title}`);
      console.log(`   状态: ${task408.status}`);
      console.log(`   优先级: ${task408.priority}`);
      console.log(`   项目ID: ${task408.project_id}`);
    } else {
      console.log(`❌ 未找到任务408`);
    }

    // 查看新创建的子任务
    console.log('\n📝 查看新创建的子任务 (414-418):');
    for (let taskId = 414; taskId <= 418; taskId++) {
      const task = await taskServer.findTaskById(taskId);
      
      if (task) {
        console.log(`✅ 任务${taskId}: ${task.title}`);
        console.log(`   父任务ID: ${task.parent_id || '无'}`);
        console.log(`   状态: ${task.status}`);
        console.log(`   项目ID: ${task.project_id}`);
      } else {
        console.log(`❌ 未找到任务${taskId}`);
      }
      console.log('');
    }

    // 获取任务408的子任务列表
    console.log('📋 获取任务408的子任务列表:');
    const children = await taskServer.getTaskChildren(408);
    if (children.success) {
      console.log(`✅ 找到 ${children.children.length} 个子任务:`);
      children.children.forEach(child => {
        console.log(`   - ID ${child.id}: ${child.title} (${child.status})`);
      });
    } else {
      console.log(`❌ 获取子任务失败: ${children.error}`);
    }

    console.log('\n🎉 任务结构验证完成！');

  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error.message);
  }
}

verifyTaskStructure();