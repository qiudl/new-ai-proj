// API 响应通用类型定义

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  field?: string;
}

export interface APIRequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

// HTTP 方法类型
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// 请求选项
export interface RequestOptions {
  method?: HTTPMethod;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  signal?: AbortSignal;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 过滤参数
export interface FilterParams {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: any;
}

// API 端点配置
export interface APIEndpoint {
  path: string;
  method: HTTPMethod;
  auth?: boolean;
  timeout?: number;
}

// 错误响应类型
export interface ErrorResponse {
  success: false;
  error: APIError;
  timestamp: string;
}

// 成功响应类型
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

// 联合响应类型
export type Response<T = any> = SuccessResponse<T> | ErrorResponse;