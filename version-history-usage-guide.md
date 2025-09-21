# 版本历史系统使用指南

## 快速开始

### 安装和初始化

```bash
# 安装依赖
npm install

# 初始化配置
npm run setup
```

### 基本使用示例

```typescript
import { 
  VersionHistoryPerformanceOptimizer,
  DocumentMergeService,
  VersionRollbackService,
  DEFAULT_PERFORMANCE_CONFIG
} from './version-history-system';

// 1. 创建优化器实例
const optimizer = new VersionHistoryPerformanceOptimizer(DEFAULT_PERFORMANCE_CONFIG);

// 2. 基本版本对比
const oldContent = "Line 1\nLine 2\nLine 3";
const newContent = "Line 1\nLine 2 Modified\nLine 3\nLine 4";

const diffs = await optimizer.optimizedVersionCompare(oldContent, newContent);
console.log('差异结果:', diffs);

// 3. 文档合并
const mergeService = new DocumentMergeService();
const mergeContext = {
  documentId: 123,
  taskId: 456,
  baseVersion: { id: 1, content: "base content", versionNumber: "1.0.0" },
  sourceVersion: { id: 2, content: "source content", versionNumber: "1.1.0" },
  targetVersion: { id: 3, content: "target content", versionNumber: "1.2.0" },
  userId: 1,
  projectId: 1
};

const mergeResult = await mergeService.mergeDocuments(mergeContext);
console.log('合并结果:', mergeResult);

// 4. 版本回滚
const rollbackService = new VersionRollbackService();
const rollbackConfig = {
  strategy: 'replace',
  scope: 'full',
  validateBeforeRollback: true,
  createBackup: true
};

const rollbackResult = await rollbackService.rollbackVersion(rollbackContext, rollbackConfig);
console.log('回滚结果:', rollbackResult);
```

## API参考文档

### VersionHistoryPerformanceOptimizer

主要的性能优化器类，提供所有核心功能。

#### 构造函数

```typescript
constructor(config?: PerformanceConfig)
```

#### 主要方法

##### optimizedVersionCompare()
执行优化的版本对比
```typescript
async optimizedVersionCompare(oldContent: string, newContent: string): Promise<DiffResult[]>
```

**参数:**
- `oldContent`: 旧版本内容
- `newContent`: 新版本内容

**返回值:**
```typescript
interface DiffResult {
  type: 'unchanged' | 'added' | 'deleted' | 'modified';
  content?: string;
  oldContent?: string;
  newContent?: string;
  lineNumber: number;
}
```

##### batchVersionCompare()
批量版本对比
```typescript
async batchVersionCompare(comparisons: Array<{oldContent: string, newContent: string}>): Promise<DiffResult[][]>
```

##### getPerformanceReport()
获取性能报告
```typescript
getPerformanceReport(): PerformanceReport
```

### DocumentMergeService

智能文档合并服务。

#### mergeDocuments()
执行文档合并
```typescript
async mergeDocuments(context: MergeContext): Promise<MergeResult>
```

**合并上下文:**
```typescript
interface MergeContext {
  documentId: number;
  taskId: number;
  baseVersion: VersionInfo;
  sourceVersion: VersionInfo;
  targetVersion: VersionInfo;
  userId: number;
  projectId: number;
}
```

**合并结果:**
```typescript
interface MergeResult {
  success: boolean;
  content: string;
  conflicts: ConflictInfo[];
  statistics: MergeStatistics;
  suggestions: string[];
  warnings: string[];
  executionTime: number;
}
```

### VersionRollbackService

版本回滚服务。

#### rollbackVersion()
执行版本回滚
```typescript
async rollbackVersion(context: RollbackContext, config: RollbackConfig): Promise<RollbackResult>
```

**回滚配置:**
```typescript
interface RollbackConfig {
  strategy: 'replace' | 'merge' | 'create_new' | 'branch';
  scope: 'full' | 'partial' | 'selective';
  validateBeforeRollback: boolean;
  createBackup: boolean;
  allowPartialRollback: boolean;
}
```

## 配置说明

### 性能配置

