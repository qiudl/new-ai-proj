import { TaskMCPServer } from './task-mcp.js';

const taskServer = new TaskMCPServer();

async function testDefaults() {
  console.log('🧪 测试默认值设置\n');

  try {
    // 1. 测试创建任务的默认值
    console.log('📝 1. 测试创建任务的默认值...');
    const createResult = await taskServer.createTask('测试默认值的任务', 1);
    
    if (createResult.success) {
      console.log(`✅ 任务创建成功: ${createResult.message}`);
      console.log(`   任务ID: ${createResult.id}`);
      console.log(`   默认状态: ${createResult.status}`);
      console.log(`   默认优先级: ${createResult.priority}`);
      
      const taskId = createResult.id;
      
      // 2. 测试创建子任务的默认值
      console.log('\n📝 2. 测试创建子任务的默认值...');
      const subTaskResult = await taskServer.createSubTask(taskId, '测试默认值的子任务');
      
      if (subTaskResult.success) {
        console.log(`✅ 子任务创建成功: ${subTaskResult.message}`);
        console.log(`   子任务ID: ${subTaskResult.id}`);
        console.log(`   默认状态: ${subTaskResult.status}`);
        console.log(`   默认优先级: ${subTaskResult.priority}`);
        
        // 3. 清理测试任务
        console.log('\n🗑️ 3. 清理测试任务...');
        const deleteSubResult = await taskServer.deleteTask(subTaskResult.id);
        const deleteMainResult = await taskServer.deleteTask(taskId);
        
        if (deleteSubResult.success && deleteMainResult.success) {
          console.log('✅ 测试任务已清理');
        }
      } else {
        console.log(`❌ 子任务创建失败: ${subTaskResult.error}`);
      }
      
    } else {
      console.log(`❌ 任务创建失败: ${createResult.error}`);
    }

    console.log('\n✅ 默认值测试完成！');

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  }
}

testDefaults();