import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import TokenManager from '../../../utils/tokenManager';
import { 
  ApiClientConfig, 
  ServiceError, 
  CacheEntry,
  RetryConfig,
  AuthConfig
} from './types';

// Service cache implementation
export class ServiceCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.DEFAULT_TTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
}

// Custom service error class
export class CustomServiceError extends Error implements ServiceError {
  public readonly type: 'api' | 'network' | 'validation' | 'unknown';
  public readonly status?: number;
  public readonly code?: string;
  public readonly details?: any;
  public readonly retryable?: boolean;

  constructor(error: ServiceError) {
    super(error.message);
    this.name = 'ServiceError';
    this.type = error.type;
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
    this.retryable = error.retryable;
  }
}

// Event bus for cross-service communication
class EventBus {
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (...args: any[]) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }
}

export const eventBus = new EventBus();

// Auth token management - Use unified TokenManager
export function getAuthToken(): string | null {
  // Use TokenManager for consistency across the app
  return TokenManager.getToken();
}

export function setAuthToken(token: string, persistent: boolean = false): void {
  // Use TokenManager for consistency across the app
  TokenManager.setToken(token);
}

export function removeAuthToken(): void {
  // Use TokenManager for consistency across the app  
  TokenManager.removeToken();
}

// Request ID generation
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// API Client implementation
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private requestQueue: Map<string, AbortController> = new Map();
  private retryConfig: RetryConfig;

  constructor(config: ApiClientConfig) {
    this.retryConfig = config.retryConfig;
    
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors(config.authConfig);
  }

  private setupInterceptors(authConfig: AuthConfig): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add authentication header
        const token = getAuthToken();
        if (token) {
          config.headers.Authorization = `${authConfig.authHeaderPrefix} ${token}`;
        }

        // Add request ID and abort controller
        const requestId = generateRequestId();
        config.metadata = { requestId };

        const abortController = new AbortController();
        config.signal = abortController.signal;
        this.requestQueue.set(requestId, abortController);

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Clean up request queue
        const requestId = response.config.metadata?.requestId;
        if (requestId) {
          this.requestQueue.delete(requestId);
        }
        return response;
      },
      (error) => {
        // Handle authentication errors
        if (error.response?.status === 401) {
          eventBus.emit('auth:expired');
          removeAuthToken();
        }

        // Clean up request queue
        const requestId = error.config?.metadata?.requestId;
        if (requestId) {
          this.requestQueue.delete(requestId);
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request('GET', url, undefined, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request('POST', url, data, config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request('PUT', url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request('PATCH', url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request('DELETE', url, undefined, config);
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const requestConfig: AxiosRequestConfig = {
      method,
      url,
      data,
      ...config,
    };

    return this.retryOperation(() => this.axiosInstance.request<T>(requestConfig));
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const isRetryable = this.isRetryableError(error);
      const hasRetriesLeft = attempt < this.retryConfig.maxRetries;

      if (isRetryable && hasRetriesLeft) {
        const delay = this.calculateDelay(attempt);
        await this.delay(delay);
        return this.retryOperation(operation, attempt + 1);
      }

      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Network errors are always retryable
    if (error.code === 'NETWORK_ERROR' || !error.response) {
      return true;
    }

    // Check if status code is in retryable list
    const status = error.response?.status;
    return this.retryConfig.retryableStatuses.includes(status);
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.retryConfig.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, this.retryConfig.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public cancelRequest(requestId: string): void {
    const controller = this.requestQueue.get(requestId);
    if (controller) {
      controller.abort();
      this.requestQueue.delete(requestId);
    }
  }

  public cancelAllRequests(): void {
    this.requestQueue.forEach(controller => controller.abort());
    this.requestQueue.clear();
  }
}

// Base service class
export abstract class BaseService {
  protected apiClient: ApiClient;
  protected cache: ServiceCache;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
    this.cache = new ServiceCache();
  }

  protected handleApiError(error: any): CustomServiceError {
    if (error.response) {
      // API error response
      return new CustomServiceError({
        type: 'api',
        status: error.response.status,
        code: error.response.data?.code || 'API_ERROR',
        message: error.response.data?.message || `HTTP ${error.response.status} Error`,
        details: error.response.data?.details,
        retryable: error.response.status >= 500,
      });
    } else if (error.request) {
      // Network error
      return new CustomServiceError({
        type: 'network',
        message: 'Network error occurred',
        retryable: true,
      });
    } else if (error.name === 'ValidationError') {
      // Validation error
      return new CustomServiceError({
        type: 'validation',
        message: error.message || 'Validation error occurred',
        details: error.details,
        retryable: false,
      });
    } else {
      // Unknown error
      return new CustomServiceError({
        type: 'unknown',
        message: error.message || 'Unknown error occurred',
        retryable: false,
      });
    }
  }

  protected setCache<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, data, ttl);
  }

  protected getFromCache<T>(key: string): T | null {
    return this.cache.get<T>(key);
  }

  protected invalidateCache(key: string): void {
    this.cache.invalidate(key);
  }

  protected invalidateCachePattern(pattern: RegExp): void {
    this.cache.invalidatePattern(pattern);
  }

  protected clearCache(): void {
    this.cache.clear();
  }

  // Upload progress notification helper
  protected notifyUploadProgress(filename: string, progress: number): void {
    eventBus.emit('upload:progress', { filename, progress });
  }

  protected notifyUploadComplete(filename: string, document: any): void {
    eventBus.emit('upload:complete', { filename, document });
  }

  protected notifyUploadError(filename: string, error: string): void {
    eventBus.emit('upload:error', { filename, error });
  }
}

// Default configuration
export const DEFAULT_API_CONFIG: ApiClientConfig = {
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 30000, // 30 seconds
  retryConfig: {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    retryableStatuses: [408, 429, 500, 502, 503, 504],
  },
  authConfig: {
    tokenKey: 'token',
    authHeaderPrefix: 'Bearer',
  },
};

// Singleton API client instance
export const apiClient = new ApiClient(DEFAULT_API_CONFIG);