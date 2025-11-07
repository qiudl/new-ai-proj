/**
 * Service types for TaskDetail API client
 * ✅ FIXED - Created missing types file (TS2307)
 */

// ✅ FIXED - Import then re-export types from api.types to fix TS2304
import type { RetryConfig as RetryConfigType, CacheEntry as CacheEntryType } from '../types/api.types';
export type { RetryConfigType as RetryConfig, CacheEntryType as CacheEntry };
export type RetryConfig = RetryConfigType;
export type CacheEntry = CacheEntryType;

/**
 * API Client Configuration
 */
export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryConfig?: RetryConfig;
  cacheTimeout?: number;
  authConfig?: AuthConfig;
}

/**
 * Service Error
 */
export interface ServiceError {
  code: string;
  message: string;
  status?: number;
  data?: any;
  // ✅ FIXED - Add missing properties used in baseService.ts (TS2339)
  type?: 'api' | 'network' | 'validation' | 'unknown';
  details?: any;
  retryable?: boolean;
}

/**
 * Authentication Configuration
 */
export interface AuthConfig {
  tokenKey?: string;
  tokenPrefix?: string;
  refreshTokenEndpoint?: string;
  onAuthError?: () => void;
  // ✅ FIXED - Add missing property used in baseService.ts (TS2339)
  authHeaderPrefix?: string;
}
