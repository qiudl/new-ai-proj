import { ApiClient, ApiClientConfig, DEFAULT_API_CONFIG } from './baseService';
import { TaskService } from './taskService';
import { DocumentService } from './documentService';

/**
 * Service factory for creating and managing service instances
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  private apiClient: ApiClient;
  private _taskService?: TaskService;
  private _documentService?: DocumentService;

  private constructor(config: ApiClientConfig) {
    this.apiClient = new ApiClient(config);
  }

  /**
   * Get singleton instance of ServiceFactory
   */
  static getInstance(config?: ApiClientConfig): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory(config || DEFAULT_API_CONFIG);
    }
    return ServiceFactory.instance;
  }

  /**
   * Get TaskService instance
   */
  get taskService(): TaskService {
    if (!this._taskService) {
      this._taskService = new TaskService(this.apiClient);
    }
    return this._taskService;
  }

  /**
   * Get DocumentService instance
   */
  get documentService(): DocumentService {
    if (!this._documentService) {
      this._documentService = new DocumentService(this.apiClient);
    }
    return this._documentService;
  }

  /**
   * Get API client instance
   */
  get client(): ApiClient {
    return this.apiClient;
  }

  /**
   * Reset factory instance (useful for testing)
   */
  static reset(): void {
    ServiceFactory.instance = undefined as any;
  }

  /**
   * Update API configuration
   */
  updateConfig(config: Partial<ApiClientConfig>): void {
    const newConfig = { ...DEFAULT_API_CONFIG, ...config };
    this.apiClient = new ApiClient(newConfig);
    
    // Reset service instances to use new API client
    this._taskService = undefined;
    this._documentService = undefined;
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.apiClient.cancelAllRequests();
  }

  /**
   * Clear all service caches
   */
  clearCaches(): void {
    this._taskService?.clearCache();
    this._documentService?.clearCache();
  }
}

/**
 * Create services with custom configuration
 */
export function createServices(config?: Partial<ApiClientConfig>) {
  const factory = ServiceFactory.getInstance(config ? { ...DEFAULT_API_CONFIG, ...config } : undefined);
  
  return {
    taskService: factory.taskService,
    documentService: factory.documentService,
    apiClient: factory.client,
    factory,
  };
}

// Default service instances
const defaultFactory = ServiceFactory.getInstance();

export const taskService = defaultFactory.taskService;
export const documentService = defaultFactory.documentService;
export const apiClient = defaultFactory.client;

// Development and testing utilities
export const devUtils = {
  /**
   * Mock API responses for development
   */
  enableMockMode: () => {
    const mockConfig: ApiClientConfig = {
      baseURL: 'http://localhost:3000/api/mock',
      timeout: 5000,
      retryConfig: {
        maxRetries: 1,
        baseDelay: 500,
        maxDelay: 2000,
        retryableStatuses: [500, 502, 503, 504],
      },
      authConfig: {
        tokenKey: 'mock_token',
        authHeaderPrefix: 'Bearer',
      },
    };

    ServiceFactory.reset();
    ServiceFactory.getInstance(mockConfig);
  },

  /**
   * Reset to production mode
   */
  disableMockMode: () => {
    ServiceFactory.reset();
    ServiceFactory.getInstance();
  },

  /**
   * Get current factory instance
   */
  getFactory: () => ServiceFactory.getInstance(),

  /**
   * Clear all caches
   */
  clearCaches: () => {
    ServiceFactory.getInstance().clearCaches();
  },
};

// Environment-specific configuration
const getEnvironmentConfig = (): Partial<ApiClientConfig> => {
  const env = process.env.NODE_ENV;
  const baseURL = process.env.REACT_APP_API_BASE_URL;

  switch (env) {
    case 'development':
      return {
        baseURL: baseURL || 'http://localhost:3000/api',
        timeout: 30000,
        retryConfig: {
          maxRetries: 2,
          baseDelay: 1000,
          maxDelay: 5000,
          retryableStatuses: [408, 429, 500, 502, 503, 504],
        },
      };

    case 'test':
      return {
        baseURL: 'http://localhost:3000/api/test',
        timeout: 10000,
        retryConfig: {
          maxRetries: 1,
          baseDelay: 500,
          maxDelay: 2000,
          retryableStatuses: [500, 502, 503, 504],
        },
      };

    case 'production':
      return {
        baseURL: baseURL || process.env.REACT_APP_API_BASE_URL,
        timeout: 15000,
        retryConfig: {
          maxRetries: 3,
          baseDelay: 2000,
          maxDelay: 15000,
          retryableStatuses: [408, 429, 500, 502, 503, 504],
        },
      };

    default:
      return {};
  }
};

// Auto-configure based on environment
if (typeof window !== 'undefined') {
  const envConfig = getEnvironmentConfig();
  if (Object.keys(envConfig).length > 0) {
    ServiceFactory.getInstance().updateConfig(envConfig);
  }
}