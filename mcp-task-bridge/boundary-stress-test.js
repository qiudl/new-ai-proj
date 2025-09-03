#!/usr/bin/env node

/**
 * Hook双协议服务器边界条件和压力测试套件
 * 测试极限情况、边界值和系统稳定性
 */

class BoundaryAndStressTests {
  constructor() {
    this.results = [];
    this.baseUrl = 'http://localhost:3101';
    this.maxRetries = 3;
  }
  
  async test(name, testFn, options = {}) {
    const { timeout = 30000, critical = false } = options;
    const startTime = Date.now();
    
    console.log(`🔍 ${name}`);
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`测试超时 (${timeout}ms)`)), timeout);
      });
      
      await Promise.race([testFn(), timeoutPromise]);
      
      const duration = Date.now() - startTime;
      this.results.push({ name, passed: true, duration, critical });
      console.log(`✅ 通过 (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({ name, passed: false, duration, critical, error: error.message });
      console.log(`❌ 失败: ${error.message} (${duration}ms)`);
      
      if (critical) {
        console.log(`🚨 关键测试失败，终止测试套件`);
        throw error;
      }
    }
    console.log();
  }
  
  async httpRequest(path, method = 'GET', body = null, options = {}) {
    const { expectError = false, timeout = 10000 } = options;
    const url = `${this.baseUrl}${path}`;
    
    const requestOptions = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeout)
    };
    
    if (body) {
      requestOptions.body = JSON.stringify(body);
    }
    
    try {
      const response = await fetch(url, requestOptions);
      
      if (!expectError && !response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return { status: response.status, data, ok: response.ok };
      
    } catch (error) {
      if (expectError) {
        return { error: error.message, status: 0 };
      }
      throw error;
    }
  }
  
  generateLargeString(size) {
    return 'A'.repeat(size);
  }
  
  generateDeepObject(depth) {
    let obj = { value: 'deep_test' };
    for (let i = 0; i < depth; i++) {
      obj = { nested: obj };
    }
    return obj;
  }
  
  async runBoundaryTests() {
    console.log('🧪 边界条件测试开始');
    console.log('=' .repeat(60));
    
    // 1. 输入边界测试
    await this.test('超长任务标题 (10KB)', async () => {
      const longTitle = this.generateLargeString(10240);
      const response = await this.httpRequest('/api/create_task', 'POST', {
        title: longTitle,
        projectId: 1
      });
      
      if (!response.data.success) {
        // 预期可能失败，但不应该崩溃服务器
        console.log(`    📊 长标题处理: ${response.data.error || '拒绝请求'}`);
        return;
      }
      
      console.log(`    📊 任务ID: ${response.data.data.id}`);
      console.log(`    📊 标题长度: ${longTitle.length}`);
    });
    
    await this.test('极大JSON负载 (1MB)', async () => {
      const largeData = this.generateLargeString(1024 * 1024);
      
      try {
        const response = await this.httpRequest('/api/create_task', 'POST', {
          title: 'Large Data Test',
          description: largeData,
          projectId: 1
        }, { timeout: 15000 });
        
        console.log(`    📊 大负载处理结果: ${response.data.success ? '成功' : '被拒绝'}`);
        
      } catch (error) {
        if (error.message.includes('PayloadTooLargeError') || 
            error.message.includes('body limit')) {
          console.log(`    📊 正确拒绝大负载: ${error.message}`);
          return;
        }
        throw error;
      }
    });
    
    await this.test('深度嵌套JSON对象', async () => {
      const deepObject = this.generateDeepObject(100);
      
      const response = await this.httpRequest('/api/create_task', 'POST', {
        title: 'Deep Object Test',
        customData: deepObject,
        projectId: 1
      });
      
      console.log(`    📊 深度嵌套处理: ${response.data.success ? '成功' : '处理异常'}`);
    });
    
    await this.test('空值和null处理', async () => {
      const testCases = [
        { title: '', projectId: 1 },
        { title: null, projectId: 1 },
        { title: undefined, projectId: 1 },
        { title: 'Valid Title', projectId: null },
        { title: 'Valid Title', projectId: -1 },
        { title: 'Valid Title', projectId: 9999999 }
      ];
      
      let handledCount = 0;
      
      for (const testCase of testCases) {
        try {
          const response = await this.httpRequest('/api/create_task', 'POST', testCase);
          
          if (response.data.success) {
            console.log(`    📊 接受了输入: ${JSON.stringify(testCase)}`);
          } else {
            console.log(`    📊 正确拒绝: ${JSON.stringify(testCase)}`);
          }
          handledCount++;
          
        } catch (error) {
          console.log(`    📊 异常处理: ${JSON.stringify(testCase)} -> ${error.message}`);
          handledCount++;
        }
        
        // 避免过于频繁的请求
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (handledCount !== testCases.length) {
        throw new Error(`只处理了 ${handledCount}/${testCases.length} 个边界情况`);
      }
    });
    
    await this.test('特殊字符处理', async () => {
      const specialChars = [
        '🚀🎉💻', // Unicode emoji
        '\\n\\t\\r', // 转义字符
        '<script>alert("xss")</script>', // XSS尝试
        'DROP TABLE tasks;', // SQL注入尝试
        '{"json": "inside"}', // JSON在字符串中
        '\0\x01\x02\x03', // 控制字符
      ];
      
      for (const chars of specialChars) {
        const response = await this.httpRequest('/api/create_task', 'POST', {
          title: `特殊字符测试: ${chars}`,
          projectId: 1
        });
        
        if (response.data.success) {
          console.log(`    📊 特殊字符接受: ${chars.substring(0, 20)}...`);
        } else {
          console.log(`    📊 特殊字符拒绝: ${chars.substring(0, 20)}...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });
    
    // 2. 资源限制测试
    await this.test('最大任务列表查询', async () => {
      const response = await this.httpRequest('/api/list_tasks', 'POST', {
        limit: 100, // 最大限制
        page: 1
      });
      
      if (!response.data.success) {
        throw new Error(`任务列表查询失败: ${response.data.error}`);
      }
      
      console.log(`    📊 返回任务数: ${response.data.data.tasks.length}`);
      console.log(`    📊 总任务数: ${response.data.data.total}`);
      console.log(`    📊 响应大小: ${JSON.stringify(response.data).length} bytes`);
    });
    
    await this.test('越界分页请求', async () => {
      const testCases = [
        { limit: 101, page: 1 }, // 超过最大限制
        { limit: 0, page: 1 },   // 零限制
        { limit: -1, page: 1 },  // 负数限制
        { limit: 10, page: 0 },  // 零页码
        { limit: 10, page: -1 }, // 负页码
        { limit: 10, page: 99999 } // 超大页码
      ];
      
      for (const testCase of testCases) {
        const response = await this.httpRequest('/api/list_tasks', 'POST', testCase);
        
        console.log(`    📊 分页 ${JSON.stringify(testCase)}: ${response.data.success ? '成功' : '被拒绝'}`);
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });
    
    // 3. 并发边界测试
    await this.test('极高并发请求 (50个)', async () => {
      const concurrency = 50;
      const promises = [];
      
      console.log(`    📊 启动 ${concurrency} 个并发请求...`);
      
      const startTime = Date.now();
      
      for (let i = 0; i < concurrency; i++) {
        const promise = this.httpRequest('/health').catch(error => ({ error: error.message }));
        promises.push(promise);
      }
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      const successful = results.filter(r => r.data && r.data.status === 'ok').length;
      const failed = results.filter(r => r.error).length;
      const duration = endTime - startTime;
      
      console.log(`    📊 总耗时: ${duration}ms`);
      console.log(`    📊 成功: ${successful}, 失败: ${failed}`);
      console.log(`    📊 成功率: ${((successful / concurrency) * 100).toFixed(1)}%`);
      console.log(`    📊 平均RPS: ${((concurrency * 1000) / duration).toFixed(2)}`);
      
      if (successful < concurrency * 0.9) { // 至少90%成功率
        throw new Error(`并发成功率过低: ${successful}/${concurrency}`);
      }
    }, { timeout: 30000 });
    
    await this.test('快速连续请求 (无间隔)', async () => {
      const requests = 20;
      const results = [];
      
      console.log(`    📊 发送 ${requests} 个无间隔连续请求...`);
      
      const startTime = Date.now();
      
      for (let i = 0; i < requests; i++) {
        try {
          const result = await this.httpRequest('/health');
          results.push({ success: true, data: result });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }
      
      const endTime = Date.now();
      const successful = results.filter(r => r.success).length;
      const duration = endTime - startTime;
      
      console.log(`    📊 连续请求耗时: ${duration}ms`);
      console.log(`    📊 成功率: ${successful}/${requests} (${((successful/requests)*100).toFixed(1)}%)`);
      console.log(`    📊 平均请求间隔: ${(duration/requests).toFixed(1)}ms`);
    });
    
    // 4. 错误恢复测试
    await this.test('无效端点大量请求', async () => {
      const requests = 10;
      let server_still_responsive = false;
      
      console.log(`    📊 向无效端点发送 ${requests} 个请求...`);
      
      // 发送大量无效请求
      for (let i = 0; i < requests; i++) {
        try {
          await this.httpRequest(`/api/invalid_endpoint_${i}`, 'POST', { data: 'test' }, { expectError: true });
        } catch (error) {
          // 预期会失败
        }
      }
      
      // 验证服务器是否仍然响应
      try {
        const healthCheck = await this.httpRequest('/health');
        if (healthCheck.data.status === 'ok') {
          server_still_responsive = true;
        }
      } catch (error) {
        throw new Error(`服务器在无效请求后无响应: ${error.message}`);
      }
      
      console.log(`    📊 服务器响应状态: ${server_still_responsive ? '正常' : '异常'}`);
      
      if (!server_still_responsive) {
        throw new Error('服务器在处理无效请求后变得无响应');
      }
    });
    
    await this.test('内存使用监控', async () => {
      // 创建一系列任务来观察内存使用情况
      const taskCount = 20;
      const createdTasks = [];
      
      console.log(`    📊 创建 ${taskCount} 个任务监控内存...`);
      
      const initialMemory = process.memoryUsage();
      
      for (let i = 0; i < taskCount; i++) {
        try {
          const response = await this.httpRequest('/api/create_task', 'POST', {
            title: `内存测试任务_${i}_${Date.now()}`,
            description: this.generateLargeString(1000), // 1KB描述
            projectId: 1
          });
          
          if (response.data.success) {
            createdTasks.push(response.data.data.id);
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.log(`    ⚠️ 任务创建失败: ${error.message}`);
        }
      }
      
      const finalMemory = process.memoryUsage();
      
      console.log(`    📊 成功创建任务数: ${createdTasks.length}`);
      console.log(`    📊 初始内存: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`    📊 最终内存: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`    📊 内存增长: ${Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024)}KB`);
    });
  }
  
  async runStressTests() {
    console.log('🔥 压力测试开始');
    console.log('=' .repeat(60));
    
    await this.test('长期运行压力测试', async () => {
      const duration = 60000; // 60秒
      const interval = 100; // 100ms间隔
      const endTime = Date.now() + duration;
      
      let requestCount = 0;
      let successCount = 0;
      let errorCount = 0;
      
      console.log(`    📊 压力测试运行 ${duration/1000} 秒...`);
      
      while (Date.now() < endTime) {
        try {
          const response = await this.httpRequest('/health');
          requestCount++;
          
          if (response.data.status === 'ok') {
            successCount++;
          }
          
        } catch (error) {
          requestCount++;
          errorCount++;
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
        
        // 每10秒输出一次进度
        if (requestCount % 100 === 0) {
          const elapsed = Date.now() - (endTime - duration);
          const progress = ((elapsed / duration) * 100).toFixed(1);
          console.log(`    📊 进度: ${progress}% (${requestCount} 请求, ${successCount} 成功)`);
        }
      }
      
      const successRate = ((successCount / requestCount) * 100).toFixed(2);
      const avgRPS = ((requestCount * 1000) / duration).toFixed(2);
      
      console.log(`    📊 总请求数: ${requestCount}`);
      console.log(`    📊 成功数: ${successCount}`);
      console.log(`    📊 错误数: ${errorCount}`);
      console.log(`    📊 成功率: ${successRate}%`);
      console.log(`    📊 平均RPS: ${avgRPS}`);
      
      if (parseFloat(successRate) < 95) {
        throw new Error(`长期压力测试成功率过低: ${successRate}%`);
      }
    }, { timeout: 90000, critical: true });
    
    await this.test('突发流量测试', async () => {
      const bursts = 5;
      const requestsPerBurst = 20;
      const burstInterval = 2000; // 2秒间隔
      
      console.log(`    📊 ${bursts} 轮突发测试，每轮 ${requestsPerBurst} 请求...`);
      
      let totalRequests = 0;
      let totalSuccess = 0;
      
      for (let burst = 1; burst <= bursts; burst++) {
        console.log(`    📊 突发轮次 ${burst}/${bursts}...`);
        
        const promises = [];
        const burstStart = Date.now();
        
        for (let i = 0; i < requestsPerBurst; i++) {
          promises.push(
            this.httpRequest('/api/list_tasks', 'POST', { limit: 5, page: 1 })
              .catch(error => ({ error: error.message }))
          );
        }
        
        const results = await Promise.all(promises);
        const burstEnd = Date.now();
        
        const burstSuccess = results.filter(r => r.data && r.data.success).length;
        const burstDuration = burstEnd - burstStart;
        
        totalRequests += requestsPerBurst;
        totalSuccess += burstSuccess;
        
        console.log(`      突发 ${burst}: ${burstSuccess}/${requestsPerBurst} 成功，耗时 ${burstDuration}ms`);
        
        if (burst < bursts) {
          await new Promise(resolve => setTimeout(resolve, burstInterval));
        }
      }
      
      const overallSuccessRate = ((totalSuccess / totalRequests) * 100).toFixed(1);
      console.log(`    📊 总体成功率: ${overallSuccessRate}% (${totalSuccess}/${totalRequests})`);
      
      if (parseFloat(overallSuccessRate) < 90) {
        throw new Error(`突发流量测试成功率过低: ${overallSuccessRate}%`);
      }
    }, { timeout: 30000 });
  }
  
  report() {
    console.log('=' .repeat(60));
    console.log('📊 边界条件和压力测试报告');
    console.log('=' .repeat(60));
    
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const critical = this.results.filter(r => r.critical).length;
    const criticalPassed = this.results.filter(r => r.critical && r.passed).length;
    
    console.log(`总测试数: ${total}`);
    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`🚨 关键测试: ${critical} (通过: ${criticalPassed})`);
    console.log(`📈 总通过率: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (criticalPassed < critical) {
      console.log(`🚨 关键测试失败，系统稳定性存在问题`);
    }
    
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / total;
    console.log(`⏱️ 平均测试时间: ${avgDuration.toFixed(0)}ms`);
    
    if (failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.results.filter(r => !r.passed).forEach(r => {
        const critical = r.critical ? '🚨' : '⚠️';
        console.log(`  ${critical} ${r.name}: ${r.error}`);
      });
    }
    
    console.log('\n📋 详细结果:');
    this.results.forEach(r => {
      const status = r.passed ? '✅' : '❌';
      const critical = r.critical ? '🚨' : '  ';
      console.log(`  ${status}${critical} ${r.name.padEnd(40)} ${r.duration.toString().padStart(6)}ms`);
    });
    
    return passed === total;
  }
}

// 运行测试
async function main() {
  const tester = new BoundaryAndStressTests();
  
  try {
    await tester.runBoundaryTests();
    await tester.runStressTests();
    
    const allPassed = tester.report();
    
    if (allPassed) {
      console.log('\n🎉 所有边界条件和压力测试通过！');
      process.exit(0);
    } else {
      console.log('\n❌ 部分测试失败，请检查系统稳定性');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 测试套件运行失败:', error.message);
    process.exit(1);
  }
}

// 检查是否为主模块
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { BoundaryAndStressTests };
