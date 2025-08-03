/**
 * JWT调试功能测试脚本
 * 用于验证JWT调试系统是否正常工作
 */

import { jwtDebugger } from './jwtDebugger';

// 测试用的模拟token
const MOCK_VALID_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InRlc3QiLCJyb2xlIjoiYWRtaW4iLCJ1c2VyX3R5cGUiOiJzeXN0ZW0iLCJzdWIiOiJ0ZXN0IiwiZXhwIjoxNzg1MDE4NDcyLCJuYmYiOjE3NTM0ODI0NzIsImlhdCI6MTc1MzQ4MjQ3Mn0.fake_signature';
const MOCK_EXPIRED_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InRlc3QiLCJyb2xlIjoiYWRtaW4iLCJ1c2VyX3R5cGUiOiJzeXN0ZW0iLCJzdWIiOiJ0ZXN0IiwiZXhwIjoxNjUzNDgyNDcyLCJuYmYiOjE2NTM0ODI0NzIsImlhdCI6MTY1MzQ4MjQ3Mn0.fake_signature';
const MOCK_INVALID_TOKEN = 'invalid.token.format';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
}

class JWTTestRunner {
  private results: TestResult[] = [];

  /**
   * 运行所有测试
   */
  async runAllTests(): Promise<TestResult[]> {
    this.results = [];

    // 保存原始token
    const originalToken = localStorage.getItem('token');

    try {
      // 基础功能测试
      await this.testBasicFunctionality();
      
      // Token解析测试
      await this.testTokenParsing();
      
      // 状态检查测试
      await this.testStatusChecking();
      
      // 模块记录测试
      await this.testModuleLogging();
      
      // 调试历史测试
      await this.testDebugHistory();

    } finally {
      // 恢复原始token
      if (originalToken) {
        localStorage.setItem('token', originalToken);
      } else {
        localStorage.removeItem('token');
      }
    }

    this.printTestResults();
    return this.results;
  }

  /**
   * 测试基础功能
   */
  private async testBasicFunctionality(): Promise<void> {
    // 测试1: 检查调试器实例
    try {
      const status = jwtDebugger.checkJWTStatus();
      this.addResult('基础功能 - 实例检查', true, '调试器实例正常');
    } catch (error) {
      this.addResult('基础功能 - 实例检查', false, `实例异常: ${error}`);
    }

    // 测试2: 检查方法存在性
    const methods = ['checkJWTStatus', 'logModuleJWTStatus', 'printJWTStatus', 'testJWTWithAPI'];
    const missingMethods = methods.filter(method => typeof (jwtDebugger as unknown)[method] !== 'function');
    
    this.addResult(
      '基础功能 - 方法完整性',
      missingMethods.length === 0,
      missingMethods.length === 0 ? '所有必需方法存在' : `缺少方法: ${missingMethods.join(', ')}`
    );
  }

  /**
   * 测试Token解析
   */
  private async testTokenParsing(): Promise<void> {
    // 测试1: 无Token情况
    localStorage.removeItem('token');
    const noTokenStatus = jwtDebugger.checkJWTStatus();
    this.addResult(
      'Token解析 - 无Token',
      !noTokenStatus.hasToken && !noTokenStatus.isValid,
      `hasToken: ${noTokenStatus.hasToken}, isValid: ${noTokenStatus.isValid}`
    );

    // 测试2: 有效Token解析
    localStorage.setItem('token', MOCK_VALID_TOKEN);
    const validTokenStatus = jwtDebugger.checkJWTStatus();
    this.addResult(
      'Token解析 - 有效Token',
      validTokenStatus.hasToken && validTokenStatus.isValid && validTokenStatus.payload?.username === 'test',
      `hasToken: ${validTokenStatus.hasToken}, isValid: ${validTokenStatus.isValid}, username: ${validTokenStatus.payload?.username}`
    );

    // 测试3: 过期Token检查
    localStorage.setItem('token', MOCK_EXPIRED_TOKEN);
    const expiredTokenStatus = jwtDebugger.checkJWTStatus();
    this.addResult(
      'Token解析 - 过期Token',
      expiredTokenStatus.hasToken && expiredTokenStatus.isExpired,
      `hasToken: ${expiredTokenStatus.hasToken}, isExpired: ${expiredTokenStatus.isExpired}`
    );

    // 测试4: 无效Token格式
    localStorage.setItem('token', MOCK_INVALID_TOKEN);
    const invalidTokenStatus = jwtDebugger.checkJWTStatus();
    this.addResult(
      'Token解析 - 无效格式',
      invalidTokenStatus.hasToken && !invalidTokenStatus.isValid && invalidTokenStatus.errors.length > 0,
      `hasToken: ${invalidTokenStatus.hasToken}, isValid: ${invalidTokenStatus.isValid}, errors: ${invalidTokenStatus.errors.length}`
    );
  }