```typescript
interface PerformanceConfig {
  diffOptimization: {
    enableEarlyTermination: boolean;    // 启用早期终止优化
    chunkSize: number;                  // 分块大小
    maxLinesForDetailedDiff: number;    // 详细diff的最大行数
    useBinaryDiff: boolean;             // 使用二进制diff
  };
  memoryManagement: {
    maxMemoryUsage: number;             // 最大内存使用(MB)
    garbageCollectionThreshold: number; // 垃圾回收阈值
    enableStreaming: boolean;           // 启用流式处理
    chunkProcessingSize: number;        // 分块处理大小
  };
  caching: {
    enableDiffCache: boolean;           // 启用差异缓存
    enableResultCache: boolean;         // 启用结果缓存
    maxCacheSize: number;               // 最大缓存大小
    cacheTTL: number;                   // 缓存TTL(秒)
    cacheCompressionEnabled: boolean;   // 启用缓存压缩
  };
  concurrency: {
    maxConcurrentOperations: number;    // 最大并发操作数
    enableWorkerThreads: boolean;       // 启用工作线程
    workerPoolSize: number;             // 工作线程池大小
    queueMaxSize: number;               // 队列最大大小
  };
  database: {
    enableQueryOptimization: boolean;   // 启用查询优化
    batchSize: number;                  // 批处理大小
    enableConnectionPooling: boolean;   // 启用连接池
    maxConnections: number;             // 最大连接数
  };
}
```

### 预定义配置

#### 开发环境配置
```typescript
import { DEVELOPMENT_CONFIG } from './version-history-system';
const optimizer = new VersionHistoryPerformanceOptimizer(DEVELOPMENT_CONFIG);
```

#### 生产环境配置
```typescript
import { PRODUCTION_CONFIG } from './version-history-system';
const optimizer = new VersionHistoryPerformanceOptimizer(PRODUCTION_CONFIG);
```

## 使用场景示例

### 场景1: 代码审查工具

```typescript
class CodeReviewTool {
  private optimizer: VersionHistoryPerformanceOptimizer;
  
  constructor() {
    this.optimizer = new VersionHistoryPerformanceOptimizer({
      ...DEFAULT_PERFORMANCE_CONFIG,
      diffOptimization: {
        ...DEFAULT_PERFORMANCE_CONFIG.diffOptimization,
        maxLinesForDetailedDiff: 5000, // 代码文件通常较小
      }
    });
  }
  
  async reviewChanges(originalCode: string, modifiedCode: string): Promise<ReviewResult> {
    const diffs = await this.optimizer.optimizedVersionCompare(originalCode, modifiedCode);
    
    return {
      changes: diffs,
      statistics: this.calculateStatistics(diffs),
      suggestions: this.generateSuggestions(diffs)
    };
  }
  
  private calculateStatistics(diffs: DiffResult[]): CodeStatistics {
    const stats = {
      totalLines: diffs.length,
      addedLines: diffs.filter(d => d.type === 'added').length,
      deletedLines: diffs.filter(d => d.type === 'deleted').length,
      modifiedLines: diffs.filter(d => d.type === 'modified').length
    };
    
    return {
      ...stats,
      changeRatio: (stats.addedLines + stats.deletedLines + stats.modifiedLines) / stats.totalLines
    };
  }
}
```

### 场景2: 文档协作平台

```typescript
class DocumentCollaborationPlatform {
  private mergeService: DocumentMergeService;
  private rollbackService: VersionRollbackService;
  
  constructor() {
    this.mergeService = new DocumentMergeService();
    this.rollbackService = new VersionRollbackService();
  }
  
  async handleConcurrentEdits(document: Document, edits: Edit[]): Promise<CollaborationResult> {
    // 1. 按时间排序编辑
    const sortedEdits = edits.sort((a, b) => a.timestamp - b.timestamp);
    
    // 2. 逐个应用编辑并处理冲突
    let currentContent = document.content;
    const conflicts = [];
    
    for (const edit of sortedEdits) {
      const mergeContext = this.createMergeContext(document, currentContent, edit);
      const mergeResult = await this.mergeService.mergeDocuments(mergeContext);
      
      if (mergeResult.success) {
        currentContent = mergeResult.content;
      } else {
        conflicts.push(...mergeResult.conflicts);
      }
    }
    
    return {
      finalContent: currentContent,
      conflicts,
      needsManualResolution: conflicts.length > 0
    };
  }
}
```

### 场景3: 配置管理系统

