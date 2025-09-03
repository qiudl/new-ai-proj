#!/usr/bin/env node
/**
 * MCP Hook双协议服务器测试套件
 * 
 * 测试目标：
 * 1. HTTP协议功能测试
 * 2. Stdio协议功能测试  
 * 3. 环境检测逻辑测试
 * 4. 工具调用性能测试
 * 5. 错误处理测试
 * 6. 并发请求测试
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

// 测试配置
const TEST_CONFIG = {
  HTTP_BASE_URL: 'http://localhost:3101',
  STDIO_COMMAND: 'npx tsx hook.ts',
  HOOK_PATH: './hook.ts',
  TIMEOUT: 10000,
  CONCURRENT_REQUESTS: 5
};

// 测试工具类
class TestFramework {
  private results: Array<{name: string, passed: boolean, message: string, duration: number}> = [];
  
  constructor() {
    console.log('🧪 MCP Hook双协议服务器测试开始');
    console.log('=' .repeat(60));
  }

  async test(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔍 测试: ${name}`);
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({name, passed: true, message: 'PASS', duration});
      console.log(`✅ ${name} - 通过 (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      this.results.push({name, passed: false, message, duration});
      console.log(`❌ ${name} - 失败: ${message} (${duration}ms)`);
    }
    console.log();
  }

  report(): void {
    console.log('=' .repeat(60));
    console.log('📊 测试报告');
    console.log('=' .repeat(60));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`总测试数: ${this.results.length}`);
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`⏱️ 总耗时: ${totalDuration}ms`);
    console.log(`📈 通过率: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    }
    
    console.log('\n📋 详细结果:');
    this.results.forEach(r => {
      const status = r.passed ? '✅' : '❌';
      console.log(`  ${status} ${r.name.padEnd(40)} ${r.duration.toString().padStart(6)}ms`);
    });
  }
}

// HTTP协议测试工具
class HttpTester {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  async request(path: string, method: string = 'GET', body?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const options: any = {
      method,
      headers: {'Content-Type': 'application/json'}
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
  
  async get(path: string): Promise<any> {
    return this.request(path, 'GET');
  }
  
  async post(path: string, body: any): Promise<any> {
    return this.request(path, 'POST', body);
  }
}

// Stdio协议测试工具
class StdioTester {
  private process: any;
  
  async sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Stdio测试超时'));
      }, TEST_CONFIG.TIMEOUT);
      
      const env = {...process.env, FORCE_STDIO: 'true'};
      const proc = spawn('npx', ['tsx', 'hook.ts'], {
        cwd: process.cwd(),
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let started = false;
      
      proc.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        
        if (!started && text.includes('双协议服务器运行状态')) {
          started = true;
          // 发送测试消息
          proc.stdin.write(JSON.stringify(message) + '\n');
        }
        
        // 检查JSON-RPC响应
        const lines = output.split('\n');
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.jsonrpc && parsed.id === message.id) {
              clearTimeout(timeout);
              proc.kill();
              resolve(parsed);
              return;
            }
          } catch (e) {
            // 不是JSON行，继续
          }
        }
      });
      
      proc.stderr.on('data', (data) => {
        // 忽略stderr输出（调试信息）
      });
      
      proc.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      
      proc.on('exit', () => {
        clearTimeout(timeout);
        reject(new Error('进程提前退出'));
      });
    });
  }
}

// 主测试类
class HookTester {
  private framework: TestFramework;
  private httpTester: HttpTester;
  private stdioTester: StdioTester;
  
  constructor() {
    this.framework = new TestFramework();
    this.httpTester = new HttpTester(TEST_CONFIG.HTTP_BASE_URL);
    this.stdioTester = new StdioTester();
  }
  
  async runAllTests(): Promise<void> {
    await this.testHttpProtocol();
    await this.testStdioProtocol();
    await this.testToolFunctionality();
    await this.testErrorHandling();
    await this.testPerformance();
    
    this.framework.report();
  }
  
  // HTTP协议测试
  async testHttpProtocol(): Promise<void> {
    await this.framework.test('HTTP健康检查', async () => {
      const response = await this.httpTester.get('/health');
      if (response.status !== 'ok') throw new Error('健康检查失败');
      if (response.mode !== 'dual-protocol-hook') throw new Error('模式不正确');
      if (!response.protocols.includes('http')) throw new Error('HTTP协议未启用');
    });
    
    await this.framework.test('HTTP工具列表', async () => {
      const response = await this.httpTester.get('/api/tools');
      if (!response.success) throw new Error('工具列表获取失败');
      if (response.count !== 11) throw new Error(`工具数量不正确: ${response.count}`);
      
      const expectedTools = ['create_task', 'list_tasks', 'find_task', 'start_task', 'complete_task'];
      for (const tool of expectedTools) {
        if (!response.tools.some((t: any) => t.name === tool)) {
          throw new Error(`缺少工具: ${tool}`);
        }
      }
    });
    
    await this.framework.test('HTTP任务创建', async () => {
      const response = await this.httpTester.post('/api/create_task', {
        title: '测试任务_' + Date.now(),
        projectId: 1
      });
      if (!response.success) throw new Error('任务创建失败');
      if (!response.data.id) throw new Error('任务ID缺失');
      if (response.data.title.indexOf('测试任务_') !== 0) throw new Error('任务标题不正确');
    });
    
    await this.framework.test('HTTP任务列表', async () => {
      const response = await this.httpTester.post('/api/list_tasks', {
        limit: 5,
        page: 1
      });
      if (!response.success) throw new Error('任务列表获取失败');
      if (!Array.isArray(response.data.tasks)) throw new Error('任务列表格式错误');
    });
  }
  
  // Stdio协议测试
  async testStdioProtocol(): Promise<void> {
    await this.framework.test('Stdio工具列表', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      };
      
      const response = await this.stdioTester.sendMessage(message);
      if (!response.result) throw new Error('Stdio响应格式错误');
      if (!Array.isArray(response.result.tools)) throw new Error('工具列表格式错误');
      if (response.result.tools.length !== 11) throw new Error(`工具数量不正确: ${response.result.tools.length}`);
    });
    
    await this.framework.test('Stdio任务创建', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'create_task',
          arguments: {
            title: 'Stdio测试任务_' + Date.now(),
            projectId: 1
          }
        }
      };
      
      const response = await this.stdioTester.sendMessage(message);
      if (!response.result) throw new Error('Stdio任务创建失败');
      
      // 解析返回的JSON文本
      const resultText = response.result.content[0].text;
      const taskResult = JSON.parse(resultText);
      if (!taskResult.success) throw new Error('任务创建失败');
      if (!taskResult.data.id) throw new Error('任务ID缺失');
    });
  }
  
  // 工具功能测试
  async testToolFunctionality(): Promise<void> {
    let taskId: number;
    
    await this.framework.test('完整工具工作流', async () => {
      // 创建任务
      const createResponse = await this.httpTester.post('/api/create_task', {
        title: '工作流测试任务',
        projectId: 1
      });
      if (!createResponse.success) throw new Error('任务创建失败');
      taskId = createResponse.data.id;
      
      // 开始任务
      const startResponse = await this.httpTester.post('/api/start_task', {
        id: taskId
      });
      if (!startResponse.success) throw new Error('任务开始失败');
      
      // 暂停任务
      const pauseResponse = await this.httpTester.post('/api/pause_task', {
        id: taskId
      });
      if (!pauseResponse.success) throw new Error('任务暂停失败');
      
      // 完成任务
      const completeResponse = await this.httpTester.post('/api/complete_task', {
        id: taskId
      });
      if (!completeResponse.success) throw new Error('任务完成失败');
      
      // 查找任务
      const findResponse = await this.httpTester.post('/api/find_task', {
        id: taskId
      });
      if (!findResponse.success) throw new Error('任务查找失败');
      if (findResponse.data.tasks[0].id !== taskId) throw new Error('查找的任务ID不匹配');
    });
    
    await this.framework.test('任务更新功能', async () => {
      const updateResponse = await this.httpTester.post('/api/update_task', {
        id: taskId,
        updates: {
          title: '更新后的任务标题',
          priority: 'high',
          status: 'completed'
        }
      });
      if (!updateResponse.success) throw new Error('任务更新失败');
    });
  }
  
  // 错误处理测试
  async testErrorHandling(): Promise<void> {
    await this.framework.test('无效工具调用', async () => {
      try {
        await this.httpTester.post('/api/invalid_tool', {});
        throw new Error('应该返回404错误');
      } catch (error) {
        if (!error.message.includes('404')) {
          throw new Error('错误处理不正确');
        }
      }
    });
    
    await this.framework.test('无效参数处理', async () => {
      const response = await this.httpTester.post('/api/create_task', {
        // 缺少必需的title参数
        projectId: 1
      });
      if (response.success) throw new Error('应该返回参数错误');
    });
    
    await this.framework.test('不存在的任务ID', async () => {
      const response = await this.httpTester.post('/api/start_task', {
        id: 999999
      });
      if (response.success) throw new Error('应该返回任务不存在错误');
    });
  }
  
  // 性能测试
  async testPerformance(): Promise<void> {
    await this.framework.test('并发请求处理', async () => {
      const startTime = Date.now();
      const promises = [];
      
      for (let i = 0; i < TEST_CONFIG.CONCURRENT_REQUESTS; i++) {
        const promise = this.httpTester.post('/api/create_task', {
          title: `并发测试任务_${i}`,
          projectId: 1
        });
        promises.push(promise);
      }
      
      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      // 验证所有请求都成功
      for (const response of responses) {
        if (!response.success) throw new Error('并发请求失败');
      }
      
      console.log(`    📊 并发性能: ${TEST_CONFIG.CONCURRENT_REQUESTS}个请求耗时${duration}ms`);
      console.log(`    📊 平均响应时间: ${Math.round(duration / TEST_CONFIG.CONCURRENT_REQUESTS)}ms`);
      
      if (duration > 5000) throw new Error('并发性能不达标');
    });
    
    await this.framework.test('健康检查响应时间', async () => {
      const iterations = 10;
      let totalTime = 0;
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await this.httpTester.get('/health');
        totalTime += (Date.now() - start);
      }
      
      const avgTime = totalTime / iterations;
      console.log(`    📊 健康检查平均响应时间: ${avgTime.toFixed(1)}ms`);
      
      if (avgTime > 100) throw new Error('健康检查响应时间过长');
    });
  }
}

// 运行测试
async function main() {
  const tester = new HookTester();
  
  try {
    console.log('🚀 启动Hook双协议服务器测试...');
    console.log(`📍 HTTP测试地址: ${TEST_CONFIG.HTTP_BASE_URL}`);
    console.log(`📍 Stdio测试命令: ${TEST_CONFIG.STDIO_COMMAND}`);
    console.log();
    
    await tester.runAllTests();
    
  } catch (error) {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main();
}

export { HookTester, TestFramework, HttpTester, StdioTester };
