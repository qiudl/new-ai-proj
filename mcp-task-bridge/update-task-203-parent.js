import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function updateTask203Parent() {
  console.log('🔄 更新任务203的父任务为任务200\n');

  try {
    // 1. 检查任务203和任务200的当前状态
    console.log('📋 1. 检查任务203和任务200的当前状态...');
    
    const task203 = await taskServer.findTaskById(203);
    const task200 = await taskServer.findTaskById(200);
    
    if (!task203) {
      console.log('❌ 未找到任务 ID: 203');
      return;
    }
    
    if (!task200) {
      console.log('❌ 未找到任务 ID: 200');
      return;
    }
    
    console.log(`\n📋 任务 203:`);
    console.log(`   标题: ${task203.title}`);
    console.log(`   状态: ${task203.status}`);
    console.log(`   当前父任务ID: ${task203.parent_task_id || '无 (根任务)'}`);
    
    console.log(`\n📋 任务 200:`);
    console.log(`   标题: ${task200.title}`);
    console.log(`   状态: ${task200.status}`);
    console.log(`   当前父任务ID: ${task200.parent_task_id || '无 (根任务)'}`);

    // 2. 更新任务203的parent_id为200
    console.log('\n🔄 2. 更新任务203的父任务为任务200...');
    
    const updateResult = await taskServer.updateTask(203, { 
      parent_id: 200 
    });
    
    if (updateResult.success) {
      console.log(`✅ 更新成功: ${updateResult.message}`);
      console.log(`   变更字段: [${updateResult.changed_fields.join(', ')}]`);
      
      // 3. 确认更新后的状态
      console.log('\n📋 3. 确认更新后的任务状态...');
      const updatedTask203 = await taskServer.findTaskById(203);
      
      console.log(`\n📋 更新后的任务 203:`);
      console.log(`   标题: ${updatedTask203.title}`);
      console.log(`   状态: ${updatedTask203.status}`);
      console.log(`   父任务ID: ${updatedTask203.parent_task_id || '无 (根任务)'}`);
      
      if (updatedTask203.parent_task_id === 200) {
        console.log(`\n✅ 任务203已成功设置为任务200的子任务！`);
      } else {
        console.log(`\n❌ 更新可能未生效，当前父任务ID: ${updatedTask203.parent_task_id}`);
      }
    } else {
      console.log(`❌ 更新失败: ${updateResult.error}`);
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
}

updateTask203Parent();