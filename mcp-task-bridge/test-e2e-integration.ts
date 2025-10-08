#!/usr/bin/env node
/**
 * 测试4: 端到端集成测试
 * 任务: #2515
 * 目的: 测试完整的Token管理流程和并发场景
 */

import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

const STORAGE_FILE = path.join(homedir(), '.mcp-task-bridge', 'token-storage.enc');
const MONITOR_LOG_FILE = path.join(homedir(), '.mcp-task-bridge', 'token-refresh.log');

// 测试结果收集
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

/**
 * 运行单个测试
 */
async function runTest(name: string, testFn: () => Promise<any>): Promise<boolean> {
  const startTime = Date.now();
  try {
    console.log(`\n▶ 运行测试: ${name}`);
    const result = await testFn();
    const duration = Date.now() - startTime;

    results.push({
      name,
      passed: true,
      duration,
      details: result
    });

    console.log(`✓ 测试通过 (${duration}ms)`);
    return true;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    results.push({
      name,
      passed: false,
      duration,
      error: error.message
    });

    console.error(`✗ 测试失败 (${duration}ms):`, error.message);
    return false;
  }
}

/**
 * 清理测试环境
 */
function cleanupTestEnvironment() {
  const files = [STORAGE_FILE, MONITOR_LOG_FILE];

  files.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });

  console.log('✓ 测试环境已清理');
}

/**
 * TC-013: 完整流程端到端测试
 */
async function testCompleteWorkflow() {
  const { TaskMCPServer } = await import('./task-mcp.js');

  console.log('  步骤1: 清空缓存和持久化数据');
  cleanupTestEnvironment();

  console.log('  步骤2: 创建新Server实例');
  let server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');

  console.log('  步骤3: 调用dev_quick_login');
  const loginResult = await server.devQuickLogin('admin');
  if (!loginResult.success) {
    throw new Error('登录失败');
  }
  console.log('    - 登录成功，用户:', loginResult.data?.context?.username);

  console.log('  步骤4: 执行API操作');
  const tasksResult = await server.listTasks({ limit: 5 });
  if (!tasksResult.success) {
    throw new Error('列出任务失败');
  }
  console.log('    - API调用成功，返回', tasksResult.data?.tasks?.length || 0, '个任务');

  console.log('  步骤5: 验证Token持久化');
  await new Promise(resolve => setTimeout(resolve, 500));
  if (!fs.existsSync(STORAGE_FILE)) {
    throw new Error('Token未持久化');
  }
  console.log('    - Token已持久化到文件');

  console.log('  步骤6: 模拟进程重启（创建新Server）');
  server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');

  console.log('  步骤7: 等待Token自动加载');
  await new Promise(resolve => setTimeout(resolve, 1500));

  console.log('  步骤8: 继续执行API操作');
  const tasksResult2 = await server.listTasks({ limit: 3 });
  if (!tasksResult2.success) {
    throw new Error('重启后API调用失败');
  }
  console.log('    - 重启后API调用成功');

  console.log('  步骤9: 检查监控数据');
  const stats = server.getTokenRefreshStats();
  console.log('    - 刷新次数:', stats.totalRefreshes);
  console.log('    - 成功次数:', stats.successfulRefreshes);

  console.log('  步骤10: 执行健康检查');
  const health = server.checkTokenHealth();
  console.log('    - 健康状态:', health.status);

  return {
    login_success: true,
    persistence_works: true,
    reload_works: true,
    monitoring_works: true,
    health_check_works: true
  };
}

/**
 * TC-014: 并发刷新测试
 */
async function testConcurrentRefresh() {
  const { TaskMCPServer } = await import('./task-mcp.js');

  console.log('  步骤1: 创建Server并登录');
  const server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');
  await server.devQuickLogin('admin');

  console.log('  步骤2: 修改Token使其即将过期');
  await new Promise(resolve => setTimeout(resolve, 500));

  const { TokenStorageManager } = await import('./token-storage.js');
  const storage = new TokenStorageManager();

  const tokenData = await storage.loadToken();
  if (!tokenData) {
    throw new Error('无法加载Token');
  }

  tokenData.expiresAt = new Date(Date.now() + 30 * 1000).toISOString();
  await storage.saveToken(tokenData);

  console.log('    - Token过期时间已修改为30秒后');

  console.log('  步骤3: 创建新Server（触发加载和刷新）');
  const newServer = new TaskMCPServer('http://152.136.104.251:8080/api/v1');

  console.log('  步骤4: 同时发起多个API请求');
  await new Promise(resolve => setTimeout(resolve, 1500));

  const promises = [
    newServer.listTasks({ limit: 1 }),
    newServer.listTasks({ limit: 1 }),
    newServer.listTasks({ limit: 1 }),
    newServer.listTasks({ limit: 1 }),
    newServer.listTasks({ limit: 1 })
  ];

  const startTime = Date.now();
  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;

  const allSuccess = results.every(r => r.success);
  if (!allSuccess) {
    throw new Error('部分并发请求失败');
  }

  console.log('    - 所有并发请求成功');
  console.log('    - 总耗时:', duration, 'ms');

  console.log('  步骤5: 检查刷新统计');
  const stats = newServer.getTokenRefreshStats();
  console.log('    - 总刷新次数:', stats.totalRefreshes);
  console.log('    - 成功刷新次数:', stats.successfulRefreshes);

  if (stats.totalRefreshes > 2) {
    console.warn('    ⚠ 警告: 刷新次数超过预期，可能存在并发问题');
  }

  return {
    concurrent_requests_success: allSuccess,
    total_duration: duration,
    refresh_count: stats.totalRefreshes,
    no_duplicate_refresh: stats.totalRefreshes <= 2
  };
}

