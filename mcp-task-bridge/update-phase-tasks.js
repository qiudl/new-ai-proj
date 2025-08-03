import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function updatePhaseTasks() {
  console.log('🔄 更新任务状态：Phase 1 完成，Phase 2 开始\n');

  try {
    // 1. 更新任务 221 (Phase 1: 基础迁移) 为 completed
    console.log('📝 1. 更新任务 221 (Phase 1: 基础迁移) 为 completed...');
    const phase1Result = await taskServer.updateTask(221, { 
      status: 'completed'
    });
    
    if (phase1Result.success) {
      console.log(`✅ Phase 1 任务更新成功: ${phase1Result.message}`);
      console.log(`   变更字段: [${phase1Result.changed_fields.join(', ')}]`);
      console.log(`   新状态: ${phase1Result.updated_task.status}`);
      console.log(`   任务标题: ${phase1Result.updated_task.title}`);
    } else {
      console.log(`❌ Phase 1 任务更新失败: ${phase1Result.error}`);
      return;
    }

    // 2. 更新任务 222 (Phase 2: 布局优化) 为 in_progress
    console.log('\n📝 2. 更新任务 222 (Phase 2: 布局优化) 为 in_progress...');
    const phase2Result = await taskServer.updateTask(222, { 
      status: 'in_progress'
    });
    
    if (phase2Result.success) {
      console.log(`✅ Phase 2 任务更新成功: ${phase2Result.message}`);
      console.log(`   变更字段: [${phase2Result.changed_fields.join(', ')}]`);
      console.log(`   新状态: ${phase2Result.updated_task.status}`);
      console.log(`   任务标题: ${phase2Result.updated_task.title}`);
    } else {
      console.log(`❌ Phase 2 任务更新失败: ${phase2Result.error}`);
      return;
    }

    // 3. 验证更新结果
    console.log('\n🔍 3. 验证任务状态更新...');
    console.log('   任务状态更新已完成，具体状态如上所示')

    console.log('\n✅ 任务状态更新完成！');
    console.log('\n📋 更新总结:');
    console.log('   • Phase 1 (任务 221): 已标记为完成 ✓');
    console.log('   • Phase 2 (任务 222): 已开始进行 🚀');

  } catch (error) {
    console.error('\n❌ 更新过程中发生错误:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行更新
updatePhaseTasks();