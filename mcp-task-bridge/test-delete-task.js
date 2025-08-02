import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function testDeleteTask() {
  console.log('🧪 测试 delete_task 功能\n');

  try {
    // 1. 先创建一个测试任务用于删除
    console.log('📝 1. 创建测试任务...');
    const createResult = await taskServer.createTask('测试删除功能的任务', 1);
    
    if (!createResult.success) {
      throw new Error(`创建测试任务失败: ${createResult.error}`);
    }
    
    const testTaskId = createResult.id;
    console.log(`✅ 创建成功: ID ${testTaskId}`);

    // 2. 测试删除不存在的任务
    console.log('\n🔍 2. 测试删除不存在的任务...');
    const deleteNotFoundResult = await taskServer.deleteTask(99999);
    console.log('结果:', deleteNotFoundResult.success ? '意外成功' : `❌ 预期失败: ${deleteNotFoundResult.error}`);

    // 3. 创建子任务用于测试级联删除
    console.log('\n📝 3. 为测试任务创建子任务...');
    const subTaskResult = await taskServer.createSubTask(testTaskId, '测试子任务');
    
    if (!subTaskResult.success) {
      throw new Error(`创建子任务失败: ${subTaskResult.error}`);
    }
    
    const subTaskId = subTaskResult.id;
    console.log(`✅ 子任务创建成功: ID ${subTaskId}`);

    // 4. 测试删除有子任务的父任务（不使用force）
    console.log('\n🚫 4. 测试删除有子任务的父任务（不使用force）...');
    const deleteWithChildrenResult = await taskServer.deleteTask(testTaskId);
    console.log('结果:', deleteWithChildrenResult.success ? '意外成功' : `❌ 预期失败: ${deleteWithChildrenResult.error}`);
    if (deleteWithChildrenResult.child_count) {
      console.log(`   发现 ${deleteWithChildrenResult.child_count} 个子任务`);
    }

    // 5. 测试强制删除（包含子任务）
    console.log('\n💥 5. 测试强制删除（包含子任务）...');
    const forceDeleteResult = await taskServer.deleteTask(testTaskId, true);
    
    if (forceDeleteResult.success) {
      console.log(`✅ 删除成功: ${forceDeleteResult.message}`);
      console.log(`   删除的任务: ${forceDeleteResult.deleted_task_id}`);
      console.log(`   删除的子任务: [${forceDeleteResult.affected_subtasks.join(', ')}]`);
    } else {
      console.log(`❌ 删除失败: ${forceDeleteResult.error}`);
    }

    // 6. 验证任务确实被删除
    console.log('\n🔍 6. 验证任务是否被删除...');
    const verifyResult = await taskServer.findTaskByName('测试删除功能');
    console.log(`   找到 ${verifyResult.total} 个匹配的任务`);

    console.log('\n✅ delete_task 功能测试完成！');

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  }
}

testDeleteTask();