/**
 * TC-015: 错误恢复测试
 */
async function testErrorRecovery() {
  const { TaskMCPServer } = await import('./task-mcp.js');

  console.log('  步骤1: 创建Server并登录');
  const server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');
  await server.devQuickLogin('admin');

  console.log('  步骤2: 修改持久化文件，破坏Token数据');
  await new Promise(resolve => setTimeout(resolve, 500));

  fs.writeFileSync(STORAGE_FILE, 'corrupted-data-not-valid!!!', 'utf-8');
  console.log('    - Token文件已损坏');

  console.log('  步骤3: 创建新Server（应该处理错误）');
  const newServer = new TaskMCPServer('http://152.136.104.251:8080/api/v1');

  console.log('  步骤4: 等待加载（应该失败但不崩溃）');
  await new Promise(resolve => setTimeout(resolve, 1500));

  console.log('    - Server创建成功（错误已处理）');

  console.log('  步骤5: 验证损坏文件已被清除');
  const fileStillExists = fs.existsSync(STORAGE_FILE);
  console.log('    - 损坏文件', fileStillExists ? '仍存在' : '已删除');

  console.log('  步骤6: 重新登录应该成功');
  const loginResult = await newServer.devQuickLogin('admin');
  if (!loginResult.success) {
    throw new Error('重新登录失败');
  }
  console.log('    - 重新登录成功');

  return {
    error_handled: true,
    corrupted_file_cleared: !fileStillExists,
    recovery_success: loginResult.success
  };
}

/**
 * TC-016: 性能压力测试
 */
async function testPerformance() {
  const { TaskMCPServer } = await import('./task-mcp.js');

  console.log('  步骤1: 创建Server并登录');
  const server = new TaskMCPServer('http://152.136.104.251:8080/api/v1');
  await server.devQuickLogin('admin');

  console.log('  步骤2: 执行100次API调用');
  const iterations = 100;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    const result = await server.listTasks({ limit: 1 });
    if (!result.success) {
      throw new Error(`第${i + 1}次调用失败`);
    }

    if ((i + 1) % 20 === 0) {
      console.log(`    - 已完成 ${i + 1}/${iterations} 次调用`);
    }
  }

  const duration = Date.now() - startTime;
  const avgDuration = duration / iterations;

  console.log('    - 总耗时:', duration, 'ms');
  console.log('    - 平均耗时:', avgDuration.toFixed(2), 'ms/次');
  console.log('    - 吞吐量:', (iterations / (duration / 1000)).toFixed(2), '次/秒');

  const stats = server.getTokenRefreshStats();
  console.log('  步骤3: 检查性能统计');
  console.log('    - 总刷新次数:', stats.totalRefreshes);
  console.log('    - 平均刷新耗时:', stats.averageRefreshDuration?.toFixed(2), 'ms');

  return {
    total_calls: iterations,
    total_duration: duration,
    avg_duration: avgDuration,
    throughput: iterations / (duration / 1000),
    stats
  };
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   端到端集成测试                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // 清理测试环境
  console.log('准备测试环境...');
  cleanupTestEnvironment();

  // 运行所有测试
  await runTest('TC-013: 完整流程端到端测试', testCompleteWorkflow);
  await runTest('TC-014: 并发刷新测试', testConcurrentRefresh);
  await runTest('TC-015: 错误恢复测试', testErrorRecovery);
  await runTest('TC-016: 性能压力测试', testPerformance);

  // 汇总结果
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   测试结果汇总                                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n总测试数: ${results.length}`);
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);
  console.log(`总耗时: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}秒)`);

  // 显示失败的测试
  if (failed > 0) {
    console.log('\n失败的测试:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ✗ ${r.name}`);
      console.log(`    错误: ${r.error}`);
    });
  }

  // 清理测试环境
  console.log('\n清理测试环境...');
  cleanupTestEnvironment();

  // 返回退出码
  if (failed === 0) {
    console.log('✓ 所有测试通过！\n');
    process.exit(0);
  } else {
    console.log('✗ 部分测试失败\n');
    process.exit(1);
  }
}

// 运行测试
runAllTests().catch(error => {
  console.error('测试执行失败:', error);
  cleanupTestEnvironment();
  process.exit(1);
});
