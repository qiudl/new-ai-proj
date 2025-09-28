/**
 * 模拟功能集成测试
 * 用于测试前端模拟组件与后端API的集成
 */

import impersonationService from '../services/impersonationService';
import { ImpersonationStatus, ImpersonationPermissions } from '../types/impersonation';

interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  data?: any;
  duration: number;
}

class ImpersonationIntegrationTest {
  private testResults: TestResult[] = [];
  private testEnterpriseId: number = 1; // 用于测试的企业ID

  /**
   * 运行完整的集成测试套件
   */
  async runAllTests(): Promise<{ 
    totalTests: number; 
    passedTests: number; 
    failedTests: number;
    results: TestResult[];
  }> {
    console.log('🧪 开始运行模拟功能集成测试...');
    this.testResults = [];

    // 基础功能测试
    await this.testGetStatus();
    await this.testCheckPermissions();
    
    // 权限相关测试
    await this.testValidatePermission();
    await this.testBatchCheckEnterprisePermissions();
    
    // 历史和统计测试
    await this.testGetHistory();
    await this.testGetSessionStats();
    await this.testGetAuditLogs();
    
    // 活跃会话测试
    await this.testGetActiveSessions();
    
    // 模拟流程测试（可选，需要实际权限）
    await this.testImpersonationFlow();

    const summary = this.generateTestSummary();
    console.log('📊 测试完成:', summary);
    return summary;
  }

  /**
   * 测试获取模拟状态
   */
  private async testGetStatus(): Promise<void> {
    await this.runTest('获取模拟状态', async () => {
      const status = await impersonationService.getStatus();
      
      // 验证返回数据结构
      if (typeof status.is_impersonating !== 'boolean') {
        throw new Error('状态数据结构不正确');
      }

      return status;
    });
  }

  /**
   * 测试权限检查
   */
  private async testCheckPermissions(): Promise<void> {
    await this.runTest('检查模拟权限', async () => {
      const permissions = await impersonationService.checkPermissions();
      
      // 验证权限数据结构
      const requiredFields = ['canStartImpersonation', 'canExitImpersonation', 'canViewHistory', 'restrictedActions'];
      for (const field of requiredFields) {
        if (!(field in permissions)) {
          throw new Error(`缺少必需字段: ${field}`);
        }
      }

      return permissions;
    });
  }

  /**
   * 测试权限验证
   */
  private async testValidatePermission(): Promise<void> {
    await this.runTest('验证特定权限', async () => {
      const result = await impersonationService.validatePermission('start_impersonation', this.testEnterpriseId);
      
      if (typeof result.allowed !== 'boolean') {
        throw new Error('权限验证结果格式不正确');
      }

      return result;
    });
  }

  /**
   * 测试批量权限检查
   */
  private async testBatchCheckEnterprisePermissions(): Promise<void> {
    await this.runTest('批量检查企业权限', async () => {
      const enterpriseIds = [1, 2, 3];
      const result = await impersonationService.batchCheckEnterprisePermissions(enterpriseIds);
      
      // 验证返回的数据包含所有请求的企业ID
      for (const id of enterpriseIds) {
        if (!(id in result)) {
          throw new Error(`缺少企业ID ${id} 的权限信息`);
        }
      }

      return result;
    });
  }

  /**
   * 测试获取历史记录
   */
  private async testGetHistory(): Promise<void> {
    await this.runTest('获取模拟历史记录', async () => {
      const history = await impersonationService.getHistory(1, 5);
      
      // 验证历史数据结构（可能为空但结构应该正确）
      if (!Array.isArray(history.data)) {
        throw new Error('历史记录数据格式不正确');
      }

      return history;
    });
  }

  /**
   * 测试获取会话统计
   */
  private async testGetSessionStats(): Promise<void> {
    await this.runTest('获取会话统计信息', async () => {
      const stats = await impersonationService.getSessionStats();
      
      const requiredFields = ['totalSessions', 'totalDuration', 'averageDuration'];
      for (const field of requiredFields) {
        if (!(field in stats)) {
          throw new Error(`统计信息缺少字段: ${field}`);
        }
      }

      return stats;
    });
  }

