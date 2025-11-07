// AI配置管理相关类型定义
// ✅ FIXED - Import and re-export AIProvider to make it available to other modules (TS2459)
import { AIProvider } from './ai';

// ✅ FIXED - Re-export as type when isolatedModules is enabled (TS1205)
// Re-export AIProvider so it can be imported from this module
export type { AIProvider };

/**
 * AI配置接口
 */
export interface AIConfig {
  id: number;
  provider: AIProvider;
  apiKey: string;
  model: string;
  isEnabled: boolean;
  maxTokens?: number;
  temperature?: number;
  totalTests?: number;
  successfulTests?: number;
  failedTests?: number;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 测试日志状态
 */
export enum TestLogStatus {
  Success = 'success',
  Failed = 'failed',
  Timeout = 'timeout'
}

/**
 * 测试类型
 */
export enum TestType {
  Manual = 'manual',
  Auto = 'auto',
  Validation = 'validation'
}

/**
 * AI使用统计
 */
export interface AIUsageStatistics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * 单条测试日志
 */
export interface TestLog {
  id: number;
  configId: number;
  provider: AIProvider;
  testQuestion: string;
  testText?: string; // 别名，向后兼容
  aiResponse: string;
  testStatus: TestLogStatus;
  responseTimeMs: number;
  tokensUsed?: number;
  errorMessage?: string;
  testType: TestType;
  model?: string;
  usage?: AIUsageStatistics;
  createdBy?: number;
  createdAt: string;
}

/**
 * 测试历史分页信息
 */
export interface TestHistoryPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 测试历史响应
 */
export interface TestHistoryResponse {
  data: TestLog[];
  pagination: TestHistoryPagination;
}

/**
 * 测试历史过滤条件
 */
export interface TestHistoryFilters {
  status?: TestLogStatus | 'all';
  testType?: TestType | 'all';
  search?: string;
  page: number;
  limit: number;
}

/**
 * 测试统计数据
 */
export interface TestStatistics {
  totalTests: number;
  successRate: number;
  averageResponseTime: number;
}

/**
 * 验证测试请求
 */
export interface ValidationTestRequest {
  provider: AIProvider;
  apiKey: string;
  model: string;
  testText?: string;
}

/**
 * 验证测试响应
 */
export interface ValidationTestResponse {
  success: boolean;
  responseTime: number;
  conversation?: {
    question: string;
    answer: string;
    model: string;
    usage?: AIUsageStatistics;
  };
  error?: string;
}