```typescript
class ConfigurationManagementSystem {
  private optimizer: VersionHistoryPerformanceOptimizer;
  
  constructor() {
    const config = {
      ...DEFAULT_PERFORMANCE_CONFIG,
      caching: {
        ...DEFAULT_PERFORMANCE_CONFIG.caching,
        cacheTTL: 3600, // 配置文件变化频率低，延长缓存时间
      }
    };
    
    this.optimizer = new VersionHistoryPerformanceOptimizer(config);
  }
  
  async deployConfiguration(oldConfig: string, newConfig: string): Promise<DeploymentResult> {
    // 1. 分析配置变更
    const diffs = await this.optimizer.optimizedVersionCompare(oldConfig, newConfig);
    
    // 2. 验证变更安全性
    const validation = this.validateConfigChanges(diffs);
    if (!validation.safe) {
      throw new Error(`Unsafe configuration changes detected: ${validation.issues.join(', ')}`);
    }
    
    // 3. 逐步部署
    return this.gradualDeploy(diffs);
  }
  
  private validateConfigChanges(diffs: DiffResult[]): ValidationResult {
    const criticalSections = ['database', 'security', 'network'];
    const issues = [];
    
    for (const diff of diffs) {
      if (diff.type !== 'unchanged') {
        for (const section of criticalSections) {
          if (diff.content && diff.content.includes(section)) {
            issues.push(`Critical section '${section}' modified`);
          }
        }
      }
    }
    
    return {
      safe: issues.length === 0,
      issues
    };
  }
}
```

## 性能调优指南

### 内存优化

```typescript
// 大文档处理
const largeDocumentConfig = {
  ...DEFAULT_PERFORMANCE_CONFIG,
  memoryManagement: {
    maxMemoryUsage: 512,
    garbageCollectionThreshold: 0.7,
    enableStreaming: true,
    chunkProcessingSize: 500
  },
  diffOptimization: {
    enableEarlyTermination: true,
    chunkSize: 1000,
    maxLinesForDetailedDiff: 5000,
    useBinaryDiff: true
  }
};
```

### 高并发优化

```typescript
// 高并发场景
const highConcurrencyConfig = {
  ...DEFAULT_PERFORMANCE_CONFIG,
  concurrency: {
    maxConcurrentOperations: 16,
    enableWorkerThreads: true,
    workerPoolSize: 8,
    queueMaxSize: 500
  },
  caching: {
    enableDiffCache: true,
    enableResultCache: true,
    maxCacheSize: 1000,
    cacheTTL: 1800,
    cacheCompressionEnabled: true
  }
};
```

### 缓存优化

```typescript
// 缓存优化
const cacheOptimizedConfig = {
  ...DEFAULT_PERFORMANCE_CONFIG,
  caching: {
    enableDiffCache: true,
    enableResultCache: true,
    maxCacheSize: 2000,
    cacheTTL: 7200, // 2小时
    cacheCompressionEnabled: true
  }
};

// 预热缓存
async function warmupCache(optimizer: VersionHistoryPerformanceOptimizer, documents: Document[]) {
  const comparisons = [];
  
  for (let i = 0; i < documents.length - 1; i++) {
    comparisons.push({
      oldContent: documents[i].content,
      newContent: documents[i + 1].content
    });
  }
  
  await optimizer.batchVersionCompare(comparisons);
  console.log('Cache warmed up with', comparisons.length, 'comparisons');
}
```

## 错误处理

### 常见错误和解决方案

```typescript
class ErrorHandler {
  static async handleVersionCompareError(error: Error, context: any): Promise<DiffResult[]> {
    if (error.message.includes('Memory')) {
      // 内存不足，使用简化模式
      console.warn('Memory insufficient, switching to simplified mode');
      const config = {
        ...DEFAULT_PERFORMANCE_CONFIG,
        diffOptimization: {
          ...DEFAULT_PERFORMANCE_CONFIG.diffOptimization,
          maxLinesForDetailedDiff: 1000 // 降低阈值
        }
      };
      
      const fallbackOptimizer = new VersionHistoryPerformanceOptimizer(config);
      return fallbackOptimizer.optimizedVersionCompare(context.oldContent, context.newContent);
    }
    
    if (error.message.includes('Timeout')) {
      // 超时，返回基本信息
      console.warn('Operation timeout, returning basic diff info');
      return [{
        type: 'modified',
        content: 'Content comparison timed out',
        lineNumber: 1
      }];
    }
    
    throw error; // 重新抛出未知错误
  }
}
```

### 重试机制

```typescript
async function withRetry<T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, i)));
      }
    }
  }
  
  throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError!.message}`);
}

// 使用示例
const result = await withRetry(() => 
  optimizer.optimizedVersionCompare(oldContent, newContent)
);
```

## 监控和调试

### 性能监控

```typescript
// 启用详细监控
class PerformanceMonitoringExample {
  private optimizer: VersionHistoryPerformanceOptimizer;
  
  constructor() {
    this.optimizer = new VersionHistoryPerformanceOptimizer();
    this.setupMonitoring();
  }
  
  private setupMonitoring(): void {
    // 定期生成性能报告
    setInterval(() => {
      const report = this.optimizer.getPerformanceReport();
      this.logPerformanceReport(report);
      
      // 检查是否需要调整配置
      if (report.recommendations.length > 0) {
        console.warn('Performance recommendations:', report.recommendations);
      }
    }, 60000); // 每分钟
  }
  
