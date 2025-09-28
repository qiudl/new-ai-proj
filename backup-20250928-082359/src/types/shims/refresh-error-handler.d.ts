declare module '../utils/RefreshErrorHandler' {
  export interface RefreshError {
    message: string;
    [key: string]: any;
  }
  export const RefreshErrorAnalyzer: {
    analyze: (err: unknown, context?: Record<string, any>) => RefreshError;
  };
  export class RefreshErrorHandler {
    handleError: (err: RefreshError) => void;
    shouldAutoRetry: (err: RefreshError) => boolean;
  }
  export const globalRefreshErrorHandler: RefreshErrorHandler;
}

