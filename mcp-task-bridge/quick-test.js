#!/usr/bin/env node

/**
 * Hook双协议服务器快速验证脚本
 * 简单验证HTTP协议的基本功能
 */

import { spawn } from 'child_process';

const BASE_URL = 'http://localhost:3101';

class QuickTester {
  constructor() {
    this.testCount = 0;
    this.passedCount = 0;
    this.lastTaskId = null;
  }
  
  async test(name, testFn) {
    this.testCount++;
    const startTime = Date.now();
    
    try {
      console.log(`🔍 [${this.testCount}] ${name}`);
      await testFn();
      this.passedCount++;
      const duration = Date.now() - startTime;
      console.log(`✅ 通过 (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ 失败: ${error.message} (${duration}ms)`);
    }
    console.log();
  }
  
  async httpRequest(path, method = 'GET', body = null) {
    const url = `${BASE_URL}${path}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  report() {
    console.log('=' .repeat(50));
    console.log(`📊 测试结果: ${this.passedCount}/${this.testCount} 通过`);
    console.log(`📈 通过率: ${((this.passedCount / this.testCount) * 100).toFixed(1)}%`);
    if (this.passedCount === this.testCount) {
      console.log('🎉 所有测试通过！');
    }
  }
}

async function runQuickTest() {
  console.log('🧪 Hook双协议服务器快速验证开始');
  console.log(`📍 测试地址: ${BASE_URL}`);
  console.log('=' .repeat(50));
  
  const tester = new QuickTester();
  
  await tester.test('健康检查', async () => {
    const response = await tester.httpRequest('/health');
    if (response.status !== 'ok') throw new Error('健康检查失败');
    if (!response.protocols.includes('http')) throw new Error('HTTP协议未启用');
    console.log(`    📊 服务模式: ${response.mode}`);
    console.log(`    📊 支持协议: ${response.protocols.join(', ')}`);
  });
  
  await tester.test('工具列表获取', async () => {
    const response = await tester.httpRequest('/api/tools');
    if (!response.success) throw new Error('工具列表获取失败');
    console.log(`    📊 工具数量: ${response.count}`);
    console.log(`    📊 工具列表: ${response.tools.map(t => t.name).join(', ')}`);
  });
  
  await tester.test('创建测试任务', async () => {
    const taskTitle = `快速测试任务_${Date.now()}`;
    const response = await tester.httpRequest('/api/create_task', 'POST', {
      title: taskTitle,
      projectId: 1
    });
    if (!response.success) throw new Error('任务创建失败');
    console.log(`    📊 任务ID: ${response.data.id}`);
    console.log(`    📊 任务标题: ${response.data.title}`);
    
    // 保存任务ID供后续测试使用
    tester.lastTaskId = response.data.id;
  });
  
  await tester.test('任务列表查询', async () => {
    const response = await tester.httpRequest('/api/list_tasks', 'POST', {
      limit: 5,
      page: 1
    });
    if (!response.success) throw new Error('任务列表获取失败');
    console.log(`    📊 任务总数: ${response.data.total}`);
    console.log(`    📊 当前页任务数: ${response.data.tasks.length}`);
  });
  
  await tester.test('任务查找功能', async () => {
    if (!tester.lastTaskId) {
      throw new Error('没有可查找的任务ID');
    }
    
    const response = await tester.httpRequest('/api/find_task', 'POST', {
      id: tester.lastTaskId
    });
    if (!response.success) throw new Error('任务查找失败');
    if (response.data.tasks.length === 0) throw new Error('未找到任务');
    console.log(`    📊 找到任务: ${response.data.tasks[0].title}`);
  });
  
  await tester.test('任务状态更新', async () => {
    if (!tester.lastTaskId) {
      throw new Error('没有可更新的任务ID');
    }
    
    const response = await tester.httpRequest('/api/start_task', 'POST', {
      id: tester.lastTaskId
    });
    if (!response.success) throw new Error('任务开始失败');
    console.log(`    📊 任务状态已更新为: in_progress`);
  });
  
  await tester.test('并发请求处理', async () => {
    const promises = [];
    const requestCount = 3;
    
    for (let i = 0; i < requestCount; i++) {
      promises.push(tester.httpRequest('/health'));
    }
    
    const startTime = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    console.log(`    📊 并发请求: ${requestCount}个`);
    console.log(`    📊 总耗时: ${duration}ms`);
    console.log(`    📊 平均响应时间: ${Math.round(duration / requestCount)}ms`);
  });
  
  tester.report();
}

// 启动Hook服务器进行测试
async function startHookServerAndTest() {
  console.log('🚀 启动Hook服务器用于测试...');
  
  const hookProcess = spawn('npx', ['tsx', 'hook.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HTTP_PORT: '3101',
      FORCE_HTTP: 'true'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  let serverReady = false;
  
  hookProcess.stdout.on('data', (data) => {
    const text = data.toString();
    if (text.includes('HTTP协议启动成功')) {
      serverReady = true;
      console.log('✅ Hook服务器启动成功');
      
      // 等待2秒确保服务器完全就绪
      setTimeout(async () => {
        try {
          await runQuickTest();
        } catch (error) {
          console.error('❌ 测试执行失败:', error);
        } finally {
          console.log('\n🔄 关闭测试服务器...');
          hookProcess.kill();
          process.exit(0);
        }
      }, 2000);
    }
  });
  
  hookProcess.stderr.on('data', (data) => {
    // 忽略stderr输出（通常是调试信息）
  });
  
  hookProcess.on('error', (error) => {
    console.error('❌ Hook服务器启动失败:', error);
    process.exit(1);
  });
  
  // 超时检查
  setTimeout(() => {
    if (!serverReady) {
      console.error('❌ Hook服务器启动超时');
      hookProcess.kill();
      process.exit(1);
    }
  }, 10000);
}

// 检查是否有现有的Hook服务器运行
async function checkExistingServer() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      console.log('✅ 发现现有的Hook服务器，直接开始测试');
      await runQuickTest();
      return true;
    }
  } catch (error) {
    return false;
  }
}

// 主入口
async function main() {
  console.log('🔍 检查现有Hook服务器...');
  
  const hasExistingServer = await checkExistingServer();
  if (!hasExistingServer) {
    console.log('🚀 启动新的Hook服务器进行测试...');
    await startHookServerAndTest();
  }
}

main().catch(console.error);