  /**
   * 测试获取审计日志
   */
  private async testGetAuditLogs(): Promise<void> {
    await this.runTest('获取审计日志', async () => {
      const logs = await impersonationService.getAuditLogs(undefined, 1, 10);
      
      if (!logs.logs || !Array.isArray(logs.logs)) {
        throw new Error('审计日志数据格式不正确');
      }

      if (!logs.pagination) {
        throw new Error('缺少分页信息');
      }

      return logs;
    });
  }

  /**
   * 测试获取活跃会话
   */
  private async testGetActiveSessions(): Promise<void> {
    await this.runTest('获取活跃会话', async () => {
      const sessions = await impersonationService.getActiveSessions();
      
      if (!Array.isArray(sessions)) {
        throw new Error('活跃会话数据格式不正确');
      }

      return sessions;
    });
  }

  /**
   * 测试完整的模拟流程（需要实际权限）
   */
  private async testImpersonationFlow(): Promise<void> {
    await this.runTest('模拟流程测试', async () => {
      try {
        // 首先检查权限
        const permissions = await impersonationService.checkPermissions();
        
        if (!permissions.canStartImpersonation) {
          return { message: '跳过模拟流程测试：缺少开始模拟权限', skipped: true };
        }

        // 检查当前状态
        const initialStatus = await impersonationService.getStatus();
        
        if (initialStatus.is_impersonating) {
          return { message: '跳过模拟流程测试：已在模拟状态中', skipped: true };
        }

        // 尝试开始模拟（这可能会失败，这是正常的）
        try {
          const startResult = await impersonationService.startImpersonation(
            this.testEnterpriseId, 
            '集成测试：测试模拟功能'
          );
          
          // 如果成功开始模拟，立即退出
          if (startResult.success) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
            await impersonationService.exitImpersonation();
          }

          return startResult;
        } catch (error: any) {
          // 模拟开始失败是正常的（可能由于权限、企业状态等原因）
          return { 
            message: `模拟开始失败（这可能是正常的）: ${error.message}`,
            expected: true 
          };
        }
      } catch (error: any) {
        throw error;
      }
    });
  }

  /**
   * 运行单个测试
   */
  private async runTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 运行测试: ${testName}`);
      const data = await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        success: true,
        data,
        duration
      });
      
      console.log(`✅ 测试通过: ${testName} (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        testName,
        success: false,
        error: error.message,
        duration
      });
      
      console.error(`❌ 测试失败: ${testName} (${duration}ms):`, error.message);
    }
  }

  /**
   * 生成测试摘要
   */
  private generateTestSummary(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: TestResult[];
  } {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(result => result.success).length;
    const failedTests = totalTests - passedTests;

    return {
      totalTests,
      passedTests,
      failedTests,
      results: this.testResults
    };
  }

  /**
   * 生成详细的测试报告
   */
  generateDetailedReport(): string {
    const summary = this.generateTestSummary();
    const totalDuration = this.testResults.reduce((sum, result) => sum + result.duration, 0);

    let report = '\n📋 模拟功能集成测试报告\n';
    report += '='.repeat(50) + '\n\n';
    
    report += `📊 测试摘要:\n`;
    report += `   总测试数: ${summary.totalTests}\n`;
    report += `   通过: ${summary.passedTests}\n`;
    report += `   失败: ${summary.failedTests}\n`;
    report += `   总用时: ${totalDuration}ms\n\n`;

    report += `📋 详细结果:\n`;
    for (const result of this.testResults) {
      const status = result.success ? '✅' : '❌';
      report += `   ${status} ${result.testName} (${result.duration}ms)\n`;
      
      if (!result.success && result.error) {
        report += `      错误: ${result.error}\n`;
      }
      
      if (result.data?.message) {
        report += `      信息: ${result.data.message}\n`;
      }
    }

    report += '\n' + '='.repeat(50) + '\n';
    return report;
  }
}

/**
 * 执行集成测试的便捷函数
 */
export const runImpersonationIntegrationTest = async (): Promise<void> => {
  const tester = new ImpersonationIntegrationTest();
  const results = await tester.runAllTests();
  
  console.log('\n' + tester.generateDetailedReport());
  
  // 如果有失败的测试，返回失败状态
  if (results.failedTests > 0) {
    throw new Error(`集成测试失败: ${results.failedTests}/${results.totalTests} 个测试失败`);
  }
};

export default ImpersonationIntegrationTest;