  /**
   * 测试状态检查
   */
  private async testStatusChecking(): Promise<void> {
    // 恢复有效token
    localStorage.setItem('token', MOCK_VALID_TOKEN);

    // 测试Authorization头检查
    const authHeader = jwtDebugger.checkAuthorizationHeader();
    this.addResult(
      '状态检查 - Authorization头',
      !!(authHeader.hasHeader && authHeader.isValid && authHeader.headerValue?.startsWith('Bearer ')),
      `hasHeader: ${authHeader.hasHeader}, isValid: ${authHeader.isValid}`
    );

    // 测试调试报告生成
    try {
      const report = jwtDebugger.generateDebugReport();
      this.addResult(
        '状态检查 - 调试报告',
        typeof report === 'string' && report.includes('JWT调试报告'),
        `报告长度: ${report.length} 字符`
      );
    } catch (error) {
      this.addResult('状态检查 - 调试报告', false, `报告生成失败: ${error}`);
    }
  }

  /**
   * 测试模块记录
   */
  private async testModuleLogging(): Promise<void> {
    // 清除历史记录
    jwtDebugger.clearDebugHistory();

    // 记录几个模块调用
    const testModules = ['TestModule1', 'TestModule2', 'TestModule3'];
    testModules.forEach(module => {
      jwtDebugger.logModuleJWTStatus(module);
    });

    const history = jwtDebugger.getDebugHistory();
    this.addResult(
      '模块记录 - 记录功能',
      history.length === testModules.length,
      `记录了 ${history.length} 个模块调用`
    );

    // 检查记录内容
    const hasCorrectModules = testModules.every(module => 
      history.some(record => record.moduleName === module)
    );
    this.addResult(
      '模块记录 - 内容正确性',
      hasCorrectModules,
      `所有测试模块都被正确记录: ${hasCorrectModules}`
    );
  }

  /**
   * 测试调试历史
   */
  private async testDebugHistory(): Promise<void> {
    // 测试历史清除
    jwtDebugger.clearDebugHistory();
    const emptyHistory = jwtDebugger.getDebugHistory();
    this.addResult(
      '调试历史 - 清除功能',
      emptyHistory.length === 0,
      `清除后历史记录数: ${emptyHistory.length}`
    );

    // 测试历史限制（模拟大量记录）
    for (let i = 0; i < 105; i++) {
      jwtDebugger.logModuleJWTStatus(`TestModule${i}`);
    }
    
    const limitedHistory = jwtDebugger.getDebugHistory();
    this.addResult(
      '调试历史 - 数量限制',
      limitedHistory.length <= 100,
      `历史记录数量: ${limitedHistory.length} (应该≤100)`
    );
  }

  /**
   * 添加测试结果
   */
  private addResult(testName: string, passed: boolean, message: string): void {
    this.results.push({ testName, passed, message });
    const icon = passed ? '✅' : '❌';
    }

  /**
   * 打印测试总结
   */
  private printTestResults(): void {
    const passedCount = this.results.filter(r => r.passed).length;
    const totalCount = this.results.length;
    const passRate = ((passedCount / totalCount) * 100).toFixed(1);

    if (passedCount === totalCount) {
      } else {
      this.results.filter(r => !r.passed).forEach(result => {
        });
    }
  }
}

// 导出测试运行器
export const jwtTestRunner = new JWTTestRunner();

// 便捷函数
export const runJWTTests = () => jwtTestRunner.runAllTests();

// 在开发环境下挂载到window
if (process.env.NODE_ENV === 'development') {
  (window as unknown).runJWTTests = runJWTTests;
  (window as unknown).jwtTestRunner = jwtTestRunner;
}

export default jwtTestRunner;