  private logPerformanceReport(report: any): void {
    console.log('=== Performance Report ===');
    console.log('Timestamp:', report.timestamp);
    console.log('Memory Usage:', report.metrics.memoryUsage, 'MB');
    console.log('Cache Hit Ratio:', (report.cache.hitRatio * 100).toFixed(2), '%');
    console.log('Active Operations:', report.concurrency.activeOperations);
    console.log('Queue Length:', report.concurrency.queueLength);
  }
}
```

### 调试工具

```typescript
// 启用调试模式
process.env.DEBUG_VERSION_HISTORY = 'true';

// 详细日志记录
function enableDebugLogging(): void {
  const originalMethods = {
    log: console.log,
    warn: console.warn,
    error: console.error
  };
  
  ['log', 'warn', 'error'].forEach(method => {
    console[method] = (...args: any[]) => {
      const timestamp = new Date().toISOString();
      const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      originalMethods[method](`[${timestamp}] [MEM:${memUsage}MB] [${method.toUpperCase()}]`, ...args);
    };
  });
}

// 操作性能分析
function profileOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    const startMem = process.memoryUsage().heapUsed;
    
    try {
      const result = await operation();
      
      const endTime = Date.now();
      const endMem = process.memoryUsage().heapUsed;
      const duration = endTime - startTime;
      const memDiff = (endMem - startMem) / 1024 / 1024;
      
      console.log(`[PROFILE] ${name}: ${duration}ms, ${memDiff.toFixed(2)}MB`);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}
```

## 测试

### 单元测试示例

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { VersionHistoryPerformanceOptimizer } from './version-history-system';

describe('VersionHistoryPerformanceOptimizer', () => {
  let optimizer: VersionHistoryPerformanceOptimizer;
  
  beforeEach(() => {
    optimizer = new VersionHistoryPerformanceOptimizer();
  });
  
  it('should handle identical content efficiently', async () => {
    const content = 'Same content';
    
    const startTime = Date.now();
    const result = await optimizer.optimizedVersionCompare(content, content);
    const endTime = Date.now();
    
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('unchanged');
    expect(endTime - startTime).toBeLessThan(10); // 应该很快完成
  });
  
  it('should detect simple additions', async () => {
    const oldContent = 'Line 1\nLine 2';
    const newContent = 'Line 1\nLine 2\nLine 3';
    
    const result = await optimizer.optimizedVersionCompare(oldContent, newContent);
    
    const addedLines = result.filter(r => r.type === 'added');
    expect(addedLines).toHaveLength(1);
    expect(addedLines[0].content).toBe('Line 3');
  });
});
```

### 集成测试示例

```typescript
describe('Integration Tests', () => {
  it('should handle complete workflow', async () => {
    const optimizer = new VersionHistoryPerformanceOptimizer();
    const mergeService = new DocumentMergeService();
    const rollbackService = new VersionRollbackService();
    
    // 1. 版本对比
    const diffs = await optimizer.optimizedVersionCompare(
      'Original content',
      'Modified content'
    );
    expect(diffs.length).toBeGreaterThan(0);
    
    // 2. 文档合并
    const mergeContext = createTestMergeContext();
    const mergeResult = await mergeService.mergeDocuments(mergeContext);
    expect(mergeResult.success).toBe(true);
    
    // 3. 版本回滚
    const rollbackContext = createTestRollbackContext();
    const rollbackResult = await rollbackService.rollbackVersion(
      rollbackContext, 
      { strategy: 'replace', scope: 'full', validateBeforeRollback: true, createBackup: true }
    );
    expect(rollbackResult.success).toBe(true);
  });
});
```

## 部署指南

### 环境要求

- Node.js 18.0+
- TypeScript 5.0+
- 内存: 最少2GB，推荐8GB+
- CPU: 最少2核，推荐4核+

### Docker部署

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源码
COPY . .

# 构建
RUN npm run build

# 启动
CMD ["npm", "start"]
```

### 环境变量配置

```bash
# 性能配置
PERFORMANCE_CONFIG_FILE=/app/config/performance.json
MAX_MEMORY_USAGE=1024
MAX_CONCURRENT_OPERATIONS=8

# 缓存配置
CACHE_ENABLED=true
CACHE_TTL=3600
CACHE_MAX_SIZE=1000

# 调试配置
DEBUG_VERSION_HISTORY=false
LOG_LEVEL=info
```

这个使用指南提供了完整的API文档、配置说明、使用示例和最佳实践，帮助开发者快速上手和高效使用版本历史系统。