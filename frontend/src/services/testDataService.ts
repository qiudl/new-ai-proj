import { message } from 'antd';
import {
  WorkPattern,
  TaskTemplate,
  GenerateTimerDataRequest,
  GenerateTimerDataResponse,
  QuickGenerateRequest,
  CleanupTestDataRequest,
  TestDataStats,
  TestDataApiResponse
} from '../types/testData';

const BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '');
const API_BASE = `${BASE_URL}/api/v1/test-data`;

class TestDataService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<TestDataApiResponse<T>> {
    const token = localStorage.getItem('accessToken');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`Test data API error:`, error);
      throw error;
    }
  }

  async getWorkPatterns(): Promise<Record<string, WorkPattern>> {
    // ✅ FIXED - makeRequest返回包装对象，使用类型断言
    const response = await this.makeRequest<any>('/work-patterns') as { patterns?: Record<string, WorkPattern> };
    return response.patterns || {};
  }

  async getTaskTemplates(): Promise<TaskTemplate[]> {
    // ✅ FIXED - makeRequest返回包装对象，使用类型断言
    const response = await this.makeRequest<any>('/task-templates') as { templates?: TaskTemplate[] };
    return response.templates || [];
  }

  async generateTimerData(request: GenerateTimerDataRequest): Promise<GenerateTimerDataResponse> {
    const response = await this.makeRequest<GenerateTimerDataResponse>('/', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (response.success) {
      message.success(response.message || '测试数据生成成功');
    }

    // ✅ FIXED - Use double assertion through unknown for type conversion (TS2352)
    return response as unknown as GenerateTimerDataResponse;
  }

  async quickGenerate(request: QuickGenerateRequest): Promise<GenerateTimerDataResponse> {
    const response = await this.makeRequest<GenerateTimerDataResponse>('/quick-generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (response.success) {
      message.success(response.message || '快速生成测试数据成功');
    }

    // ✅ FIXED - Use double assertion through unknown for type conversion (TS2352)
    return response as unknown as GenerateTimerDataResponse;
  }

  async getGenerationStatus(): Promise<TestDataStats> {
    // ✅ FIXED - makeRequest返回包装对象，使用类型断言
    const response = await this.makeRequest<any>('/status') as { stats?: TestDataStats };
    return response.stats || {
      total_timer_sessions: 0,
      total_hours: 0,
      date_range: '无数据',
      sessions_by_pattern: {},
      daily_breakdown: []
    };
  }

  async cleanupTestData(request: CleanupTestDataRequest): Promise<void> {
    const response = await this.makeRequest('/cleanup', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (response.success) {
      message.success(response.message || '清理测试数据成功');
    }
  }
}

export const testDataService = new TestDataService();