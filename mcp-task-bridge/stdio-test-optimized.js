#!/usr/bin/env node

/**
 * 优化的Stdio协议测试工具
 * 解决进程管理、超时和资源清理问题
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

class StdioProcessManager extends EventEmitter {
  constructor() {
    super();
    this.processes = new Map();
    this.messageId = 0;
    
    // 优雅关闭处理
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('exit', () => this.cleanup());
  }
  
  async sendMCPMessage(message, options = {}) {
    const {
      timeout = 15000,
      maxRetries = 3,
      killTimeout = 5000
    } = options;
    
    let attempt = 0;
    let lastError = null;
    
    while (attempt < maxRetries) {
      try {
        attempt++;
        console.log(`📞 Stdio测试尝试 ${attempt}/${maxRetries}`);
        
        const result = await this._executeStdioTest(message, timeout, killTimeout);
        console.log(`✅ Stdio测试成功 (尝试 ${attempt})`);
        return result;
        
      } catch (error) {
        lastError = error;
        console.log(`❌ Stdio测试失败 (尝试 ${attempt}): ${error.message}`);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * attempt, 3000); // 渐进退避
          console.log(`⏳ 等待 ${delay}ms 后重试...`);
          await this._sleep(delay);
        }
      }
    }
    
    throw new Error(`Stdio测试失败 (${maxRetries}次尝试): ${lastError.message}`);
  }
  
  async _executeStdioTest(message, timeout, killTimeout) {
    return new Promise((resolve, reject) => {
      const processId = `stdio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let timeoutHandle = null;
      let killTimeoutHandle = null;
      let resolved = false;
      
      const cleanup = (error = null) => {
        if (resolved) return;
        resolved = true;
        
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (killTimeoutHandle) clearTimeout(killTimeoutHandle);
        
        const proc = this.processes.get(processId);
        if (proc && !proc.killed) {
          try {
            proc.kill('SIGTERM');
            
            // 强制终止超时
            killTimeoutHandle = setTimeout(() => {
              if (!proc.killed) {
                console.log(`⚡ 强制终止进程 ${processId}`);
                proc.kill('SIGKILL');
              }
            }, killTimeout);
          } catch (e) {
            console.log(`⚠️ 进程终止时出错: ${e.message}`);
          }
        }
        
        this.processes.delete(processId);
        
        if (error) {
          reject(error);
        }
      };
      
      try {
        // 启动Hook进程
        const env = {
          ...process.env,
          FORCE_STDIO: 'true',
          NODE_ENV: 'test',
          HTTP_PORT: '0', // 禁用HTTP以避免端口冲突
          ENABLE_HTTP: 'false'
        };
        
        const proc = spawn('npx', ['tsx', 'hook.ts'], {
          cwd: process.cwd(),
          env,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        this.processes.set(processId, proc);
        
        let stdoutBuffer = '';
        let stderrBuffer = '';
        let serverReady = false;
        let messageSent = false;
        
        // 设置总超时
        timeoutHandle = setTimeout(() => {
          cleanup(new Error(`Stdio测试超时 (${timeout}ms)`));
        }, timeout);
        
        // 处理标准输出
        proc.stdout.on('data', (data) => {
          const text = data.toString();
          stdoutBuffer += text;
          
          // 检测服务器就绪状态
          if (!serverReady && (
            text.includes('双协议服务器运行状态') ||
            text.includes('Stdio协议启动成功') ||
            text.includes('Stdio协议: ✓ 已连接')
          )) {
            serverReady = true;
            console.log(`🚀 Stdio服务器就绪 (${processId})`);
            
            // 发送测试消息
            if (!messageSent) {
              messageSent = true;
              const messageStr = JSON.stringify(message) + '\n';
              console.log(`📤 发送消息: ${messageStr.trim()}`);
              proc.stdin.write(messageStr);
            }
          }
          
          // 查找JSON-RPC响应
          const lines = stdoutBuffer.split('\n');
          for (const line of lines) {
            if (line.trim().length === 0) continue;
            
            try {
              const parsed = JSON.parse(line);
              if (parsed.jsonrpc && parsed.id === message.id) {
                console.log(`📥 收到响应: ${JSON.stringify(parsed).substr(0, 200)}...`);
                cleanup();
                resolve(parsed);
                return;
              }
            } catch (e) {
              // 不是JSON行，继续
            }
          }
        });
        
        // 处理标准错误（调试信息）
        proc.stderr.on('data', (data) => {
          stderrBuffer += data.toString();
        });
        
        // 处理进程错误
        proc.on('error', (error) => {
          console.log(`💥 进程错误: ${error.message}`);
          cleanup(new Error(`进程启动失败: ${error.message}`));
        });
        
        // 处理进程退出
        proc.on('exit', (code, signal) => {
          const message = signal ? `信号 ${signal}` : `代码 ${code}`;
          console.log(`🔚 进程退出 (${message})`);
          
          if (!resolved) {
            if (code === 0) {
              cleanup(new Error('进程正常退出但未收到响应'));
            } else {
              cleanup(new Error(`进程异常退出 (${message})`));
            }
          }
        });
        
      } catch (error) {
        cleanup(error);
      }
    });
  }
  
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  cleanup() {
    console.log('🧹 清理Stdio进程...');
    for (const [id, proc] of this.processes.entries()) {
      try {
        if (!proc.killed) {
          proc.kill('SIGTERM');
          setTimeout(() => {
            if (!proc.killed) proc.kill('SIGKILL');
          }, 2000);
        }
      } catch (e) {
        console.log(`⚠️ 清理进程 ${id} 时出错: ${e.message}`);
      }
    }
    this.processes.clear();
  }
  
  getActiveProcessCount() {
    return this.processes.size;
  }
}

// 优化的Stdio测试套件
class OptimizedStdioTester {
  constructor() {
    this.processManager = new StdioProcessManager();
    this.testResults = [];
  }
  
  async test(name, testFn) {
    const startTime = Date.now();
    console.log(`🔍 ${name}`);
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.testResults.push({name, passed: true, duration, error: null});
      console.log(`✅ ${name} - 通过 (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({name, passed: false, duration, error: error.message});
      console.log(`❌ ${name} - 失败: ${error.message} (${duration}ms)`);
    }
    console.log();
  }
  
  async runTests() {
    console.log('🧪 优化的Stdio协议测试开始');
    console.log('=' .repeat(50));
    
    await this.test('Stdio工具列表请求', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      };
      
      const response = await this.processManager.sendMCPMessage(message, {
        timeout: 20000,
        maxRetries: 2
      });
      
      if (!response.result) {
        throw new Error('响应格式错误：缺少result字段');
      }
      
      if (!Array.isArray(response.result.tools)) {
        throw new Error('工具列表格式错误');
      }
      
      if (response.result.tools.length !== 11) {
        throw new Error(`工具数量不正确: ${response.result.tools.length}/11`);
      }
      
      console.log(`    📊 工具数量: ${response.result.tools.length}`);
      console.log(`    📊 工具列表: ${response.result.tools.slice(0, 3).map(t => t.name).join(', ')}...`);
    });
    
    await this.test('Stdio任务创建请求', async () => {
      const timestamp = Date.now();
      const message = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'create_task',
          arguments: {
            title: `Stdio优化测试_${timestamp}`,
            projectId: 1
          }
        }
      };
      
      const response = await this.processManager.sendMCPMessage(message, {
        timeout: 25000,
        maxRetries: 2
      });
      
      if (!response.result) {
        throw new Error('响应格式错误：缺少result字段');
      }
      
      const resultText = response.result.content[0].text;
      const taskResult = JSON.parse(resultText);
      
      if (!taskResult.success) {
        throw new Error(`任务创建失败: ${taskResult.error}`);
      }
      
      if (!taskResult.data.id) {
        throw new Error('任务ID缺失');
      }
      
      console.log(`    📊 任务ID: ${taskResult.data.id}`);
      console.log(`    📊 任务标题: ${taskResult.data.title}`);
    });
    
    await this.test('Stdio任务查询请求', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'list_tasks',
          arguments: {
            limit: 3,
            page: 1
          }
        }
      };
      
      const response = await this.processManager.sendMCPMessage(message, {
        timeout: 20000,
        maxRetries: 2
      });
      
      if (!response.result) {
        throw new Error('响应格式错误：缺少result字段');
      }
      
      const resultText = response.result.content[0].text;
      const listResult = JSON.parse(resultText);
      
      if (!listResult.success) {
        throw new Error(`任务列表获取失败: ${listResult.error}`);
      }
      
      if (!Array.isArray(listResult.data.tasks)) {
        throw new Error('任务列表格式错误');
      }
      
      console.log(`    📊 总任务数: ${listResult.data.total}`);
      console.log(`    📊 返回任务数: ${listResult.data.tasks.length}`);
    });
    
    await this.test('Stdio错误处理测试', async () => {
      const message = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'invalid_tool_name',
          arguments: {}
        }
      };
      
      const response = await this.processManager.sendMCPMessage(message, {
        timeout: 15000,
        maxRetries: 1
      });
      
      if (!response.result) {
        throw new Error('响应格式错误：缺少result字段');
      }
      
      const resultText = response.result.content[0].text;
      const errorResult = JSON.parse(resultText);
      
      if (errorResult.success) {
        throw new Error('应该返回错误但返回了成功');
      }
      
      console.log(`    📊 错误处理正确: ${errorResult.error}`);
    });
    
    // 清理资源
    this.processManager.cleanup();
    
    // 测试报告
    this.report();
  }
  
  report() {
    console.log('=' .repeat(50));
    console.log('📊 Stdio协议测试报告');
    console.log('=' .repeat(50));
    
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`总测试数: ${this.testResults.length}`);
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`⏱️ 总耗时: ${totalDuration}ms`);
    console.log(`📈 通过率: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }
    
    console.log('\n📋 详细结果:');
    this.testResults.forEach(r => {
      const status = r.passed ? '✅' : '❌';
      console.log(`  ${status} ${r.name.padEnd(30)} ${r.duration.toString().padStart(6)}ms`);
    });
  }
}

// 运行测试
async function main() {
  const tester = new OptimizedStdioTester();
  
  try {
    await tester.runTests();
  } catch (error) {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  }
}

// 检查是否为主模块
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { OptimizedStdioTester, StdioProcessManager };
