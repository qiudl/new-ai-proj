import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function testUpdateTask() {
  console.log('🧪 测试 update_task 功能\n');

  try {
    // 1. 先创建一个测试任务用于更新
    console.log('📝 1. 创建测试任务...');
    const createResult = await taskServer.createTask('测试更新功能的任务', 1);
    
    if (!createResult.success) {
      throw new Error(`创建测试任务失败: ${createResult.error}`);
    }
    
    const testTaskId = createResult.id;
    console.log(`✅ 创建成功: ID ${testTaskId}`);

    // 2. 测试更新不存在的任务
    console.log('\n🔍 2. 测试更新不存在的任务...');
    const updateNotFoundResult = await taskServer.updateTask(99999, { title: '新标题' });
    console.log('结果:', updateNotFoundResult.success ? '意外成功' : `❌ 预期失败: ${updateNotFoundResult.error}`);

    // 3. 测试更新标题
    console.log('\n📝 3. 测试更新任务标题...');
    const updateTitleResult = await taskServer.updateTask(testTaskId, { 
      title: '更新后的任务标题' 
    });
    
    if (updateTitleResult.success) {
      console.log(`✅ 标题更新成功: ${updateTitleResult.message}`);
      console.log(`   变更字段: [${updateTitleResult.changed_fields.join(', ')}]`);
    } else {
      console.log(`❌ 标题更新失败: ${updateTitleResult.error}`);
    }

    // 4. 测试更新状态和优先级
    console.log('\n📝 4. 测试更新状态和优先级...');
    const updateStatusResult = await taskServer.updateTask(testTaskId, { 
      status: 'in_progress',
      priority: 'high'
    });
    
    if (updateStatusResult.success) {
      console.log(`✅ 状态和优先级更新成功: ${updateStatusResult.message}`);
      console.log(`   变更字段: [${updateStatusResult.changed_fields.join(', ')}]`);
      console.log(`   新状态: ${updateStatusResult.updated_task.status}`);
      console.log(`   新优先级: ${updateStatusResult.updated_task.priority}`);
    } else {
      console.log(`❌ 状态更新失败: ${updateStatusResult.error}`);
    }

    // 5. 测试无效状态值
    console.log('\n🚫 5. 测试无效状态值...');
    const invalidStatusResult = await taskServer.updateTask(testTaskId, { 
      status: 'invalid_status' 
    });
    console.log('结果:', invalidStatusResult.success ? '意外成功' : `❌ 预期失败: ${invalidStatusResult.error}`);

    // 6. 测试无效优先级值
    console.log('\n🚫 6. 测试无效优先级值...');
    const invalidPriorityResult = await taskServer.updateTask(testTaskId, { 
      priority: 'invalid_priority' 
    });
    console.log('结果:', invalidPriorityResult.success ? '意外成功' : `❌ 预期失败: ${invalidPriorityResult.error}`);

    // 7. 测试无变更更新
    console.log('\n📝 7. 测试无变更更新...');
    const noChangeResult = await taskServer.updateTask(testTaskId, { 
      title: '更新后的任务标题'  // 相同的标题
    });
    
    if (noChangeResult.success) {
      console.log(`✅ 无变更处理正确: ${noChangeResult.message}`);
      console.log(`   变更字段数量: ${noChangeResult.changed_fields.length}`);
    } else {
      console.log(`❌ 无变更处理失败: ${noChangeResult.error}`);
    }

    // 8. 测试批量字段更新
    console.log('\n📝 8. 测试批量字段更新...');
    const bulkUpdateResult = await taskServer.updateTask(testTaskId, { 
      title: '最终更新的标题',
      description: '这是更新后的详细描述',
      status: 'completed',
      priority: 'medium'
    });
    
    if (bulkUpdateResult.success) {
      console.log(`✅ 批量更新成功: ${bulkUpdateResult.message}`);
      console.log(`   变更字段: [${bulkUpdateResult.changed_fields.join(', ')}]`);
      console.log(`   最终任务信息:`);
      console.log(`     标题: ${bulkUpdateResult.updated_task.title}`);
      console.log(`     描述: ${bulkUpdateResult.updated_task.description}`);
      console.log(`     状态: ${bulkUpdateResult.updated_task.status}`);
      console.log(`     优先级: ${bulkUpdateResult.updated_task.priority}`);
    } else {
      console.log(`❌ 批量更新失败: ${bulkUpdateResult.error}`);
    }

    // 9. 清理测试任务
    console.log('\n🗑️ 9. 清理测试任务...');
    const deleteResult = await taskServer.deleteTask(testTaskId);
    if (deleteResult.success) {
      console.log(`✅ 测试任务已清理: ${deleteResult.message}`);
    }

    console.log('\n✅ update_task 功能测试完成！');

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  }
}

testUpdateTask();