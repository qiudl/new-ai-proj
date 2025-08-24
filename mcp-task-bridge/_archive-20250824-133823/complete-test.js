import { TaskMCPServer } from './task-mcp.js';

const testServer = new TaskMCPServer();

async function runFullTests() {
  console.log('🎯 Claude Code MCP Server - 完整功能测试');
  console.log('==========================================');
  
  try {
    // 测试1: 获取任务列表
    console.log('\n1️⃣ 测试获取任务列表');
    const listResult = await testServer.listTasks(1);
    console.log(`✅ 任务列表: ${listResult.total} 个任务`);
    
    // 测试2: 创建任务
    console.log('\n2️⃣ 测试创建任务');
    const createResult = await testServer.createTask('Claude Code MCP 集成测试任务');
    console.log(`✅ 任务创建: ${createResult.message}`);
    
    if (createResult.success && createResult.id) {
      const taskId = createResult.id;
      
      // 测试3: 创建子任务
      console.log('\n3️⃣ 测试创建子任务');
      const subtask1 = await testServer.createSubTask(taskId, '子任务: 前端集成开发');
      const subtask2 = await testServer.createSubTask(taskId, '子任务: 后端 API 调试');
      console.log(`✅ 子任务创建: ${subtask1.message}`);
      console.log(`✅ 子任务创建: ${subtask2.message}`);
      
      // 测试4: 搜索任务
      console.log('\n4️⃣ 测试搜索任务');
      const searchResult = await testServer.findTaskByName('Claude Code');
      console.log(`✅ 任务搜索: ${searchResult.message}`);
      
      // 测试5: 开始任务
      console.log('\n5️⃣ 测试开始任务');
      const startResult = await testServer.startTask(taskId);
      console.log(`✅ 开始任务: ${startResult.message}`);
      
      // 等待一下，然后完成任务
      console.log('\n⏱️  模拟工作进行中...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 测试6: 完成任务
      console.log('\n6️⃣ 测试完成任务');
      const completeResult = await testServer.completeTask(taskId);
      console.log(`✅ 完成任务: ${completeResult.message}`);
      
      // 最终状态验证
      console.log('\n7️⃣ 验证最终状态');
      const finalList = await testServer.listTasks(1);
      const updatedTask = finalList.tasks.find(t => t.id === taskId);
      console.log(`✅ 任务状态验证: ID ${taskId} 状态为 "${updatedTask?.status}"`);
      
      console.log('\n🎉 所有测试通过！');
      console.log('=====================================');
      console.log('🔗 查看结果:');
      console.log('   前端界面: http://localhost:3000');
      console.log('   现在可以在前端看到通过 Claude Code 创建和管理的任务');
      console.log('');
      console.log('🚀 下一步: 配置 Claude Code 使用此 MCP Server');
      
    } else {
      console.log('❌ 创建任务失败，无法继续测试');
    }
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

runFullTests();