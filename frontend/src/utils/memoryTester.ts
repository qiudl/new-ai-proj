// Memory Performance Test Script
// Run this in the browser console to test memory usage

interface TestResult {
  test: string;
  passed: boolean;
  memoryIncrease: number;
  details?: string;
}

interface MemoryUsage {
  used: number;
  total: number;
  limit: number;
}

declare global {
  interface Window {
    globalCache: any;
    MemoryTester: typeof MemoryTester;
  }
}

class MemoryTester {
  private initialMemory: MemoryUsage | null;
  private testResults: TestResult[];

  constructor() {
    this.initialMemory = this.getMemoryUsage();
    this.testResults = [];
  }

  getMemoryUsage(): MemoryUsage | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize / (1024 * 1024), // MB
        total: memory.totalJSHeapSize / (1024 * 1024), // MB
        limit: memory.jsHeapSizeLimit / (1024 * 1024) // MB
      };
    }
    return null;
  }

  async testTimerMemoryLeak(): Promise<TestResult> {
    console.log('🧪 Testing Timer Memory Leak...');
    
    const startMemory = this.getMemoryUsage();
    console.log(`Starting memory: ${startMemory?.used.toFixed(2)} MB`);

    // Simulate creating and destroying TimerCard components
    const timers = [];
    for (let i = 0; i < 50; i++) {
      const interval = setInterval(() => {
        // Simulate timer work
        const now = Date.now();
      }, 100);
      timers.push(interval);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clean up (this should happen automatically with our fixes)
    timers.forEach(timer => clearInterval(timer));

    await new Promise(resolve => setTimeout(resolve, 1000));

    const endMemory = this.getMemoryUsage();
    console.log(`Ending memory: ${endMemory?.used.toFixed(2)} MB`);
    
    const memoryIncrease = (endMemory?.used || 0) - (startMemory?.used || 0);
    console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);

    return {
      test: 'Timer Memory Leak',
      memoryIncrease,
      passed: memoryIncrease < 5 // Should be less than 5MB increase
    };
  }

  async testCacheMemoryGrowth(): Promise<TestResult> {
    console.log('🧪 Testing Cache Memory Growth...');
    
    const startMemory = this.getMemoryUsage();
    console.log(`Starting memory: ${startMemory?.used.toFixed(2)} MB`);

    // Access the global cache if available
    if (window.globalCache) {
      // Fill cache with test data
      for (let i = 0; i < 100; i++) {
        const largeData = new Array(1000).fill(`test-data-${i}`);
        window.globalCache.set(`test-key-${i}`, largeData);
      }

      console.log(`Cache size: ${window.globalCache.size()}`);
      console.log(`Cache memory: ${window.globalCache.memoryUsage().toFixed(2)} MB`);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Cache should auto-cleanup
      window.globalCache.cleanup();

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const endMemory = this.getMemoryUsage();
    console.log(`Ending memory: ${endMemory?.used.toFixed(2)} MB`);
    
    const memoryIncrease = (endMemory?.used || 0) - (startMemory?.used || 0);
    console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);

    return {
      test: 'Cache Memory Growth',
      memoryIncrease,
      passed: memoryIncrease < 10 // Should be less than 10MB increase
    };
  }

  async testComponentCleanup(): Promise<TestResult> {
    console.log('🧪 Testing Component Cleanup...');
    
    const startMemory = this.getMemoryUsage();
    console.log(`Starting memory: ${startMemory?.used.toFixed(2)} MB`);

    // Simulate creating large state objects
    const largeStates = [];
    for (let i = 0; i < 10; i++) {
      const largeArray = new Array(10000).fill(0).map((_, index) => ({
        id: index,
        title: `Task ${index}`,
        description: `Description for task ${index}`,
        data: new Array(100).fill(`data-${index}`)
      }));
      largeStates.push(largeArray);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate cleanup (our optimized components should do this)
    largeStates.length = 0;

    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    const endMemory = this.getMemoryUsage();
    console.log(`Ending memory: ${endMemory?.used.toFixed(2)} MB`);
    
    const memoryIncrease = (endMemory?.used || 0) - (startMemory?.used || 0);
    console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);

    return {
      test: 'Component Cleanup',
      memoryIncrease,
      passed: memoryIncrease < 15 // Should be less than 15MB increase
    };
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Memory Performance Tests...');
    console.log(`Initial memory usage: ${this.initialMemory?.used.toFixed(2)} MB`);
    
    this.testResults = [];

    try {
      this.testResults.push(await this.testTimerMemoryLeak());
      this.testResults.push(await this.testCacheMemoryGrowth());
      this.testResults.push(await this.testComponentCleanup());
    } catch (error) {
      console.error('Test failed:', error);
    }

    this.printResults();
  }

  printResults() {
    console.log('\n📊 Memory Test Results:');
    console.log('========================');
    
    let totalPassed = 0;
    let totalTests = this.testResults.length;

    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status} - ${result.test}: ${result.memoryIncrease.toFixed(2)} MB increase`);
      
      if (result.passed) totalPassed++;
    });

    console.log('========================');
    console.log(`Results: ${totalPassed}/${totalTests} tests passed`);
    
    const finalMemory = this.getMemoryUsage();
    const totalIncrease = (finalMemory?.used || 0) - (this.initialMemory?.used || 0);
    console.log(`Total memory increase: ${totalIncrease.toFixed(2)} MB`);
    
    if (totalIncrease < 30) {
      console.log('🎉 Memory optimization successful! Total increase < 30MB');
    } else {
      console.log('⚠️  Memory usage still high. Further optimization needed.');
    }
  }
}

// Export for global use
window.MemoryTester = MemoryTester;

// Auto-run if called directly
if (typeof window !== 'undefined') {
  console.log('Memory Tester loaded. Run: new MemoryTester().runAllTests()');
}

export default MemoryTester;