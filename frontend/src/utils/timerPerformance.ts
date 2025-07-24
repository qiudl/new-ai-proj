// Timer Performance Monitoring and Optimization Utilities

interface PerformanceMetrics {
  apiResponseTime: number;
  localUpdateLatency: number;
  memoryUsage: number;
  notificationLatency: number;
  storageWriteTime: number;
  totalActiveTime: number;
}

interface TimerBenchmark {
  timestamp: number;
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
}

class TimerPerformanceMonitor {
  private static metrics: PerformanceMetrics = {
    apiResponseTime: 0,
    localUpdateLatency: 0,
    memoryUsage: 0,
    notificationLatency: 0,
    storageWriteTime: 0,
    totalActiveTime: 0
  };

  private static benchmarks: TimerBenchmark[] = [];
  private static isMonitoring = false;
  private static performanceObserver: PerformanceObserver | null = null;

  // Start performance monitoring
  static startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('🚀 Timer performance monitoring started');

    // Initialize Performance Observer for API calls
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('/timer/')) {
            this.recordBenchmark('api_call', entry.duration, true);
            this.metrics.apiResponseTime = entry.duration;
          }
        });
      });
      
      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    }

    // Monitor memory usage
    this.startMemoryMonitoring();
  }

  // Stop performance monitoring
  static stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    console.log('⏹️ Timer performance monitoring stopped');
    this.generatePerformanceReport();
  }

  // Record a benchmark measurement
  static recordBenchmark(operation: string, duration: number, success: boolean, error?: string): void {
    const benchmark: TimerBenchmark = {
      timestamp: Date.now(),
      operation,
      duration,
      success,
      error
    };

    this.benchmarks.push(benchmark);

    // Keep only last 100 benchmarks to prevent memory leaks
    if (this.benchmarks.length > 100) {
      this.benchmarks.shift();
    }

    // Log slow operations
    if (duration > 1000) {
      console.warn(`⚠️ Slow timer operation detected: ${operation} took ${duration.toFixed(2)}ms`);
    }
  }

  // Measure API call performance
  static async measureApiCall<T>(
    apiCall: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      this.recordBenchmark(`api_${operationName}`, duration, true);
      this.metrics.apiResponseTime = duration;
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordBenchmark(`api_${operationName}`, duration, false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // Measure localStorage write performance
  static measureStorageWrite(operation: () => void, dataSize: number): void {
    const startTime = performance.now();
    
    try {
      operation();
      const duration = performance.now() - startTime;
      
      this.recordBenchmark(`storage_write_${dataSize}b`, duration, true);
      this.metrics.storageWriteTime = duration;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordBenchmark('storage_write_error', duration, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Measure notification performance
  static async measureNotification(notificationCall: () => Promise<void>): Promise<void> {
    const startTime = performance.now();
    
    try {
      await notificationCall();
      const duration = performance.now() - startTime;
      
      this.recordBenchmark('notification', duration, true);
      this.metrics.notificationLatency = duration;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordBenchmark('notification', duration, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Monitor memory usage
  private static startMemoryMonitoring(): void {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        this.metrics.memoryUsage = memInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB
        
        // Alert if memory usage is high
        if (this.metrics.memoryUsage > 50) {
          console.warn(`⚠️ High memory usage detected: ${this.metrics.memoryUsage.toFixed(2)}MB`);
        }
      }
    };

    // Check memory every 30 seconds
    setInterval(checkMemory, 30000);
    checkMemory(); // Initial check
  }

  // Get current performance metrics
  static getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get recent benchmarks
  static getBenchmarks(limit: number = 20): TimerBenchmark[] {
    return this.benchmarks.slice(-limit);
  }

  // Generate performance report
  static generatePerformanceReport(): string {
    const metrics = this.getMetrics();
    const recentBenchmarks = this.getBenchmarks(10);
    
    const report = `
📊 Timer Performance Report
==========================

📈 Current Metrics:
- API Response Time: ${metrics.apiResponseTime.toFixed(2)}ms
- Local Update Latency: ${metrics.localUpdateLatency.toFixed(2)}ms
- Memory Usage: ${metrics.memoryUsage.toFixed(2)}MB
- Notification Latency: ${metrics.notificationLatency.toFixed(2)}ms
- Storage Write Time: ${metrics.storageWriteTime.toFixed(2)}ms

🎯 Performance Analysis:
- API Performance: ${metrics.apiResponseTime < 500 ? '✅ Good' : metrics.apiResponseTime < 1000 ? '⚠️ Moderate' : '❌ Poor'}
- Memory Efficiency: ${metrics.memoryUsage < 25 ? '✅ Good' : metrics.memoryUsage < 50 ? '⚠️ Moderate' : '❌ High'}
- Notification Speed: ${metrics.notificationLatency < 100 ? '✅ Fast' : metrics.notificationLatency < 300 ? '⚠️ Moderate' : '❌ Slow'}

📋 Recent Operations:
${recentBenchmarks.map(b => 
  `- ${b.operation}: ${b.duration.toFixed(2)}ms ${b.success ? '✅' : '❌'} ${b.error ? `(${b.error})` : ''}`
).join('\n')}

💡 Recommendations:
${this.generateRecommendations(metrics)}
    `;

    console.log(report);
    return report;
  }

  // Generate performance recommendations
  private static generateRecommendations(metrics: PerformanceMetrics): string {
    const recommendations: string[] = [];

    if (metrics.apiResponseTime > 1000) {
      recommendations.push('- Consider implementing request caching for timer APIs');
      recommendations.push('- Check network connectivity and server performance');
    }

    if (metrics.memoryUsage > 50) {
      recommendations.push('- Consider reducing localStorage cache size');
      recommendations.push('- Implement memory cleanup for old timer data');
    }

    if (metrics.notificationLatency > 300) {
      recommendations.push('- Optimize notification creation and audio loading');
      recommendations.push('- Consider preloading audio files');
    }

    if (metrics.storageWriteTime > 50) {
      recommendations.push('- Reduce frequency of localStorage writes');
      recommendations.push('- Implement batch storage updates');
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '- System performance is optimal ✅';
  }

  // Test concurrent timer operations
  static async testConcurrentOperations(): Promise<void> {
    console.log('🧪 Testing concurrent timer operations...');

    const operations = [
      () => this.simulateApiCall('start_timer', 200),
      () => this.simulateApiCall('get_current', 150),
      () => this.simulateApiCall('stop_timer', 250),
      () => this.simulateStorageWrite(1024),
      () => this.simulateNotification(),
    ];

    const startTime = performance.now();

    try {
      // Run operations concurrently
      await Promise.all(operations.map(op => op()));
      
      const totalTime = performance.now() - startTime;
      console.log(`✅ Concurrent operations completed in ${totalTime.toFixed(2)}ms`);
      
      this.recordBenchmark('concurrent_test', totalTime, true);
    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.error('❌ Concurrent operations failed:', error);
      
      this.recordBenchmark('concurrent_test', totalTime, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Simulate API call for testing
  private static async simulateApiCall(operation: string, delay: number): Promise<void> {
    const startTime = performance.now();
    
    await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 100));
    
    const duration = performance.now() - startTime;
    this.recordBenchmark(`simulate_${operation}`, duration, true);
  }

  // Simulate storage write for testing
  private static simulateStorageWrite(size: number): void {
    const data = 'x'.repeat(size);
    this.measureStorageWrite(() => {
      localStorage.setItem('test_performance', data);
      localStorage.removeItem('test_performance');
    }, size);
  }

  // Simulate notification for testing
  private static async simulateNotification(): Promise<void> {
    await this.measureNotification(async () => {
      // Simulate notification creation
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    });
  }

  // Cleanup and reset
  static reset(): void {
    this.benchmarks = [];
    this.metrics = {
      apiResponseTime: 0,
      localUpdateLatency: 0,
      memoryUsage: 0,
      notificationLatency: 0,
      storageWriteTime: 0,
      totalActiveTime: 0
    };
  }
}

export default TimerPerformanceMonitor;
export type { PerformanceMetrics, TimerBenchmark };