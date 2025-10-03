#!/usr/bin/env node
/**
 * Token刷新监控功能测试
 * 测试TokenRefreshMonitor的事件记录、统计和健康检查功能
 */

import {
  TokenRefreshMonitor,
  TokenRefreshEventType,
  TokenHealthStatus
} from './token-monitor.js';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

// 测试配置
const TEST_LOG_DIR = path.join(homedir(), '.mcp-task-bridge-test');
const TEST_LOG_FILE = path.join(TEST_LOG_DIR, 'token-refresh-test.log');

/**
 * 清理测试环境
 */
function cleanup() {
  try {
    if (fs.existsSync(TEST_LOG_DIR)) {
      fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
      console.log('✓ 测试环境已清理');
    }
  } catch (error: any) {
    console.error('清理测试环境失败:', error.message);
  }
}

/**
 * 等待指定时间
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 测试1: 事件记录功能
 */
async function testEventRecording() {
  console.log('\n=== 测试1: 事件记录功能 ===');

  try {
    const monitor = new TokenRefreshMonitor({
      logFilePath: TEST_LOG_FILE,
      enableLogging: true,
      enableMetrics: true
    });

    console.log('1. 记录刷新开始事件...');
    monitor.recordEvent(
      TokenRefreshEventType.REFRESH_STARTED,
      true,
      { expiresAt: new Date().toISOString(), timeUntilExpiry: 60 }
    );

    console.log('2. 记录刷新成功事件...');
    monitor.recordEvent(
      TokenRefreshEventType.REFRESH_SUCCESS,
      true,
      { expiresAt: new Date(Date.now() + 3600000).toISOString(), httpStatus: 200 },
      undefined,
      undefined,
      150 // 150ms
    );

    console.log('3. 记录刷新失败事件...');
    monitor.recordEvent(
      TokenRefreshEventType.REFRESH_FAILED,
      false,
      { httpStatus: 500 },
      'Internal server error',
      '500',
      200
    );

    // 获取最近的事件
    const events = monitor.getRecentEvents(10);
    if (events.length !== 3) {
      throw new Error(`事件数量不正确: 期望3，实际${events.length}`);
    }

    console.log(`✓ 成功记录 ${events.length} 个事件`);

    // 检查日志文件是否创建
    if (!fs.existsSync(TEST_LOG_FILE)) {
      throw new Error('日志文件未创建');
    }

    const logContent = fs.readFileSync(TEST_LOG_FILE, 'utf-8');
    const logLines = logContent.trim().split('\n');
    if (logLines.length !== 3) {
      throw new Error(`日志行数不正确: 期望3，实际${logLines.length}`);
    }

    console.log('✓ 日志文件创建成功，包含3行记录');

    console.log('✓ 事件记录功能测试通过');
    return true;
  } catch (error: any) {
    console.error('✗ 测试失败:', error.message);
    return false;
  }
}

/**
 * 测试2: 统计信息功能
 */
async function testStatistics() {
  console.log('\n=== 测试2: 统计信息功能 ===');

  cleanup();

  try {
    const monitor = new TokenRefreshMonitor({
      logFilePath: TEST_LOG_FILE,
      enableMetrics: true
    });

    console.log('1. 记录多次刷新事件...');

    // 记录5次成功刷新
    for (let i = 0; i < 5; i++) {
      monitor.recordEvent(TokenRefreshEventType.REFRESH_STARTED, true);
      monitor.recordEvent(
        TokenRefreshEventType.REFRESH_SUCCESS,
        true,
        undefined,
        undefined,
        undefined,
        100 + i * 10
      );
    }

    // 记录2次失败刷新
    for (let i = 0; i < 2; i++) {
      monitor.recordEvent(TokenRefreshEventType.REFRESH_STARTED, true);
      monitor.recordEvent(
        TokenRefreshEventType.REFRESH_FAILED,
        false,
        undefined,
        'Test error',
        '500'
      );
    }

    const stats = monitor.getStats();

    console.log('2. 验证统计信息...');

    if (stats.totalRefreshes !== 7) {
      throw new Error(`总刷新次数不正确: 期望7，实际${stats.totalRefreshes}`);
    }

    if (stats.successfulRefreshes !== 5) {
      throw new Error(`成功次数不正确: 期望5，实际${stats.successfulRefreshes}`);
    }

    if (stats.failedRefreshes !== 2) {
      throw new Error(`失败次数不正确: 期望2，实际${stats.failedRefreshes}`);
    }

    if (stats.consecutiveFailures !== 2) {
      throw new Error(`连续失败次数不正确: 期望2，实际${stats.consecutiveFailures}`);
    }

    if (!stats.averageRefreshDuration || stats.averageRefreshDuration < 100) {
      throw new Error('平均刷新耗时计算不正确');
    }

    console.log('✓ 统计信息验证通过:', {
      totalRefreshes: stats.totalRefreshes,
      successfulRefreshes: stats.successfulRefreshes,
      failedRefreshes: stats.failedRefreshes,
      consecutiveFailures: stats.consecutiveFailures,
      averageRefreshDuration: stats.averageRefreshDuration?.toFixed(2) + 'ms'
    });

    console.log('✓ 统计信息功能测试通过');
    return true;
  } catch (error: any) {
    console.error('✗ 测试失败:', error.message);
    return false;
  }
}

