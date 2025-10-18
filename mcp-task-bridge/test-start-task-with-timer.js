#!/usr/bin/env node

/**
 * 测试 start_task_with_timer 功能
 * 直接调用 TaskMCPServer 方法，不通过 MCP 协议
 */

import { TaskMCPServer } from './dist/task-mcp.js';

async function test() {
  console.log('='.repeat(60));
  console.log('测试 start_task_with_timer 功能');
  console.log('='.repeat(60));

  // 创建服务器实例
  const server = new TaskMCPServer('http://localhost:8080/api/v1');

  console.log('\n1. 执行开发环境快速登录...');
  const loginResult = await server.devQuickLogin('admin');
  console.log('登录结果:', JSON.stringify(loginResult, null, 2));

  if (!loginResult.success) {
    console.error('❌ 登录失败，退出测试');
    process.exit(1);
  }

  console.log('\n2. 测试 startTaskWithTimer (使用任务ID)...');
  const result1 = await server.startTaskWithTimer(2578, 'Phase 2: 知识点管理API开发 - 直接测试', 1);
  console.log('结果1:', JSON.stringify(result1, null, 2));

  console.log('\n3. 测试 startTaskWithTimer (使用任务标题)...');
  const result2 = await server.startTaskWithTimer('Phase 2', '测试标题匹配 - 直接测试', 1);
  console.log('结果2:', JSON.stringify(result2, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

test().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
