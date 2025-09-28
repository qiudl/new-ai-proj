import { AIProvider } from './ai';

/**
 * AI任务生成相关类型定义
 * 基于现有AI配置系统，为批量导入子任务功能提供类型支持
 */

// AI任务生成请求接口
export interface AITaskGenerationRequest {
  parentTaskId: number;
  parentTaskTitle: string;
  keywords: string;
  preferredProvider?: AIProvider; // 可选指定AI提供商
  maxTasks?: number; // 最大生成数量，默认5-8个
  complexity?: 'simple' | 'detailed'; // 生成复杂度
  includeTimeEstimate?: boolean; // 是否包含时间估算
  projectId?: number; // 项目ID，用于上下文理解
}

// AI任务生成响应接口
export interface AITaskGenerationResponse {
  success: boolean;
  data?: {
    generatedTasks: GeneratedSubTask[];
    usedProvider: AIProvider;
    usedModel: string;
    generationId: string;
    estimatedQuality: number; // 生成质量评分 0-100
    tokensUsed: {
      input: number;
      output: number;
      total: number;
    };
    estimatedCost?: number; // 预估成本（人民币）
    generationTime: number; // 生成耗时（毫秒）
    reasoning?: string; // AI生成的思路说明
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// 生成的子任务结构
export interface GeneratedSubTask {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  status: 'todo';
  custom_fields?: {
    tags?: string[];
    category?: string;
    ai_generated?: boolean;
    generation_id?: string;
    confidence_score?: number; // 生成置信度 0-100
  };
}

// AI任务生成配置
export interface AITaskGenerationConfig {
  maxTasks: number;
  defaultComplexity: 'simple' | 'detailed';
  includeTimeEstimate: boolean;
  enableQualityCheck: boolean;
  fallbackToSimpleFormat: boolean; // JSON解析失败时是否回退到简单格式
}

// AI提供商选择策略
export interface AIProviderSelectionStrategy {
  strategy: 'cost' | 'quality' | 'speed' | 'manual';
  preferredProviders: AIProvider[];
  fallbackOrder: AIProvider[];
}

// 任务生成历史记录
export interface TaskGenerationHistory {
  id: string;
  timestamp: Date;
  parentTaskId: number;
  parentTaskTitle: string;
  keywords: string;
  usedProvider: AIProvider;
  usedModel: string;
  generatedCount: number;
  quality: number;
  tokensUsed: number;
  cost: number;
  success: boolean;
  errorMessage?: string;
}

// AI响应解析结果
export interface AIResponseParseResult {
  success: boolean;
  tasks: GeneratedSubTask[];
  reasoning?: string;
  confidence: number;
  parseMethod: 'json' | 'text_extraction' | 'fallback';
  warnings: string[];
}

// 任务质量评估结果
export interface TaskQualityAssessment {
  overallScore: number; // 总体评分 0-100
  scores: {
    taskCount: number; // 任务数量评分
    titleQuality: number; // 标题质量评分
    descriptionQuality: number; // 描述质量评分
    priorityDistribution: number; // 优先级分布评分
    timeEstimation: number; // 时间估算合理性评分
  };
  suggestions: string[]; // 改进建议
  issues: string[]; // 发现的问题
}

// AI服务状态
export interface AIServiceStatus {
  provider: AIProvider;
  available: boolean;
  lastCheck: Date;
  responseTime?: number;
  errorMessage?: string;
  model: string;
  rateLimitRemaining?: number;
}

// 批量任务导入请求（扩展现有接口）
export interface BulkTaskImportRequest {
  project_id: number;
  parent_task_id?: number; // 新增：指定父任务
  tasks: GeneratedSubTask[];
  generation_metadata?: {
    generation_id: string;
    ai_generated: true;
    keywords: string;
    used_provider: AIProvider;
    used_model: string;
    generation_timestamp: string;
  };
}

// 错误代码枚举
export enum AITaskGenerationErrorCode {
  NO_AVAILABLE_PROVIDER = 'NO_AVAILABLE_PROVIDER',
  AI_API_ERROR = 'AI_API_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  GENERATION_TIMEOUT = 'GENERATION_TIMEOUT',
  QUALITY_TOO_LOW = 'QUALITY_TOO_LOW'
}

// 常量定义
export const AI_TASK_GENERATION_CONSTANTS = {
  DEFAULT_MAX_TASKS: 6,
  MIN_TASKS: 2,
  MAX_TASKS: 10,
  DEFAULT_TIMEOUT: 30000, // 30秒
  MIN_QUALITY_THRESHOLD: 40,
  DEFAULT_COMPLEXITY: 'detailed' as const,
  RETRY_ATTEMPTS: 2,
  CACHE_DURATION: 300000, // 5分钟缓存
} as const;

// Prompt模板类型
export interface PromptTemplate {
  system: string;
  user: (parentTask: string, keywords: string, context?: string) => string;
  fallback?: string;
}

// 生成选项
export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retryOnError?: boolean;
  validateResponse?: boolean;
  enableFallback?: boolean;
}