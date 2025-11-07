/**
 * API-related type definitions
 */

// ========== Base API Types ==========

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
  timestamp?: number;
  requestId?: string;
}

export interface ResponseMetadata {
  timestamp: number;
  duration: number;
  requestId: string;
  version?: string;
  cached?: boolean;
  cacheAge?: number;
}

// ========== Request Types ==========

export interface ApiRequest {
  method: HttpMethod;
  url: string;
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retryConfig?: RetryConfig;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: ApiError) => boolean;
  onRetry?: (retryCount: number, error: ApiError) => void;
  // ✅ FIXED - Add missing properties used in baseService.ts (TS2339)
  retryableStatuses?: number[];
  baseDelay?: number;
  maxDelay?: number;
}

// ========== Pagination Types ==========

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

// ========== Filter and Sort Types ==========

export interface FilterParams {
  filters?: Record<string, any>;
  search?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  include?: string[];
  exclude?: string[];
}

export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  secondarySort?: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

// ========== Batch Operation Types ==========

export interface BatchRequest<T = any> {
  operations: BatchOperation<T>[];
  options?: BatchOptions;
}

export interface BatchOperation<T = any> {
  id: string;
  method: HttpMethod;
  url: string;
  data?: T;
  params?: Record<string, any>;
}

export interface BatchOptions {
  parallel?: boolean;
  stopOnError?: boolean;
  timeout?: number;
}

export interface BatchResponse<T = any> {
  results: BatchResult<T>[];
  summary: {
    total: number;
    success: number;
    failed: number;
    duration: number;
  };
}

export interface BatchResult<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: ApiError;
  duration?: number;
}

// ========== Upload Types ==========

export interface UploadRequest {
  file: File;
  url?: string;
  fields?: Record<string, any>;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (response: UploadResponse) => void;
  onError?: (error: ApiError) => void;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  remainingTime?: number;
}

export interface UploadResponse {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

// ========== WebSocket Types ==========

export interface WebSocketMessage<T = any> {
  type: string;
  payload: T;
  timestamp: number;
  id?: string;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onOpen?: () => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

// ========== Cache Types ==========

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  key?: string;
  strategy: CacheStrategy;
  invalidateOn?: string[];
}

export type CacheStrategy = 
  | 'memory'
  | 'sessionStorage'
  | 'localStorage'
  | 'indexedDB'
  | 'hybrid';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  tags?: string[];
}

// ========== Authentication Types ==========

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope?: string[];
}

export interface AuthRequest {
  username?: string;
  email?: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
}

export interface AuthResponse {
  user: UserInfo;
  token: AuthToken;
  permissions?: string[];
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
  permissions?: string[];
}

// ========== Error Handling Types ==========

export enum ApiErrorCode {
  // Client errors
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  ABORTED = 'ABORTED',
  
  // Business logic errors
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}

export interface ErrorHandler {
  handle: (error: ApiError) => void;
  retry?: (request: ApiRequest) => Promise<any>;
  report?: (error: ApiError) => void;
}

// ========== Interceptor Types ==========

export interface RequestInterceptor {
  onRequest?: (config: ApiRequest) => ApiRequest | Promise<ApiRequest>;
  onRequestError?: (error: any) => any;
}

export interface ResponseInterceptor {
  onResponse?: (response: ApiResponse) => ApiResponse | Promise<ApiResponse>;
  onResponseError?: (error: any) => any;
}

// ========== Monitoring Types ==========

export interface ApiMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  throughput: number;
}

export interface ApiLog {
  timestamp: number;
  method: HttpMethod;
  url: string;
  statusCode?: number;
  duration: number;
  error?: ApiError;
  metadata?: Record<string, any>;
}