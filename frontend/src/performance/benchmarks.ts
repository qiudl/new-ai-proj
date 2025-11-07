/**
 * 性能基准测试套件
 * 用于测试关键功能的性能表现
 */

import performanceMonitor from '../utils/PerformanceMonitor';

interface BenchmarkResult {
  name: string;
  duration: number;
  operations: number;
  opsPerSecond: number;
  memoryUsage?: {
    before: number;
    after: number;
    delta: number;
  };
  metadata?: Record<string, any>;
}

interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  totalDuration: number;
  summary: {
    fastest: string;
    slowest: string;
    averageDuration: number;
  };
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  
  /**
   * 运行基准测试
   */
  async benchmark(
    name: string,
    testFn: () => Promise<void> | void,
    iterations: number = 1000,
    warmupIterations: number = 100
  ): Promise<BenchmarkResult> {
    console.log(`🏃 开始基准测试: ${name} (${iterations}次迭代)`);

    // 预热阶段
    for (let i = 0; i < warmupIterations; i++) {
      await testFn();
    }

    // 清理垃圾回收
    if (window.gc) {
      window.gc();
    }

    // 获取初始内存使用
    const initialMemory = this.getMemoryUsage();
    const startTime = performance.now();

    // 执行测试
    for (let i = 0; i < iterations; i++) {
      await testFn();
    }

    const endTime = performance.now();
    const finalMemory = this.getMemoryUsage();

    const duration = endTime - startTime;
    const opsPerSecond = (iterations / duration) * 1000;

    const result: BenchmarkResult = {
      name,
      duration,
      operations: iterations,
      opsPerSecond,
      memoryUsage: {
        before: initialMemory,
        after: finalMemory,
        delta: finalMemory - initialMemory
      }
    };

    this.results.push(result);
    
    console.log(`✅ ${name}: ${duration.toFixed(2)}ms, ${opsPerSecond.toFixed(0)} ops/sec`);
    
    return result;
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * 运行模拟功能性能测试
   */
  async runImpersonationBenchmarks(): Promise<BenchmarkSuite> {
    console.log('🎭 运行模拟功能性能基准测试...');
    
    const suiteResults: BenchmarkResult[] = [];

    // 测试1: 模拟状态检查
    const statusCheckResult = await this.benchmark(
      'impersonation-status-check',
      // ✅ FIXED - Change return type from Promise<mockStatus> to Promise<void> (TS2345)
      async () => {
        const mockStatus = {
          is_impersonating: true,
          session: {
            sessionId: 'test-session',
            enterpriseId: 1,
            startedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 3600000).toISOString()
          }
        };

        // 模拟状态解析逻辑 (just run the logic, don't return)
        await Promise.resolve(mockStatus);
      },
      5000,
      500
    );
    suiteResults.push(statusCheckResult);

    // 测试2: 企业数据渲染
    const enterpriseRenderResult = await this.benchmark(
      'enterprise-data-rendering',
      // ✅ FIXED - Remove return statement to match void return type (TS2345)
      () => {
        const enterprises = Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          name: `企业 ${i + 1}`,
          code: `ENT${i + 1}`,
          status: Math.random() > 0.5 ? 'active' : 'inactive'
        }));

        // 模拟React渲染逻辑 (just run the logic, don't return)
        const rendered = enterprises.map(ent => `<div key="${ent.id}">${ent.name}</div>`);
        rendered.join(''); // Run but don't return
      },
      2000,
      200
    );
    suiteResults.push(enterpriseRenderResult);

    // 测试3: 搜索过滤
    const searchFilterResult = await this.benchmark(
      'enterprise-search-filter',
      // ✅ FIXED - Remove return statement to match void return type (TS2345)
      () => {
        const enterprises = Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          name: `测试企业 ${i + 1}`,
          code: `TEST${i + 1}`
        }));

        const searchTerm = '测试';
        const filtered = enterprises.filter(ent =>
          ent.name.includes(searchTerm) || ent.code.includes(searchTerm)
        );

        // Run the filter but don't return
        filtered.length; // Access to ensure it runs
      },
      1000,
      100
    );
    suiteResults.push(searchFilterResult);

    // 测试4: 权限检查
    const permissionCheckResult = await this.benchmark(
      'permission-validation',
      // ✅ FIXED - Remove return statement to match void return type (TS2345)
      () => {
        const permissions = {
          canStartImpersonation: true,
          canExitImpersonation: true,
          canViewHistory: true,
          restrictedActions: ['delete_user', 'modify_system']
        };

        const action = 'start_impersonation';
        const hasPermission = permissions.canStartImpersonation &&
                             !permissions.restrictedActions.includes(action);

        // Run the check but don't return
        Boolean(hasPermission); // Ensure the check runs
      },
      10000,
      1000
    );
    suiteResults.push(permissionCheckResult);

    return this.createBenchmarkSuite('Impersonation Performance Tests', suiteResults);
  }

  /**
   * 运行组件渲染性能测试
   */
  async runComponentBenchmarks(): Promise<BenchmarkSuite> {
    console.log('⚛️ 运行组件渲染性能基准测试...');
    
    const suiteResults: BenchmarkResult[] = [];

    // 测试1: 基础组件渲染
    const basicRenderResult = await this.benchmark(
      'basic-component-render',
      () => {
        const element = document.createElement('div');
        element.className = 'test-component';
        element.innerHTML = '<span>测试内容</span>';
        document.body.appendChild(element);
        document.body.removeChild(element);
      },
      1000
    );
    suiteResults.push(basicRenderResult);

    // 测试2: 列表渲染
    const listRenderResult = await this.benchmark(
      'list-component-render',
      () => {
        const container = document.createElement('div');
        const items = Array.from({ length: 100 }, (_, i) => `<div>项目 ${i + 1}</div>`);
        container.innerHTML = items.join('');
        document.body.appendChild(container);
        document.body.removeChild(container);
      },
      500
    );
    suiteResults.push(listRenderResult);

    // 测试3: 表单渲染
    const formRenderResult = await this.benchmark(
      'form-component-render',
      () => {
        const form = document.createElement('form');
        form.innerHTML = `
          <input type="text" name="name" placeholder="姓名" />
          <input type="email" name="email" placeholder="邮箱" />
          <select name="role">
            <option value="admin">管理员</option>
            <option value="user">用户</option>
          </select>
          <button type="submit">提交</button>
        `;
        document.body.appendChild(form);
        document.body.removeChild(form);
      },
      800
    );
    suiteResults.push(formRenderResult);

    return this.createBenchmarkSuite('Component Rendering Tests', suiteResults);
  }

  /**
   * 运行数据处理性能测试
   */
  async runDataProcessingBenchmarks(): Promise<BenchmarkSuite> {
    console.log('📊 运行数据处理性能基准测试...');
    
    const suiteResults: BenchmarkResult[] = [];

    // 测试1: JSON解析
    const jsonParseResult = await this.benchmark(
      'json-parsing',
      // ✅ FIXED - Remove return statement to match void return type (TS2345)
      () => {
        const largeObject = {
          enterprises: Array.from({ length: 1000 }, (_, i) => ({
            id: i + 1,
            name: `企业 ${i + 1}`,
            users: Array.from({ length: 10 }, (_, j) => ({
              id: j + 1,
              name: `用户 ${j + 1}`,
              email: `user${j + 1}@enterprise${i + 1}.com`
            }))
          }))
        };

        const json = JSON.stringify(largeObject);
        const parsed = JSON.parse(json);
        // Run the parse but don't return
        Object.keys(parsed); // Ensure it runs
      },
      100
    );
    suiteResults.push(jsonParseResult);

    // 测试2: 数组操作
    const arrayProcessingResult = await this.benchmark(
      'array-processing',
      // ✅ FIXED - Remove return statement to match void return type (TS2345)
      () => {
        const data = Array.from({ length: 10000 }, (_, i) => ({
          id: i + 1,
          value: Math.random() * 100,
          category: i % 5
        }));

        // 执行各种数组操作
        const filtered = data.filter(item => item.value > 50);
        const grouped = filtered.reduce((acc, item) => {
          acc[item.category] = acc[item.category] || [];
          acc[item.category].push(item);
          return acc;
        }, {} as Record<number, any[]>);

        const sorted = Object.values(grouped).map(group =>
          group.sort((a, b) => b.value - a.value)
        );

        // Run the operations but don't return
        sorted.length; // Ensure it runs
      },
      50
    );
    suiteResults.push(arrayProcessingResult);

    // 测试3: 正则表达式
    const regexResult = await this.benchmark(
      'regex-validation',
      // ✅ FIXED - Remove return statement to match void return type (TS2345)
      () => {
        const patterns = {
          email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          phone: /^1[3-9]\d{9}$/,
          idCard: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/
        };

        const testData = [
          'user@example.com',
          '13812345678',
          '110101199003074316'
        ];

        const results = testData.map(data => {
          return {
            email: patterns.email.test(data),
            phone: patterns.phone.test(data),
            idCard: patterns.idCard.test(data)
          };
        });

        // Run the validation but don't return
        results.length; // Ensure it runs
      },
      2000
    );
    suiteResults.push(regexResult);

    return this.createBenchmarkSuite('Data Processing Tests', suiteResults);
  }

  /**
   * 运行内存使用测试
   */
  async runMemoryBenchmarks(): Promise<BenchmarkSuite> {
    console.log('🧠 运行内存使用基准测试...');
    
    const suiteResults: BenchmarkResult[] = [];

    // 测试1: 对象创建和销毁
    const objectLifecycleResult = await this.benchmark(
      'object-lifecycle',
      () => {
        const objects = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: new Array(100).fill(0).map((_, j) => ({ value: i * j })),
          timestamp: Date.now()
        }));

        // 模拟对象使用
        objects.forEach(obj => {
          obj.data.forEach(item => {
            item.value *= 2;
          });
        });

        // 清空引用
        objects.length = 0;
      },
      100
    );
    suiteResults.push(objectLifecycleResult);

    // 测试2: 闭包内存使用
    const closureResult = await this.benchmark(
      'closure-memory-usage',
      () => {
        const createCounter = (initial: number) => {
          let count = initial;
          const history: number[] = [];
          
          return {
            increment: () => {
              count++;
              history.push(count);
              return count;
            },
            getHistory: () => history.slice(),
            reset: () => {
              count = initial;
              history.length = 0;
            }
          };
        };

        const counters = Array.from({ length: 100 }, (_, i) => createCounter(i));
        
        counters.forEach(counter => {
          for (let j = 0; j < 50; j++) {
            counter.increment();
          }
        });

        counters.forEach(counter => counter.reset());
      },
      200
    );
    suiteResults.push(closureResult);

    return this.createBenchmarkSuite('Memory Usage Tests', suiteResults);
  }

  /**
   * 创建基准测试套件结果
   */
  private createBenchmarkSuite(name: string, results: BenchmarkResult[]): BenchmarkSuite {
    const totalDuration = results.reduce((sum, result) => sum + result.duration, 0);
    const averageDuration = totalDuration / results.length;
    
    const sortedByDuration = [...results].sort((a, b) => a.duration - b.duration);
    const fastest = sortedByDuration[0]?.name || '';
    const slowest = sortedByDuration[sortedByDuration.length - 1]?.name || '';

    return {
      name,
      results,
      totalDuration,
      summary: {
        fastest,
        slowest,
        averageDuration
      }
    };
  }

  /**
   * 运行完整的性能基准测试套件
   */
  async runAllBenchmarks(): Promise<{
    impersonation: BenchmarkSuite;
    components: BenchmarkSuite;
    dataProcessing: BenchmarkSuite;
    memory: BenchmarkSuite;
    overall: {
      totalTime: number;
      testCount: number;
      averageTestTime: number;
    };
  }> {
    console.log('🚀 开始运行完整性能基准测试套件...');
    const startTime = performance.now();

    const [impersonation, components, dataProcessing, memory] = await Promise.all([
      this.runImpersonationBenchmarks(),
      this.runComponentBenchmarks(),
      this.runDataProcessingBenchmarks(),
      this.runMemoryBenchmarks()
    ]);

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const totalTests = impersonation.results.length + 
                      components.results.length + 
                      dataProcessing.results.length + 
                      memory.results.length;

    const overall = {
      totalTime,
      testCount: totalTests,
      averageTestTime: totalTime / totalTests
    };

    console.log(`✅ 性能基准测试完成: ${totalTests}个测试, 耗时 ${totalTime.toFixed(2)}ms`);

    return {
      impersonation,
      components,
      dataProcessing,
      memory,
      overall
    };
  }

  /**
   * 导出基准测试报告
   */
  exportBenchmarkReport(results: any): string {
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        memory: 'memory' in performance ? (performance as any).memory : null,
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
      },
      results,
      recommendations: this.generateRecommendations(results)
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 生成性能建议
   */
  private generateRecommendations(results: any): string[] {
    const recommendations: string[] = [];

    // 检查模拟功能性能
    const impersonationResults = results.impersonation.results;
    const statusCheck = impersonationResults.find((r: BenchmarkResult) => r.name === 'impersonation-status-check');
    if (statusCheck && statusCheck.opsPerSecond < 1000) {
      recommendations.push('模拟状态检查性能较低，建议优化状态管理逻辑');
    }

    // 检查渲染性能
    const componentResults = results.components.results;
    const listRender = componentResults.find((r: BenchmarkResult) => r.name === 'list-component-render');
    if (listRender && listRender.opsPerSecond < 100) {
      recommendations.push('列表渲染性能较低，建议实施虚拟化');
    }

    // 检查内存使用
    const memoryResults = results.memory.results;
    const hasHighMemoryUsage = memoryResults.some((r: BenchmarkResult) => 
      r.memoryUsage && r.memoryUsage.delta > 10 * 1024 * 1024 // 10MB
    );
    if (hasHighMemoryUsage) {
      recommendations.push('检测到高内存使用，建议检查内存泄漏');
    }

    // 检查整体性能
    if (results.overall.averageTestTime > 100) {
      recommendations.push('整体性能表现一般，建议进行全面优化');
    }

    return recommendations;
  }

  /**
   * 清除结果
   */
  clearResults(): void {
    this.results = [];
  }
}

// 创建全局基准测试实例
const performanceBenchmark = new PerformanceBenchmark();

export default performanceBenchmark;