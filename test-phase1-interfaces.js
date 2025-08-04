#!/usr/bin/env node

/**
 * Phase 1 接口测试脚本
 * 测试新增的7个接口功能
 */

const { TaskMCPServer } = require('./mcp-task-bridge/task-mcp.js');

async function testPhase1Interfaces() {
  console.log('🚀 开始测试 Phase 1 接口...\n');
  
  const taskServer = new TaskMCPServer();
  
  try {
    // 1. 测试查看项目列表
    console.log('1️⃣ 测试 list_projects...');
    const projectsResult = await taskServer.listProjects();
    console.log('   结果:', projectsResult.message);
    if (projectsResult.success) {
      console.log('   项目数量:', projectsResult.total);
      projectsResult.projects.forEach(p => {
        console.log(`   - 项目 ${p.id}: ${p.name}`);
      });
    }
    console.log();

    // 2. 测试创建新项目
    console.log('2️⃣ 测试 create_project...');
    const newProjectResult = await taskServer.createProject(
      'Phase 1 测试项目', 
      '用于测试 Phase 1 新接口功能的项目'
    );
    console.log('   结果:', newProjectResult.message);
    const testProjectId = newProjectResult.success ? newProjectResult.id : 1;
    console.log();

    // 3. 测试创建测试任务
    console.log('3️⃣ 创建测试任务...');
    const taskResult = await taskServer.createTask('Phase 1 测试任务', testProjectId);
    console.log('   结果:', taskResult.message);
    const testTaskId = taskResult.success ? taskResult.id : null;
    
    if (!testTaskId) {
      console.log('❌ 无法创建测试任务，跳过后续测试');
      return;
    }
    console.log();

    // 4. 测试创建子任务
    console.log('4️⃣ 创建子任务...');
    const subtaskResult = await taskServer.createSubTask(testTaskId, 'Phase 1 子任务测试');
    console.log('   结果:', subtaskResult.message);
    const subtaskId = subtaskResult.success ? subtaskResult.id : null;
    console.log();

    // 5. 测试获取任务子任务
    console.log('5️⃣ 测试 get_task_children...');
    const childrenResult = await taskServer.getTaskChildren(testTaskId);
    console.log('   结果:', childrenResult.message);
    if (childrenResult.success) {
      childrenResult.children.forEach(child => {
        console.log(`   - 子任务 ${child.id}: ${child.title} [${child.status}]`);
      });
    }
    console.log();

    // 6. 测试开始计时
    console.log('6️⃣ 测试 start_timer...');
    const startTimerResult = await taskServer.startTimer(testTaskId, 'Phase 1 计时测试');
    console.log('   结果:', startTimerResult.message);
    console.log();

    // 7. 测试获取当前计时状态
    console.log('7️⃣ 测试 get_current_timer...');
    const currentTimerResult = await taskServer.getCurrentTimer();
    console.log('   结果:', currentTimerResult.message);
    if (currentTimerResult.success && currentTimerResult.active_timers.length > 0) {
      currentTimerResult.active_timers.forEach(timer => {
        console.log(`   - 计时中: 任务 ${timer.task_id} "${timer.task_title}" - ${timer.current_duration_formatted}`);
      });
    }
    console.log();

    // 8. 等待2秒后停止计时
    console.log('⏳ 等待2秒...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('8️⃣ 测试 stop_timer...');
    const stopTimerResult = await taskServer.stopTimer(testTaskId);
    console.log('   结果:', stopTimerResult.message);
    console.log();

    // 9. 测试暂停任务
    console.log('9️⃣ 测试 pause_task...');
    const pauseResult = await taskServer.pauseTask(testTaskId);
    console.log('   结果:', pauseResult.message);
    console.log();

    // 10. 清理 - 删除测试任务
    console.log('🧹 清理测试数据...');
    if (subtaskId) {
      const deleteSubtaskResult = await taskServer.deleteTask(subtaskId);
      console.log('   删除子任务:', deleteSubtaskResult.message);
    }
    
    const deleteTaskResult = await taskServer.deleteTask(testTaskId);
    console.log('   删除测试任务:', deleteTaskResult.message);
    console.log();

    console.log('✅ Phase 1 接口测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  testPhase1Interfaces()
    .then(() => {
      console.log('\n🎉 测试脚本执行完毕');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 测试脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { testPhase1Interfaces };