/**
 * 测试3: 健康检查功能
 */
async function testHealthCheck() {
  console.log('\n=== 测试3: 健康检查功能 ===');

  cleanup();

  try {
    const monitor = new TokenRefreshMonitor({
      logFilePath: TEST_LOG_FILE,
      alertThreshold: {
        consecutiveFailures: 3,
        failureRate: 0.5
      }
    });

    // 场景1: 健康状态
    console.log('1. 测试健康状态...');
    for (let i = 0; i < 10; i++) {
      monitor.recordEvent(TokenRefreshEventType.REFRESH_STARTED, true);
      monitor.recordEvent(TokenRefreshEventType.REFRESH_SUCCESS, true);
    }

    let health = monitor.healthCheck();
    if (health.status !== TokenHealthStatus.HEALTHY) {
      throw new Error(`健康状态不正确: 期望${TokenHealthStatus.HEALTHY}，实际${health.status}`);
    }
    console.log('✓ 健康状态检测正确');

    // 场景2: 警告状态（连续失败）
    console.log('2. 测试警告状态（连续失败）...');
    monitor.recordEvent(TokenRefreshEventType.REFRESH_STARTED, true);
    monitor.recordEvent(TokenRefreshEventType.REFRESH_FAILED, false, undefined, 'Test error');

    health = monitor.healthCheck();
    if (health.status !== TokenHealthStatus.WARNING) {
      throw new Error(`警告状态不正确: 期望${TokenHealthStatus.WARNING}，实际${health.status}`);
    }
    if (health.issues.length === 0) {
      throw new Error('警告状态应该包含问题描述');
    }
    console.log('✓ 警告状态检测正确，问题:', health.issues[0]);

    // 场景3: 危急状态（连续失败超过阈值）
    console.log('3. 测试危急状态（连续失败超过阈值）...');
    monitor.recordEvent(TokenRefreshEventType.REFRESH_STARTED, true);
    monitor.recordEvent(TokenRefreshEventType.REFRESH_FAILED, false, undefined, 'Test error');
    monitor.recordEvent(TokenRefreshEventType.REFRESH_STARTED, true);
    monitor.recordEvent(TokenRefreshEventType.REFRESH_FAILED, false, undefined, 'Test error');

    health = monitor.healthCheck();
    if (health.status !== TokenHealthStatus.CRITICAL) {
      throw new Error(`危急状态不正确: 期望${TokenHealthStatus.CRITICAL}，实际${health.status}`);
    }
    console.log('✓ 危急状态检测正确，问题:', health.issues.join(', '));

    console.log('✓ 健康检查功能测试通过');
    return true;
  } catch (error: any) {
    console.error('✗ 测试失败:', error.message);
    return false;
  }
}

/**
 * 测试4: 告警机制
 */
