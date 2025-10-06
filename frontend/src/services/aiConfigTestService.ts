import request from '../utils/request';
import type {
  TestHistoryResponse,
  TestHistoryFilters,
  TestLog,
  ValidationTestRequest,
  ValidationTestResponse,
  AIProvider
} from '../types/aiConfig';

/**
 * AI配置测试服务
 */
export class AIConfigTestService {
  /**
   * 获取测试历史列表
   */
  static async getTestHistory(
    provider: AIProvider,
    filters: TestHistoryFilters
  ): Promise<TestHistoryResponse> {
    const params = new URLSearchParams();
    params.append('page', filters.page.toString());
    params.append('limit', filters.limit.toString());

    const response = await request.get<any>(
      `/system/ai-configs/${provider}/test-history?${params.toString()}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || '获取测试历史失败');
    }

    // 后端返回的数据结构映射到前端期望的格式
    const backendData = response.data;

    // 调试：打印实际的数据结构
    console.log('Backend response.data:', backendData);
    console.log('backendData.data type:', typeof backendData.data);
    console.log('Is array?', Array.isArray(backendData.data));

    // 确保data是数组
    const dataArray = Array.isArray(backendData.data)
      ? backendData.data
      : (backendData.data ? [backendData.data] : []);

    const logs = dataArray.map((log: any) => ({
      id: log.id,
      configId: log.configId,
      provider: log.provider,
      testQuestion: log.testPrompt || log.testQuestion || '',  // 后端字段是testPrompt
      aiResponse: log.testResponse || log.aiResponse || '',    // 后端字段是testResponse
      testStatus: log.testStatus,
      responseTimeMs: log.responseTimeMs,
      tokensUsed: log.tokensUsed,
      errorMessage: log.errorMessage,
      testType: log.testType || 'manual',  // 默认为manual
      model: log.model,
      usage: log.usage,
      createdBy: log.testedBy || log.createdBy,  // 后端可能是testedBy
      createdAt: log.createdAt
    }));

    return {
      data: logs,
      pagination: backendData.pagination || {
        total: logs.length,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(logs.length / filters.limit)
      }
    };
  }

  /**
   * 获取测试日志详情
   */
  static async getTestLogDetail(logId: number): Promise<TestLog> {
    const response = await request.get<any>(
      `/system/ai-configs/test-logs/${logId}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || '获取测试详情失败');
    }

    const log = response.data;
    return {
      id: log.id,
      configId: log.configId,
      provider: log.provider,
      testQuestion: log.testPrompt || log.testQuestion || '',
      aiResponse: log.testResponse || log.aiResponse || '',
      testStatus: log.testStatus,
      responseTimeMs: log.responseTimeMs,
      tokensUsed: log.tokensUsed,
      errorMessage: log.errorMessage,
      testType: log.testType || 'manual',
      model: log.model,
      usage: log.usage,
      createdBy: log.testedBy || log.createdBy,
      createdAt: log.createdAt
    };
  }

  /**
   * 执行验证测试
   */
  static async performValidationTest(
    req: ValidationTestRequest
  ): Promise<ValidationTestResponse> {
    const response = await request.post<any>(
      `/system/ai-configs/test`,
      req
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || '验证测试失败');
    }

    return response.data;
  }

  /**
   * 导出测试日志为JSON
   */
  static exportTestLogAsJSON(log: TestLog): void {
    const dataStr = JSON.stringify(log, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `test-log-${log.id}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
