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
    } catch (error: any) {
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
    console.log('🧪 开始基础操作测试...');

    // 测试获取文档列表
    await this.runTest('获取文档列表', async () => {
      const documents = await unifiedDocumentService.getDocuments();
      if (!Array.isArray(documents)) {
        throw new Error('返回结果不是数组');
      }
      console.log(`📄 获取到 ${documents.length} 个文档`);
    });

    // 测试获取文档列表（带文件夹）
    await this.runTest('获取指定文件夹文档', async () => {
      const documents = await unifiedDocumentService.getDocuments(1);
      if (!Array.isArray(documents)) {
        throw new Error('返回结果不是数组');
      }
      console.log(`📁 文件夹1中有 ${documents.length} 个文档`);
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
      
      console.log(`🔍 搜索结果: ${result.total} 个文档，当前页 ${result.documents.length} 个`);
    });
  }

  // 创建文档测试
  async testDocumentCreation(): Promise<void> {
    console.log('🧪 开始文档创建测试...');

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
      
      console.log(`📝 成功创建文档: ${created.title} (ID: ${created.id})`);
      
      // 存储创建的文档ID供后续测试使用
      (window as any).testDocumentId = created.id;
    });
  }

  // 文档操作测试
  async testDocumentOperations(): Promise<void> {
    console.log('🧪 开始文档操作测试...');
    
    const testDocId = (window as any).testDocumentId;
    if (!testDocId) {
      console.log('⏭️ 跳过文档操作测试 - 没有测试文档ID');
      return;
    }

    await this.runTest('获取文档详情', async () => {
      const document = await unifiedDocumentService.getDocument(testDocId);
      
      if (!document || document.id !== testDocId) {
        throw new Error('获取的文档信息不正确');
      }
      
      console.log(`📖 获取文档: ${document.title}`);
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
      
      console.log(`✏️ 成功更新文档: ${updated.title}`);
    });
  }

  // 高级功能测试
  async testAdvancedFeatures(): Promise<void> {
    console.log('🧪 开始高级功能测试...');

    await this.runTest('获取可用项目', async () => {
      const projects = await unifiedDocumentService.getAvailableProjects();
      
      if (!Array.isArray(projects)) {
        throw new Error('项目列表格式错误');
      }
      
      console.log(`🏢 获取到 ${projects.length} 个可用项目`);  
    });

    await this.runTest('获取可用客户', async () => {
      const customers = await unifiedDocumentService.getAvailableCustomers();
      
      if (!Array.isArray(customers)) {
        throw new Error('客户列表格式错误');
      }
      
      console.log(`👥 获取到 ${customers.length} 个可用客户`); 
    });

    const testDocId = (window as any).testDocumentId;
    if (testDocId) {
      await this.runTest('复制文档', async () => {
        const copied = await unifiedDocumentService.copyDocument(testDocId);
        
        if (!copied || !copied.id || copied.id === testDocId) {
          throw new Error('文档复制失败');
        }
        
        console.log(`📋 成功复制文档: ${copied.title} (新ID: ${copied.id})`);
        (window as any).copiedDocumentId = copied.id;
      });
    }
  }

  // 清理测试数据
  async cleanupTestData(): Promise<void> {
    console.log('🧹 清理测试数据...');

    const testDocId = (window as any).testDocumentId;
    const copiedDocId = (window as any).copiedDocumentId;

    if (testDocId) {
      await this.runTest('删除测试文档', async () => {
        await unifiedDocumentService.deleteDocument(testDocId);
        console.log(`🗑️ 已删除测试文档 (ID: ${testDocId})`);
      });
    }

    if (copiedDocId) {
      await this.runTest('删除复制的文档', async () => {
        await unifiedDocumentService.deleteDocument(copiedDocId);
        console.log(`🗑️ 已删除复制的文档 (ID: ${copiedDocId})`);
      });
    }
  }

  // 运行所有测试
  async runAllTests(): Promise<void> {
    console.log('🚀 开始 UnifiedDocumentService 手动集成测试');
    console.log('='.repeat(50));

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
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;

    console.log(`✅ 通过: ${passed}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`⏭️ 跳过: ${skipped}`);
    console.log(`📈 总计: ${this.results.length}`);

    if (failed > 0) {
      console.log('\n🔍 失败的测试详情:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => {
          console.log(`  • ${r.testName}: ${r.message}`);
        });
    }

    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    console.log(`⏱️ 平均测试时间: ${avgDuration.toFixed(2)}ms`);

    if (failed === 0) {
      console.log('\n🎉 所有测试通过！UnifiedDocumentService 工作正常！');
    } else {
      console.log('\n⚠️  部分测试失败，需要检查服务实现');
    }
  }
}

// 导出测试器实例
export const serviceTester = new ServiceTester();

// 便捷的全局测试函数
export const runServiceTests = () => serviceTester.runAllTests();

// 在控制台中使用的快捷方式
if (typeof window !== 'undefined') {
  (window as any).runServiceTests = runServiceTests;
  (window as any).serviceTester = serviceTester;
  
  console.log('📋 手动测试工具已加载！');
  console.log('使用方法:');
  console.log('  runServiceTests() - 运行所有测试');
  console.log('  serviceTester.testBasicOperations() - 仅运行基础操作测试');
}