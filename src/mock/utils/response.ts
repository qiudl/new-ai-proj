/**
 * 统一响应格式工具
 */

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  code?: string | number
  timestamp: number
  requestId: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number
    size: number
    total: number
    pages: number
  }
}

export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: number
  requestId: string
}

export enum ErrorCodes {
  // 认证错误 (401xx)
  UNAUTHORIZED = 40100,
  INVALID_TOKEN = 40101,
  TOKEN_EXPIRED = 40102,
  
  // 权限错误 (403xx)
  FORBIDDEN = 40300,
  INSUFFICIENT_PERMISSIONS = 40301,
  
  // 业务错误 (422xx)
  VALIDATION_ERROR = 42200,
  DUPLICATE_RESOURCE = 42201,
  RESOURCE_NOT_FOUND = 42202,
  
  // 系统错误 (500xx)
  INTERNAL_ERROR = 50000,
  DATABASE_ERROR = 50001,
  EXTERNAL_SERVICE_ERROR = 50002
}

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  requestId?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: Date.now(),
    requestId: requestId || generateRequestId()
  }
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginatedResponse<T>['pagination'],
  message?: string,
  requestId?: string
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination,
    message,
    timestamp: Date.now(),
    requestId: requestId || generateRequestId()
  }
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  code: ErrorCodes | string,
  message: string,
  details?: any,
  requestId?: string
): ErrorResponse {
  return {
    success: false,
    error: {
      code: code.toString(),
      message,
      details
    },
    timestamp: Date.now(),
    requestId: requestId || generateRequestId()
  }
}

/**
 * 生成请求ID
 */
export function generateRequestId(): string {
  return `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 模拟网络延迟
 */
export function simulateDelay(min: number = 100, max: number = 500): Promise<void> {
  const delay = Math.random() * (max - min) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}