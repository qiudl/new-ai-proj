// Basic error types for validation
export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;
  public readonly status?: number;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    statusOrContext?: number | Record<string, any>,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.timestamp = new Date();
    
    // Handle both old and new constructor signatures
    if (typeof statusOrContext === 'number') {
      this.status = statusOrContext;
      this.context = context;
    } else {
      this.context = statusOrContext;
    }

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack
    };
  }
}

// Minimal NetworkErrorHandler implementation
export class NetworkErrorHandler {
  static handleError(error: any, message: string, context?: Record<string, any>) {
    console.error(`${message}:`, error);
    if (context) {
      console.error('Context:', context);
    }
    // In a real implementation, this would handle different error types appropriately
  }
}

// Minimal ValidationHelper implementation  
export class ValidationHelper {
  static validateRequired(value: any, fieldName: string) {
    if (value === null || value === undefined || value === '') {
      throw new AppError(`${fieldName} is required`, ErrorType.VALIDATION);
    }
  }

  static validateLength(value: string, fieldName: string, minLength: number, maxLength: number) {
    if (typeof value !== 'string') {
      throw new AppError(`${fieldName} must be a string`, ErrorType.VALIDATION);
    }
    
    if (value.length < minLength) {
      throw new AppError(`${fieldName} must be at least ${minLength} characters long`, ErrorType.VALIDATION);
    }
    
    if (value.length > maxLength) {
      throw new AppError(`${fieldName} must be no more than ${maxLength} characters long`, ErrorType.VALIDATION);
    }
  }
}

// Minimal withRetry implementation
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Progress feedback interface and implementation
export interface ProgressFeedbackOptions {
  showPercentage?: boolean;
  showETA?: boolean;
  showSpeed?: boolean;
  context?: Record<string, any>;
}

export class ProgressFeedback {
  private static progressItems: Map<string, any> = new Map();

  static show(
    message: string,
    progress: number,
    options: ProgressFeedbackOptions = {}
  ): void {
    const {
      showPercentage = true,
      showETA = false,
      showSpeed = false,
      context = {}
    } = options;

    let displayMessage = message;
    
    if (showPercentage) {
      displayMessage += ` (${Math.round(progress)}%)`;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Progress: ${displayMessage}`, {
        progress,
        context,
        timestamp: new Date().toISOString()
      });
    }

    // Store progress for potential UI updates
    this.progressItems.set(message, {
      progress,
      message: displayMessage,
      context,
      timestamp: Date.now()
    });
  }

  static hide(message: string): void {
    this.progressItems.delete(message);
  }

  static getProgress(message: string): any {
    return this.progressItems.get(message);
  }

  static clear(): void {
    this.progressItems.clear();
  }
}

// Success feedback interface and implementation
export interface SuccessFeedbackOptions {
  type?: 'message' | 'notification' | 'modal';
  duration?: number;
  showStats?: boolean;
  context?: Record<string, any>;
  onClose?: () => void;
}

export class SuccessFeedback {
  private static successItems: Array<any> = [];

  static show(
    message: string,
    options: SuccessFeedbackOptions = {}
  ): void {
    const {
      type = 'message',
      duration = 3000,
      showStats = false,
      context = {},
      onClose
    } = options;

    let displayMessage = message;
    
    if (showStats && context) {
      const stats: string[] = [];
      
      if (context.fileSize) {
        const size = typeof context.fileSize === 'number' 
          ? this.formatFileSize(context.fileSize)
          : context.fileSize;
        stats.push(`Size: ${size}`);
      }
      
      if (context.duration) {
        const time = typeof context.duration === 'number'
          ? this.formatDuration(context.duration)
          : context.duration;
        stats.push(`Time: ${time}`);
      }
      
      if (context.fileCount) {
        stats.push(`Files: ${context.fileCount}`);
      }
      
      if (stats.length > 0) {
        displayMessage += ` (${stats.join(', ')})`;
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Success: ${displayMessage}`, {
        type,
        context,
        timestamp: new Date().toISOString()
      });
    }

    // Store success feedback
    const successItem = {
      message: displayMessage,
      type,
      context,
      timestamp: Date.now(),
      onClose
    };

    this.successItems.push(successItem);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(successItem);
        if (onClose) {
          onClose();
        }
      }, duration);
    }

    // In a real implementation, this would trigger UI notifications
    // For now, we'll just log to console in development
  }

  static remove(item: any): void {
    const index = this.successItems.indexOf(item);
    if (index > -1) {
      this.successItems.splice(index, 1);
    }
  }

  static clear(): void {
    this.successItems.length = 0;
  }

  static getAll(): Array<any> {
    return [...this.successItems];
  }

  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)}m`;
  }
}

// Safe async operation wrapper
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  errorMessage?: string,
  onProgress?: (progress: number) => void
): Promise<T | null> {
  try {
    if (onProgress) {
      onProgress(0);
    }
    
    const result = await operation();
    
    if (onProgress) {
      onProgress(100);
    }
    
    return result;
  } catch (error) {
    const message = errorMessage || 'Operation failed';
    NetworkErrorHandler.handleError(error, message);
    
    if (onProgress) {
      onProgress(0); // Reset progress on error
    }
    
    return null;
  }
}