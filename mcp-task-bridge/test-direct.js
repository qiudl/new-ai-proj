#!/usr/bin/env node

import { TaskMCPServer } from './task-mcp.js';

async function testMCP() {
  console.log('🧪 测试 MCP 任务管理功能');
  console.log('================================');
  
  const taskServer = new TaskMCPServer();
  
  try {
    // 测试 1: 列出任务
    console.log('\n1️⃣ 测试获取任务列表...');
    const listResult = await taskServer.listTasks(1);
    console.log('结果:', JSON.stringify(listResult, null, 2));
    
    if (!listResult.success) {
      console.error('❌ 列表获取失败，停止测试');
      return;
    }
    
    // 测试 2: 创建子任务
    console.log('\n2️⃣ 测试创建子任务...');
    const subtaskResult = await taskServer.createSubTask(50, '录制AI自动化测试 - 测试用');
    console.log('结果:', JSON.stringify(subtaskResult, null, 2));
    
    if (subtaskResult.success) {
      console.log('✅ 测试成功！');
    } else {
      console.log('❌ 测试失败');
    }
    
  } catch (error) {
    console.error('❌ 测试出错:', error.message);
  }
}

testMCP().catch(console.error);
