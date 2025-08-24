import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function testMoveTask() {
  console.log('🧪 测试move_task功能\n');

  try {
    // 1. 创建一个测试任务
    console.log('📝 1. 创建测试任务...');
    const createResult = await taskServer.createTask('测试移动任务功能', 1);
    
    if (!createResult.success) {
      console.log(`❌ 创建任务失败: ${createResult.error}`);
      return;
    }
    
    console.log(`✅ 任务创建成功: ${createResult.message}`);
    const taskId = createResult.id;
    
    // 2. 测试移动到不存在的项目
    console.log('\n📦 2. 测试移动到不存在的项目...');
    const moveToNonExistentResult = await taskServer.moveTask(taskId, 999);
    console.log(moveToNonExistentResult.success ? 
      `✅ ${moveToNonExistentResult.message}` : 
      `❌ 预期错误: ${moveToNonExistentResult.error}`);
    
    // 3. 测试移动到同一个项目
    console.log('\n📦 3. 测试移动到同一个项目...');
    const moveToSameProjectResult = await taskServer.moveTask(taskId, 1);
    console.log(moveToSameProjectResult.success ? 
      `✅ ${moveToSameProjectResult.message}` : 
      `❌ 预期错误: ${moveToSameProjectResult.error}`);
    
    // 4. 测试正常移动（使用项目34）
    console.log('\n📦 4. 测试移动到项目34...');
    const moveResult = await taskServer.moveTask(taskId, 34);
    
    if (moveResult.success) {
      console.log(`✅ 移动成功: ${moveResult.message}`);
      console.log(`   原任务ID: ${moveResult.original_task_id}`);
      console.log(`   新任务ID: ${moveResult.new_task_id}`);
      console.log(`   源项目: ${moveResult.source_project_id}`);
      console.log(`   目标项目: ${moveResult.target_project_id}`);
      
      // 5. 验证任务确实移动了
      console.log('\n🔍 5. 验证任务移动结果...');
      const project34Tasks = await taskServer.listTasks(34);
      const foundTask = project34Tasks.tasks?.find(t => t.id === moveResult.new_task_id);
      
      if (foundTask) {
        console.log(`✅ 任务确实在项目34中找到: "${foundTask.title}"`);
        
        // 6. 清理：删除移动后的任务
        console.log('\n🗑️ 6. 清理测试任务...');
        const deleteResult = await taskServer.deleteTask(moveResult.new_task_id);
        console.log(deleteResult.success ? 
          `✅ 清理完成: ${deleteResult.message}` : 
          `⚠️ 清理失败: ${deleteResult.error}`);
      } else {
        console.log('❌ 任务在目标项目中未找到');
      }
    } else {
      console.log(`❌ 移动失败: ${moveResult.error}`);
      
      // 清理原任务
      console.log('\n🗑️ 清理原任务...');
      const deleteResult = await taskServer.deleteTask(taskId);
      console.log(deleteResult.success ? 
        `✅ 清理完成: ${deleteResult.message}` : 
        `⚠️ 清理失败: ${deleteResult.error}`);
    }
    
    // 7. 测试移动有子任务的任务
    console.log('\n👨‍👩‍👧‍👦 7. 测试移动有子任务的任务...');
    const parentTaskResult = await taskServer.createTask('有子任务的父任务', 1);
    if (parentTaskResult.success) {
      const subTaskResult = await taskServer.createSubTask(parentTaskResult.id, '子任务');
      if (subTaskResult.success) {
        const moveWithChildrenResult = await taskServer.moveTask(parentTaskResult.id, 34);
        console.log(moveWithChildrenResult.success ? 
          `✅ ${moveWithChildrenResult.message}` : 
          `❌ 预期错误: ${moveWithChildrenResult.error}`);
        
        // 清理
        const deleteSubResult = await taskServer.deleteTask(subTaskResult.id);
        const deleteParentResult = await taskServer.deleteTask(parentTaskResult.id);
        console.log('✅ 清理完成');
      }
    }
    
    console.log('\n✅ move_task功能测试完成！');

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  }
}

testMoveTask();