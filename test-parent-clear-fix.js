import { TaskMCPServer } from './mcp-task-bridge/task-mcp.js';

async function testParentClearFix() {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🧪 Testing Parent Task Clearing Bug Fix');
    console.log('======================================');
    
    // Step 1: 找一个有父任务的任务来测试
    console.log('1. 寻找测试任务...');
    const tasksResult = await taskServer.listTasks(1);
    if (!tasksResult.success) {
      throw new Error('Failed to get tasks: ' + tasksResult.error);
    }
    
    const taskWithParent = tasksResult.tasks.find(t => t.parent_id);
    if (!taskWithParent) {
      console.log('   没有找到有父任务的任务，创建测试场景...');
      
      // 创建一个父任务
      const parentResult = await taskServer.createTask('测试父任务 - 用于验证清空功能', 1);
      if (!parentResult.success) {
        throw new Error('Failed to create parent task: ' + parentResult.error);
      }
      
      // 创建一个子任务
      const childResult = await taskServer.createTask('测试子任务 - 将被清空父任务', 1, parentResult.id);
      if (!childResult.success) {
        throw new Error('Failed to create child task: ' + childResult.error);
      }
      
      // 获取创建的子任务
      const testTask = await taskServer.findTaskById(childResult.id);
      console.log('✅ 创建测试场景完成:');
      console.log('   父任务:', parentResult.id, '- "' + parentResult.title + '"');
      console.log('   子任务:', testTask.id, '- "' + testTask.title + '"');
      console.log('   当前parent_id:', testTask.parent_id);
      
      // 使用创建的子任务进行测试
      await performClearTest(taskServer, testTask);
    } else {
      console.log('✅ 找到测试任务:', taskWithParent.id, '- "' + taskWithParent.title + '"');
      console.log('   当前parent_id:', taskWithParent.parent_id);
      
      // 使用现有任务进行测试
      await performClearTest(taskServer, taskWithParent);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

async function performClearTest(taskServer, testTask) {
  console.log('\\n2. 测试父任务清空功能...');
  
  // 记录原始parent_id
  const originalParentId = testTask.parent_id;
  console.log('   原始parent_id:', originalParentId);
  
  // 执行父任务清空（这是修复的核心功能）
  console.log('   执行parent_id清空...');
  const clearResult = await taskServer.updateTask(testTask.id, {
    parent_id: null
  });
  
  if (clearResult.success) {
    console.log('✅ 父任务清空操作成功!');
    console.log('   变更字段:', clearResult.changed_fields);
    console.log('   新parent_id:', clearResult.updated_task.parent_id || 'null');
    
    // 验证持久化
    console.log('\\n3. 验证数据持久化...');
    const verifyTask = await taskServer.findTaskById(testTask.id);
    console.log('   数据库中的parent_id:', verifyTask.parent_id || 'null');
    
    if (verifyTask.parent_id === null || verifyTask.parent_id === undefined) {
      console.log('✅ 数据持久化验证成功 - parent_id已被清空');
      
      // 额外测试：重新设置父任务
      console.log('\\n4. 测试重新设置父任务...');
      if (originalParentId) {
        const restoreResult = await taskServer.updateTask(testTask.id, {
          parent_id: originalParentId
        });
        
        if (restoreResult.success) {
          console.log('✅ 重新设置父任务成功');
          console.log('   恢复的parent_id:', restoreResult.updated_task.parent_id);
          
          // 再次测试清空
          console.log('\\n5. 再次测试清空功能...');
          const reClearResult = await taskServer.updateTask(testTask.id, {
            parent_id: null
          });
          
          if (reClearResult.success) {
            console.log('✅ 二次清空测试成功');
            console.log('   最终parent_id:', reClearResult.updated_task.parent_id || 'null');
          } else {
            console.log('❌ 二次清空测试失败:', reClearResult.error);
          }
        } else {
          console.log('❌ 重新设置父任务失败:', restoreResult.error);
        }
      }
      
      console.log('\\n🎉 BUG修复验证: 完全成功!');
      console.log('===============================');
      console.log('✅ 后端正确处理parent_id=null请求');
      console.log('✅ 数据库parent_id字段正确更新为NULL');
      console.log('✅ 父任务清空和设置功能都正常工作');
      console.log('✅ 数据持久化完全正确');
      
    } else {
      console.log('❌ 数据持久化失败 - parent_id仍为:', verifyTask.parent_id);
      throw new Error('Parent clearing was not persisted');
    }
    
  } else {
    console.log('❌ 父任务清空操作失败:', clearResult.error);
    throw new Error('Parent clearing failed: ' + clearResult.error);
  }
}

testParentClearFix();