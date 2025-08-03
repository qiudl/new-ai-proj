/**
 * 手动测试脚本：验证 UnifiedDocumentService 在实际环境中的运行
 * 
 * 使用方法：
 * 1. 在浏览器开发者工具的Console中运行
 * 2. 或在React组件中临时调用这些测试函数
 */

import unifiedDocumentService from '../services/unifiedDocumentService';

// 测试结果收集器
interface TestResult {
  testName: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration: number;
}

class ServiceTester {
  private results: TestResult[] = [];

  async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFn();
      this.results.push({
        testName,
        status: 'pass',
        message: '✅ 测试通过',
        duration: Date.now() - startTime
      });
    } catch (error: Error | unknown) {
      this.results.push({
        testName,
        status: 'fail',
        message: `❌ 测试失败: ${error.message}`,
        duration: Date.now() - startTime
      });
    }
  }

  // 基础CRUD测试
  async testBasicOperations(): Promise<void> {
    // 测试获取文档列表
    await this.runTest('获取文档列表', async () => {
      const documents = await unifiedDocumentService.getDocuments();
      if (!Array.isArray(documents)) {
        throw new Error('返回结果不是数组');
      }
      });

    // 测试获取文档列表（带文件夹）
    await this.runTest('获取指定文件夹文档', async () => {
      const documents = await unifiedDocumentService.getDocuments(1);
      if (!Array.isArray(documents)) {
        throw new Error('返回结果不是数组');
      }
      });

    // 测试获取所有文档（带过滤）
    await this.runTest('获取所有文档（带过滤）', async () => {
      const result = await unifiedDocumentService.getAllDocuments({
        page: 1,
        limit: 10,
        search: 'test'
      });
      
      if (!result || typeof result !== 'object') {
        throw new Error('返回结果格式错误');
      }
      
      });
  }

  // 创建文档测试
  async testDocumentCreation(): Promise<void> {
    await this.runTest('创建测试文档', async () => {
      const testDoc = {
        title: `测试文档_${Date.now()}`,
        content: '这是一个测试文档的内容',
        type: 'markdown' as const,
        status: 'draft' as const,
        description: '自动化测试创建的文档',
        tags: ['test', 'automation'],
        visibility: 'private' as const,
        is_template: false
      };

      const created = await unifiedDocumentService.createDocument(testDoc);
      
      if (!created || !created.id) {
        throw new Error('文档创建失败，未返回有效ID');
      }
      
      `);
      
      // 存储创建的文档ID供后续测试使用
      (window as unknown).testDocumentId = created.id;
    });
  }

  // 文档操作测试
  async testDocumentOperations(): Promise<void> {
    const testDocId = (window as unknown).testDocumentId;
    if (!testDocId) {
      return;
    }

    await this.runTest('获取文档详情', async () => {
      const document = await unifiedDocumentService.getDocument(testDocId);
      
      if (!document || document.id !== testDocId) {
        throw new Error('获取的文档信息不正确');
      }
      
      });

    await this.runTest('更新文档', async () => {
      const updateData = {
        title: `更新的测试文档_${Date.now()}`,
        content: '这是更新后的内容',
        description: '已通过自动化测试更新'
      };

      const updated = await unifiedDocumentService.updateDocument(testDocId, updateData);
      
      if (!updated || updated.title !== updateData.title) {
        throw new Error('文档更新失败');
      }
      
      });
  }

  // 高级功能测试
  async testAdvancedFeatures(): Promise<void> {
    await this.runTest('获取可用项目', async () => {
      const projects = await unifiedDocumentService.getAvailableProjects();
      
      if (!Array.isArray(projects)) {
        throw new Error('项目列表格式错误');
      }
      
      });

    await this.runTest('获取可用客户', async () => {
      const customers = await unifiedDocumentService.getAvailableCustomers();
      
      if (!Array.isArray(customers)) {
        throw new Error('客户列表格式错误');
      }
      
      });

    const testDocId = (window as unknown).testDocumentId;
    if (testDocId) {
      await this.runTest('复制文档', async () => {
        const copied = await unifiedDocumentService.copyDocument(testDocId);
        
        if (!copied || !copied.id || copied.id === testDocId) {
          throw new Error('文档复制失败');
        }
        
        `);
        (window as unknown).copiedDocumentId = copied.id;
      });
    }
  }

  // 清理测试数据
  async cleanupTestData(): Promise<void> {
    const testDocId = (window as unknown).testDocumentId;
    const copiedDocId = (window as unknown).copiedDocumentId;

    if (testDocId) {
      await this.runTest('删除测试文档', async () => {
        await unifiedDocumentService.deleteDocument(testDocId);
        `);
      });
    }

    if (copiedDocId) {
      await this.runTest('删除复制的文档', async () => {
        await unifiedDocumentService.deleteDocument(copiedDocId);
        `);
      });
    }
  }

  // 运行所有测试
  async runAllTests(): Promise<void> {
    );

    this.results = [];

    try {
      await this.testBasicOperations();
      await this.testDocumentCreation();  
      await this.testDocumentOperations();
      await this.testAdvancedFeatures();
      await this.cleanupTestData();
    } catch (error) {
      console.error('💥 测试过程中发生严重错误:', error);
    }

    this.printResults();
  }

  // 打印测试结果
  private printResults(): void {
    );
    );

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    if (failed > 0) {
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => {
          });
    }

    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    }ms`);

    if (failed === 0) {
      } else {
      }
  }
}

// 导出测试器实例
export const serviceTester = new ServiceTester();

// 便捷的全局测试函数
export const runServiceTests = () => serviceTester.runAllTests();

// 在控制台中使用的快捷方式
if (typeof window !== 'undefined') {
  (window as unknown).runServiceTests = runServiceTests;
  (window as unknown).serviceTester = serviceTester;
  
  - 运行所有测试');
  - 仅运行基础操作测试');
}