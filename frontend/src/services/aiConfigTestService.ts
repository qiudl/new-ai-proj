import axios from 'axios';
import type {
  TestHistoryResponse,
  TestHistoryFilters,
  TestLog,
  ValidationTestRequest,
  ValidationTestResponse,
  AIProvider
} from '@/types/aiConfig';

const API_BASE_URL = '/api/v1/system/ai-configs';

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

    const response = await axios.get<{
      success: boolean;
      data: TestHistoryResponse;
    }>(`${API_BASE_URL}/${provider}/test-history?${params.toString()}`);

    return response.data.data;
  }

  /**
   * 获取测试日志详情
   */
  static async getTestLogDetail(logId: number): Promise<TestLog> {
    const response = await axios.get<{
      success: boolean;
      data: TestLog;
    }>(`${API_BASE_URL}/test-logs/${logId}`);

    return response.data.data;
  }

  /**
   * 执行验证测试
   */
  static async performValidationTest(
    request: ValidationTestRequest
  ): Promise<ValidationTestResponse> {
    const response = await axios.post<{
      success: boolean;
      data: ValidationTestResponse;
    }>(`${API_BASE_URL}/test`, request);

    return response.data.data;
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
