#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

async function createPlaywrightTask() {
  console.log('🎬 创建 Playwright 自动化测试任务');
  console.log('==================================');
  
  const taskServer = new TaskMCPServer();
  
  try {
    // 创建详细的自动化测试任务
    console.log('📝 创建子任务...');
    const result = await taskServer.createSubTask(50, '录制AI自动化测试');
    
    if (result.success) {
      console.log('✅ 任务创建成功！');
      console.log(`📋 任务ID: ${result.id}`);
      console.log(`🏷️  任务标题: ${result.title}`);
      console.log(`👥 父任务ID: ${result.parent_id}`);
      console.log(`📊 状态: ${result.status}`);
      console.log();
      console.log('📖 任务详细描述:');
      console.log('===============');
      console.log('用 Playwright 对 **测试1: create_task功能验证** 任务进行测试');
      console.log('要求录视频，登录密码 admin / password');
      console.log();
      console.log('测试步骤:');
      console.log('1) 登录后进入测试任务详情页: http://localhost/projects/1/tasks/50');
      console.log('2) 根据测试任务名，用模拟人类操作的方式去完成任务');
      console.log('3) 比如创建任务，应该在任务详情页找到创建子任务按钮');
      console.log('4) 对任务内容进行编辑，提交后查看任务');
      console.log('5) 让用户看到整个页面的变化过程，速度要放慢');
      console.log('6) 每个页面的切换停留2秒钟');
      console.log();
      console.log('✅ 任务创建完成！可以在前端界面查看');
      console.log('🌐 前端地址: http://localhost:3000/projects/1/tasks/50');
      
    } else {
      console.error('❌ 任务创建失败:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
  }
}

createPlaywrightTask().catch(console.error);
