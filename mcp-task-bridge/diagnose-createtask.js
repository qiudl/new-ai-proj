#!/usr/bin/env node
/**
 * 诊断createTask API失败原因
 */

import { TaskMCPServer } from './dist-test/task-mcp.js';

async function diagnose() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   诊断createTask API失败原因                           ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');

  // 步骤1: 登录
  console.log('步骤1: 登录系统');
  const loginResult = await server.devQuickLogin('admin');
  console.log('  登录结果:', loginResult.success ? '✓ 成功' : '✗ 失败');
  if (!loginResult.success) {
    console.log('  错误:', loginResult.error);
    return;
  }
  console.log('  Token长度:', loginResult.token?.length || 0);

  // 步骤2: 尝试创建任务
  console.log('\n步骤2: 尝试创建任务');
  console.log('  参数: title="诊断测试任务", projectId=1');

  try {
    const createResult = await server.createTask('诊断测试任务', 1, {
      description: '测试createTask API是否正常工作'
    });

    console.log('  创建结果:', createResult.success ? '✓ 成功' : '✗ 失败');

    if (createResult.success) {
      console.log('  任务ID:', createResult.data?.id);
      console.log('  任务标题:', createResult.data?.title);
      console.log('  任务状态:', createResult.data?.status);
    } else {
      console.log('  错误信息:', createResult.error);
      console.log('  完整响应:', JSON.stringify(createResult, null, 2));
    }
  } catch (error) {
    console.log('  捕获异常:', error.message);
    console.log('  异常栈:', error.stack);
  }

  // 步骤3: 检查其他API是否正常
  console.log('\n步骤3: 检查listTasks API');
  try {
    const listResult = await server.listTasks({ limit: 1 });
    console.log('  listTasks结果:', listResult.success ? '✓ 成功' : '✗ 失败');
    if (listResult.success) {
      console.log('  返回任务数:', listResult.data?.tasks?.length || 0);
    }
  } catch (error) {
    console.log('  listTasks失败:', error.message);
  }

  console.log('\n诊断完成');
}

diagnose().catch(error => {
  console.error('诊断过程失败:', error);
  process.exit(1);
});