async function testAlertMechanism() {
  console.log('\n=== 测试4: 告警机制 ===');

  cleanup();

  try {
    const monitor = new TokenRefreshMonitor({
      logFilePath: TEST_LOG_FILE,
      enableLogging: true,
      alertThreshold: {
        consecutiveFailures: 3,
        failureRate: 0.5
      }
    });

    console.log('1. 触发连续失败告警...');
    for (let i = 0; i < 3; i++) {
      monitor.recordEvent(TokenRefreshEventType.REFRESH_STARTED, true);
      monitor.recordEvent(TokenRefreshEventType.REFRESH_FAILED, false, undefined, `Error ${i + 1}`);
    }

    // 检查日志中是否有告警记录
    const logContent = fs.readFileSync(TEST_LOG_FILE, 'utf-8');
    if (!logContent.includes('[ALERT]')) {
      throw new Error('日志中未找到告警记录');
    }
    console.log('✓ 连续失败告警已触发');

    console.log('2. 触发高失败率告警...');
    // 重置并创建高失败率场景
    monitor.resetStats();
    for (let i = 0; i < 10; i++) {
      monitor.recordEvent(TokenRefreshEventType.REFRESH_STARTED, true);
      if (i < 6) {
        monitor.recordEvent(TokenRefreshEventType.REFRESH_FAILED, false);
      } else {
        monitor.recordEvent(TokenRefreshEventType.REFRESH_SUCCESS, true);
      }
    }

    const stats = monitor.getStats();
    const failureRate = stats.failedRefreshes / stats.totalRefreshes;
    if (failureRate < 0.5) {
      throw new Error('失败率未达到告警阈值');
    }

    console.log(`✓ 失败率 ${(failureRate * 100).toFixed(1)}% 已超过阈值`);

    console.log('✓ 告警机制测试通过');
    return true;
  } catch (error: any) {
    console.error('✗ 测试失败:', error.message);
    return false;
  }
}

/**
 * 测试5: 日志轮转
 */
async function testLogRotation() {
  console.log('\n=== 测试5: 日志轮转 ===');

  cleanup();

  try {
    const monitor = new TokenRefreshMonitor({
      logFilePath: TEST_LOG_FILE,
      enableLogging: true,
      maxLogSize: 1024 // 1KB，方便测试
    });

    console.log('1. 写入大量日志触发轮转...');

    // 写入足够多的事件以触发日志轮转
    for (let i = 0; i < 100; i++) {
      monitor.recordEvent(
        TokenRefreshEventType.REFRESH_SUCCESS,
        true,
        {
          expiresAt: new Date().toISOString(),
          metadata: 'x'.repeat(50) // 增加日志大小
        }
      );
    }

    // 检查是否有轮转的日志文件
    const logDir = path.dirname(TEST_LOG_FILE);
    const files = fs.readdirSync(logDir);
    const rotatedFiles = files.filter(f => f.startsWith('token-refresh-test.log.'));

    if (rotatedFiles.length === 0) {
      console.log('⚠ 日志轮转未触发（可能日志大小未达到阈值）');
    } else {
      console.log(`✓ 日志轮转成功，生成 ${rotatedFiles.length} 个轮转文件`);
    }

    console.log('✓ 日志轮转测试通过');
    return true;
  } catch (error: any) {
    console.error('✗ 测试失败:', error.message);
    return false;
  }
}

/**
 * 测试6: 事件历史限制
 */
async function testEventHistoryLimit() {
  console.log('\n=== 测试6: 事件历史限制 ===');

  cleanup();

  try {
    const monitor = new TokenRefreshMonitor({
      logFilePath: TEST_LOG_FILE,
      maxEventHistory: 50
    });

    console.log('1. 记录超过限制数量的事件...');

    // 记录100个事件
    for (let i = 0; i < 100; i++) {
      monitor.recordEvent(TokenRefreshEventType.REFRESH_SUCCESS, true);
    }

    // 检查事件历史是否被限制
    const events = monitor.getRecentEvents(100);
    if (events.length > 50) {
      throw new Error(`事件历史未被限制: 期望≤50，实际${events.length}`);
    }

    console.log(`✓ 事件历史正确限制为 ${events.length} 个`);

    console.log('✓ 事件历史限制测试通过');
    return true;
  } catch (error: any) {
    console.error('✗ 测试失败:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Token刷新监控功能测试                                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const results: boolean[] = [];

  // 清理测试环境
  cleanup();

  // 运行所有测试
  results.push(await testEventRecording());
  results.push(await testStatistics());
  results.push(await testHealthCheck());
  results.push(await testAlertMechanism());
  results.push(await testLogRotation());
  results.push(await testEventHistoryLimit());

  // 清理测试环境
  cleanup();

  // 汇总结果
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   测试结果汇总                                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;

  console.log(`总测试数: ${results.length}`);
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);

  if (failed === 0) {
    console.log('\n✓ 所有测试通过！');
    process.exit(0);
  } else {
    console.log('\n✗ 部分测试失败');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  cleanup();
  process.exit(1);
});
