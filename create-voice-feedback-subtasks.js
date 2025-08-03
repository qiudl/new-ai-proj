import('./mcp-task-bridge/task-mcp.js').then(async ({ TaskMCPServer }) => {
  const taskServer = new TaskMCPServer();
  
  try {
    console.log('🚀 开始创建MCP语音反馈功能的子任务...');
    
    // Phase 1: 语音服务核心引擎
    const phase1 = await taskServer.createTask('Phase 1: 语音服务核心引擎开发', 1, {
      parent_id: 247,
      description: `# Phase 1: 语音服务核心引擎开发

## 🎯 任务目标
设计并实现MCP语音反馈系统的核心引擎，包括语音合成服务、消息队列管理、配置管理等基础功能模块。

## 📋 开发任务

### 1. VoiceFeedbackService类设计与实现
#### 1.1 核心接口定义 (15分钟)
\`\`\`typescript
interface VoiceFeedbackConfig {
  enabled: boolean;          // 是否启用语音反馈
  volume: number;            // 音量 (0-100)
  rate: number;              // 语速 (0.5-2.0)
  pitch: number;             // 音调 (0-2)
  voice: string;             // 语音类型标识
  language: string;          // 语言设置 ('zh-CN', 'en-US')
  queueSize: number;         // 队列最大长度
}

interface FeedbackMessage {
  id: string;                // 消息唯一ID
  type: 'success' | 'error' | 'info' | 'warning';
  template: string;          // 消息模板标识
  variables?: Record<string, any>;  // 模板变量
  priority: 'low' | 'normal' | 'high';
  timestamp: number;         // 创建时间戳
  retryCount?: number;       // 重试次数
}

interface VoiceQueueItem extends FeedbackMessage {
  utterance?: SpeechSynthesisUtterance;
  promise?: {
    resolve: () => void;
    reject: (error: Error) => void;
  };
}
\`\`\`

#### 1.2 核心服务类实现 (45分钟)
\`\`\`typescript
class VoiceFeedbackService {
  private static instance: VoiceFeedbackService;
  private config: VoiceFeedbackConfig;
  private speechQueue: VoiceQueueItem[] = [];
  private isPlaying = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private statusCallbacks: Array<(status: VoiceStatus) => void> = [];
  
  // 单例模式实现
  static getInstance(): VoiceFeedbackService {
    if (!VoiceFeedbackService.instance) {
      VoiceFeedbackService.instance = new VoiceFeedbackService();
    }
    return VoiceFeedbackService.instance;
  }
  
  private constructor() {
    this.config = this.getDefaultConfig();
    this.initializeSpeechSynthesis();
  }
  
  // 核心方法
  async speak(message: FeedbackMessage): Promise<void> {
    if (!this.config.enabled || !this.isSupported()) {
      throw new Error('语音反馈功能未启用或不支持');
    }
    
    return new Promise((resolve, reject) => {
      const queueItem: VoiceQueueItem = {
        ...message,
        id: \`voice_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
        promise: { resolve, reject }
      };
      
      // 优先级队列插入
      this.insertByPriority(queueItem);
      this.processQueue();
    });
  }
  
  stopSpeaking(): void {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
      this.isPlaying = false;
      this.speechQueue = [];
      this.notifyStatusChange();
    }
  }
  
  updateConfig(newConfig: Partial<VoiceFeedbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.validateConfig();
  }
  
  isSupported(): boolean {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }
  
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return window.speechSynthesis?.getVoices() || [];
  }
  
  // 状态监听
  onStatusChange(callback: (status: VoiceStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }
}
\`\`\`

#### 1.3 队列管理与优先级处理 (20分钟)
- 优先级队列算法实现
- 队列长度限制和溢出处理
- 重复消息去重机制
- 队列状态监控

#### 1.4 错误处理与容错机制 (10分钟)
- 语音合成失败重试逻辑
- 浏览器兼容性检测
- 权限问题处理
- 降级方案实现

### 2. 消息模板引擎
#### 2.1 模板定义与管理 (10分钟)
\`\`\`typescript
const VOICE_TEMPLATES = {
  // 任务操作模板
  TASK_CREATED: '任务"{title}"创建成功',
  TASK_UPDATED: '任务"{title}"更新完成',
  TASK_DELETED: '任务已删除',
  TASK_STATUS_CHANGED: '任务状态已更新为{status}',
  TASK_ARCHIVED: '任务"{title}"已归档',
  
  // 批量操作模板
  BATCH_SUCCESS: '批量操作完成，成功{successCount}个',
  BATCH_PARTIAL: '批量操作部分成功，成功{successCount}个，失败{failCount}个',
  BATCH_FAILED: '批量操作失败，失败{failCount}个',
  
  // 错误提示模板
  OPERATION_FAILED: '操作失败：{errorMessage}',
  NETWORK_ERROR: '网络连接失败，请检查网络状态',
  PERMISSION_ERROR: '权限不足，无法完成操作',
  VALIDATION_ERROR: '数据验证失败：{details}',
  
  // 系统提示模板
  LOADING_COMPLETE: '数据加载完成',
  SAVING_PROGRESS: '正在保存数据',
  AUTO_SAVE_SUCCESS: '自动保存成功',
  SEARCH_COMPLETE: '搜索完成，找到{count}个结果',
  
  // 用户交互模板
  WELCOME: '欢迎使用AI项目管理平台',
  GOODBYE: '感谢使用，再见',
  HELP_AVAILABLE: '按F1获取帮助信息'
};

const VOICE_TEMPLATES_EN = {
  TASK_CREATED: 'Task "{title}" created successfully',
  TASK_UPDATED: 'Task "{title}" updated',
  OPERATION_FAILED: 'Operation failed: {errorMessage}',
  // ... 英文模板
};
\`\`\`

#### 2.2 模板解析与变量替换 (10分钟)
- 模板变量解析算法
- 类型安全的变量替换
- 默认值处理
- 格式化函数支持

### 3. 配置管理系统
#### 3.1 默认配置与持久化 (10分钟)
- localStorage配置存储
- 配置版本控制
- 配置迁移机制
- 配置验证

#### 3.2 多语言支持 (10分钟)
- 语言检测和切换
- 模板多语言映射
- 本地化配置

## 🧪 测试与验证

### 单元测试 (15分钟)
\`\`\`typescript
describe('VoiceFeedbackService', () => {
  test('should create singleton instance', () => {
    const instance1 = VoiceFeedbackService.getInstance();
    const instance2 = VoiceFeedbackService.getInstance();
    expect(instance1).toBe(instance2);
  });
  
  test('should handle message queue correctly', async () => {
    const service = VoiceFeedbackService.getInstance();
    const message: FeedbackMessage = {
      type: 'success',
      template: 'TASK_CREATED',
      variables: { title: '测试任务' },
      priority: 'normal'
    };
    
    // Mock speechSynthesis
    global.speechSynthesis = mockSpeechSynthesis;
    
    await expect(service.speak(message)).resolves.toBeUndefined();
  });
  
  test('should respect priority ordering', () => {
    // 测试优先级队列逻辑
  });
  
  test('should handle configuration updates', () => {
    // 测试配置更新逻辑
  });
});
\`\`\`

### 集成测试 (10分钟)
- 浏览器兼容性测试
- 性能基准测试
- 内存泄漏检测

## ✅ 验收标准

### 功能验收
- [ ] VoiceFeedbackService单例正常工作
- [ ] 语音队列支持优先级排序
- [ ] 配置持久化和更新正常
- [ ] 模板解析和变量替换正确
- [ ] 错误处理和重试机制生效

### 性能验收
- [ ] 语音合成响应时间 < 200ms
- [ ] 队列处理效率 > 10条/秒
- [ ] 内存使用 < 2MB
- [ ] 配置加载时间 < 50ms

### 代码质量验收
- [ ] TypeScript类型覆盖 100%
- [ ] 单元测试覆盖率 > 90%
- [ ] ESLint检查通过
- [ ] 代码注释完整

## 🔧 开发环境准备

### 依赖安装
\`\`\`bash
# 安装测试依赖
npm install --save-dev @types/jest jest ts-jest
npm install --save-dev @types/web-speech-api

# 安装类型定义
npm install --save-dev @types/speechsynthesis
\`\`\`

### 文件结构
\`\`\`
src/services/voice/
├── VoiceFeedbackService.ts      # 核心服务类
├── types/
│   ├── VoiceTypes.ts           # 类型定义
│   └── MessageTemplates.ts     # 消息模板
├── utils/
│   ├── VoiceQueue.ts           # 队列管理
│   ├── ConfigManager.ts        # 配置管理
│   └── TemplateEngine.ts       # 模板引擎
└── __tests__/
    ├── VoiceFeedbackService.test.ts
    └── integration.test.ts
\`\`\`

## 📚 技术要点

### 1. Web Speech API使用要点
- SpeechSynthesisUtterance事件处理
- 语音合成的异步特性
- 浏览器语音队列限制
- 权限和安全策略

### 2. TypeScript最佳实践
- 严格类型检查
- 泛型使用
- 装饰器模式
- 错误类型定义

### 3. 性能优化策略
- 懒加载语音引擎
- 队列批处理
- 内存池管理
- 事件节流

这是语音反馈系统的核心基础，为后续的MCP集成和用户界面开发奠定坚实基础！🔊`,
      status: 'todo',
      custom_fields: {
        priority: 'high',
        estimated_hours: 1.5,
        category: 'core-development',
        complexity: 'medium',
        tags: ['语音引擎', 'TypeScript', 'Web Speech API', '队列管理']
      }
    });

    console.log('✅ Phase 1创建成功:', phase1.id);

    // Phase 2: MCP集成与事件监听
    const phase2 = await taskServer.createTask('Phase 2: MCP集成与事件监听', 1, {
      parent_id: 247,
      description: `# Phase 2: MCP集成与事件监听

## 🎯 任务目标
将语音反馈功能深度集成到TaskMCPServer中，实现任务操作的智能语音提示，包括成功反馈、错误处理、状态变更通知等。

## 📋 开发任务

### 1. MCP服务器增强
#### 1.1 TaskMCPServer语音集成 (30分钟)
\`\`\`typescript
class TaskMCPServer {
  private voiceService: VoiceFeedbackService;
  private isVoiceEnabled: boolean = true;
  
  constructor() {
    this.voiceService = VoiceFeedbackService.getInstance();
    this.initializeVoiceIntegration();
  }
  
  private initializeVoiceIntegration(): void {
    // 监听语音服务状态
    this.voiceService.onStatusChange((status) => {
      console.log('Voice feedback status:', status);
    });
    
    // 检查语音支持
    if (!this.voiceService.isSupported()) {
      console.warn('Voice feedback not supported in this browser');
      this.isVoiceEnabled = false;
    }
  }
  
  // 语音反馈包装器
  private async withVoiceFeeback<T>(
    operation: () => Promise<T>,
    successTemplate: string,
    successVariables?: Record<string, any>,
    operationName?: string
  ): Promise<T> {
    try {
      const startTime = performance.now();
      const result = await operation();
      
      // 成功语音反馈
      if (this.isVoiceEnabled) {
        await this.voiceService.speak({
          type: 'success',
          template: successTemplate,
          variables: successVariables,
          priority: 'normal'
        });
      }
      
      // 性能日志
      const duration = performance.now() - startTime;
      console.log(\`\${operationName || 'Operation'} completed in \${duration}ms\`);
      
      return result;
    } catch (error) {
      // 错误语音反馈
      if (this.isVoiceEnabled) {
        await this.voiceService.speak({
          type: 'error',
          template: 'OPERATION_FAILED',
          variables: { 
            errorMessage: this.getReadableErrorMessage(error)
          },
          priority: 'high'
        });
      }
      throw error;
    }
  }
}
\`\`\`

#### 1.2 任务CRUD操作语音增强 (25分钟)
\`\`\`typescript
// 创建任务增强
async createTask(title: string, projectId: number, options?: any): Promise<CreateTaskResult> {
  return this.withVoiceFeeback(
    () => this.originalCreateTask(title, projectId, options),
    'TASK_CREATED',
    { title: this.truncateTitle(title) },
    'createTask'
  );
}

// 更新任务增强
async updateTask(taskId: number, updates: any): Promise<UpdateTaskResult> {
  const task = await this.findTaskById(taskId);
  
  return this.withVoiceFeeback(
    async () => {
      const result = await this.originalUpdateTask(taskId, updates);
      
      // 状态变更特殊语音提示
      if (updates.status && updates.status !== task.status) {
        await this.voiceService.speak({
          type: 'info',
          template: 'TASK_STATUS_CHANGED',
          variables: { 
            status: this.translateStatus(updates.status)
          },
          priority: 'normal'
        });
      }
      
      return result;
    },
    'TASK_UPDATED',
    { title: this.truncateTitle(task.title) },
    'updateTask'
  );
}

// 删除任务增强
async deleteTask(taskId: number): Promise<void> {
  const task = await this.findTaskById(taskId);
  
  return this.withVoiceFeeback(
    () => this.originalDeleteTask(taskId),
    'TASK_DELETED',
    { title: this.truncateTitle(task.title) },
    'deleteTask'
  );
}
\`\`\`

#### 1.3 批量操作语音反馈 (20分钟)
\`\`\`typescript
async batchUpdateTasks(taskIds: number[], updates: any): Promise<BatchResult> {
  const startTime = performance.now();
  
  try {
    const results = await this.originalBatchUpdate(taskIds, updates);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    // 批量操作结果语音播报
    if (this.isVoiceEnabled) {
      let template: string;
      let type: 'success' | 'warning' | 'error';
      
      if (failCount === 0) {
        template = 'BATCH_SUCCESS';
        type = 'success';
      } else if (successCount > 0) {
        template = 'BATCH_PARTIAL';
        type = 'warning';
      } else {
        template = 'BATCH_FAILED';
        type = 'error';
      }
      
      await this.voiceService.speak({
        type,
        template,
        variables: { successCount, failCount },
        priority: failCount > 0 ? 'high' : 'normal'
      });
    }
    
    return results;
  } catch (error) {
    if (this.isVoiceEnabled) {
      await this.voiceService.speak({
        type: 'error',
        template: 'OPERATION_FAILED',
        variables: { errorMessage: '批量操作失败' },
        priority: 'high'
      });
    }
    throw error;
  }
}
\`\`\`

### 2. 智能错误处理与分类
#### 2.1 错误消息智能化 (15分钟)
\`\`\`typescript
private getReadableErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  
  // 网络错误
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
    return '网络连接失败';
  }
  
  // 权限错误
  if (error.status === 403 || error.message?.includes('permission')) {
    return '权限不足';
  }
  
  // 验证错误
  if (error.status === 400 || error.message?.includes('validation')) {
    return '数据验证失败';
  }
  
  // 通用错误
  return error.message || '未知错误';
}

private async handleSpecificError(error: any, context: string): Promise<void> {
  let template = 'OPERATION_FAILED';
  let variables: Record<string, any> = { errorMessage: this.getReadableErrorMessage(error) };
  
  // 特定错误类型的专门处理
  switch (error.type) {
    case 'NETWORK_ERROR':
      template = 'NETWORK_ERROR';
      variables = {};
      break;
    case 'PERMISSION_ERROR':
      template = 'PERMISSION_ERROR';
      variables = {};
      break;
    case 'VALIDATION_ERROR':
      template = 'VALIDATION_ERROR';
      variables = { details: error.details || '请检查输入数据' };
      break;
  }
  
  if (this.isVoiceEnabled) {
    await this.voiceService.speak({
      type: 'error',
      template,
      variables,
      priority: 'high'
    });
  }
}
\`\`\`

#### 2.2 状态翻译与本地化 (10分钟)
\`\`\`typescript
private translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'todo': '待开始',
    'in_progress': '进行中',
    'completed': '已完成',
    'cancelled': '已取消',
    'archived': '已归档',
    'on_hold': '暂停中'
  };
  
  return statusMap[status] || status;
}

private truncateTitle(title: string, maxLength: number = 20): string {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
}
\`\`\`

### 3. 事件驱动架构增强
#### 3.1 任务事件监听器 (15分钟)
\`\`\`typescript
interface TaskEvent {
  type: 'created' | 'updated' | 'deleted' | 'status_changed';
  taskId: number;
  data: any;
  timestamp: number;
  userId?: number;
}

class TaskEventManager {
  private listeners: Map<string, Array<(event: TaskEvent) => void>> = new Map();
  
  on(eventType: string, callback: (event: TaskEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
    
    // 返回取消监听函数
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    };
  }
  
  emit(event: TaskEvent): void {
    const callbacks = this.listeners.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }
}

// 在TaskMCPServer中集成
private setupEventListeners(): void {
  this.eventManager.on('status_changed', async (event) => {
    if (this.isVoiceEnabled) {
      await this.voiceService.speak({
        type: 'info',
        template: 'TASK_STATUS_CHANGED',
        variables: { status: this.translateStatus(event.data.newStatus) },
        priority: 'low'
      });
    }
  });
  
  this.eventManager.on('created', async (event) => {
    // 创建事件已在createTask中处理
  });
}
\`\`\`

#### 3.2 性能监控与统计 (10分钟)
\`\`\`typescript
interface OperationMetrics {
  operationType: string;
  duration: number;
  success: boolean;
  voiceFeedbackEnabled: boolean;
  timestamp: number;
}

class VoicePerformanceMonitor {
  private metrics: OperationMetrics[] = [];
  
  recordOperation(metrics: OperationMetrics): void {
    this.metrics.push(metrics);
    
    // 保持最近1000条记录
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }
  
  getStats(): {
    averageDuration: number;
    successRate: number;
    voiceUsageRate: number;
  } {
    if (this.metrics.length === 0) {
      return { averageDuration: 0, successRate: 0, voiceUsageRate: 0 };
    }
    
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const successCount = this.metrics.filter(m => m.success).length;
    const voiceEnabledCount = this.metrics.filter(m => m.voiceFeedbackEnabled).length;
    
    return {
      averageDuration: totalDuration / this.metrics.length,
      successRate: successCount / this.metrics.length,
      voiceUsageRate: voiceEnabledCount / this.metrics.length
    };
  }
}
\`\`\`

## 🧪 测试与验证

### 集成测试 (15分钟)
\`\`\`typescript
describe('MCP Voice Integration', () => {
  let mcpServer: TaskMCPServer;
  let mockVoiceService: jest.Mocked<VoiceFeedbackService>;
  
  beforeEach(() => {
    mockVoiceService = createMockVoiceService();
    mcpServer = new TaskMCPServer();
    // 注入mock语音服务
  });
  
  test('should provide voice feedback on task creation', async () => {
    const result = await mcpServer.createTask('测试任务', 1);
    
    expect(mockVoiceService.speak).toHaveBeenCalledWith({
      type: 'success',
      template: 'TASK_CREATED',
      variables: { title: '测试任务' },
      priority: 'normal'
    });
  });
  
  test('should handle batch operations with voice summary', async () => {
    const taskIds = [1, 2, 3];
    const mockResults = [
      { success: true, taskId: 1 },
      { success: true, taskId: 2 },
      { success: false, taskId: 3, error: 'Permission denied' }
    ];
    
    // Mock批量更新
    jest.spyOn(mcpServer, 'originalBatchUpdate').mockResolvedValue(mockResults);
    
    await mcpServer.batchUpdateTasks(taskIds, { status: 'completed' });
    
    expect(mockVoiceService.speak).toHaveBeenCalledWith({
      type: 'warning',
      template: 'BATCH_PARTIAL',
      variables: { successCount: 2, failCount: 1 },
      priority: 'high'
    });
  });
});
\`\`\`

### 性能测试 (10分钟)
- 语音反馈延迟测试
- 批量操作性能影响
- 内存使用监控
- 错误恢复测试

## ✅ 验收标准

### 功能验收
- [ ] 所有CRUD操作都有对应语音反馈
- [ ] 批量操作结果语音播报准确
- [ ] 错误分类和语音提示正确
- [ ] 状态变更语音通知及时

### 性能验收
- [ ] 语音反馈不影响操作性能 (延迟 < 50ms)
- [ ] 错误处理不阻塞主流程
- [ ] 事件监听器无内存泄漏
- [ ] 批量操作语音反馈响应及时

### 用户体验验收
- [ ] 语音内容清晰易懂
- [ ] 错误描述用户友好
- [ ] 批量操作进度反馈及时
- [ ] 可以优雅地禁用语音功能

这个阶段将语音反馈深度集成到MCP核心，让每个操作都有智能的声音反馈！🔊`,
      status: 'todo',
      custom_fields: {
        priority: 'high',
        estimated_hours: 1.25,
        category: 'mcp-integration',
        complexity: 'medium',
        tags: ['MCP集成', '事件监听', '错误处理', '批量操作']
      }
    });

    console.log('✅ Phase 2创建成功:', phase2.id);

    // Phase 3: 用户界面与设置管理
    const phase3 = await taskServer.createTask('Phase 3: 用户界面与设置管理', 1, {
      parent_id: 247,
      description: `# Phase 3: 用户界面与设置管理

## 🎯 任务目标
为MCP语音反馈功能创建直观易用的用户界面，包括设置面板、状态指示器、语音测试等功能，确保用户能够方便地配置和控制语音反馈。

## 📋 开发任务

### 1. 语音设置面板组件
#### 1.1 VoiceSettingsPanel主组件 (25分钟)
\`\`\`typescript
interface VoiceSettingsPanelProps {
  visible?: boolean;
  onClose?: () => void;
  onConfigChange?: (config: Partial<VoiceFeedbackConfig>) => void;
}

const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({
  visible = false,
  onClose,
  onConfigChange
}) => {
  const [config, setConfig] = useState<VoiceFeedbackConfig>();
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isTestPlaying, setIsTestPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const voiceService = VoiceFeedbackService.getInstance();
  
  useEffect(() => {
    if (visible) {
      loadSettings();
      loadAvailableVoices();
    }
  }, [visible]);
  
  const loadSettings = async () => {
    try {
      setLoading(true);
      const currentConfig = await voiceService.getConfig();
      setConfig(currentConfig);
    } catch (error) {
      message.error('加载语音设置失败');
      console.error('Load voice settings error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadAvailableVoices = () => {
    const voices = voiceService.getAvailableVoices();
    setAvailableVoices(voices);
    
    // 如果浏览器需要异步加载语音列表
    if (voices.length === 0) {
      const checkVoices = () => {
        const newVoices = voiceService.getAvailableVoices();
        if (newVoices.length > 0) {
          setAvailableVoices(newVoices);
        } else {
          setTimeout(checkVoices, 100);
        }
      };
      checkVoices();
    }
  };
  
  const handleConfigChange = (key: keyof VoiceFeedbackConfig, value: any) => {
    if (!config) return;
    
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    voiceService.updateConfig({ [key]: value });
    onConfigChange?.({ [key]: value });
  };
  
  const testVoice = async () => {
    if (isTestPlaying) return;
    
    setIsTestPlaying(true);
    try {
      await voiceService.speak({
        type: 'info',
        template: 'VOICE_TEST',
        variables: { 
          volume: config?.volume,
          rate: config?.rate === 0.7 ? '慢速' : config?.rate === 1.3 ? '快速' : '正常'
        },
        priority: 'high'
      });
    } catch (error) {
      message.error('语音测试失败：' + error.message);
    } finally {
      setIsTestPlaying(false);
    }
  };
  
  if (loading) {
    return (
      <Modal title="🔊 语音反馈设置" open={visible} footer={null}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>正在加载设置...</div>
        </div>
      </Modal>
    );
  }
  
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SoundOutlined />
          <span>语音反馈设置</span>
          {!voiceService.isSupported() && (
            <Tag color="orange">当前浏览器不支持</Tag>
          )}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="test" 
                type="default" 
                icon={<PlayCircleOutlined />}
                loading={isTestPlaying}
                disabled={!config?.enabled || !voiceService.isSupported()}
                onClick={testVoice}>
          测试语音
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 基础开关 */}
        <Card size="small" title="基础设置">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>启用语音反馈</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    开启后将在操作完成时播放语音提示
                  </Text>
                </div>
              </div>
              <Switch 
                checked={config?.enabled}
                disabled={!voiceService.isSupported()}
                onChange={(enabled) => handleConfigChange('enabled', enabled)}
              />
            </div>
            
            {!voiceService.isSupported() && (
              <Alert
                message="当前浏览器不支持语音合成功能"
                description="请使用Chrome、Edge、Firefox等现代浏览器"
                type="warning"
                showIcon
              />
            )}
          </Space>
        </Card>
        
        {/* 音频设置 */}
        <Card size="small" title="音频设置" style={{ opacity: config?.enabled ? 1 : 0.5 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>音量: {config?.volume}%</Text>
              <Slider
                min={0}
                max={100}
                value={config?.volume}
                disabled={!config?.enabled}
                onChange={(volume) => handleConfigChange('volume', volume)}
                marks={{
                  0: '静音',
                  50: '50%',
                  100: '最大'
                }}
              />
            </div>
            
            <div>
              <Text strong>语速</Text>
              <Radio.Group
                value={config?.rate}
                disabled={!config?.enabled}
                onChange={(e) => handleConfigChange('rate', e.target.value)}
                style={{ width: '100%', marginTop: 8 }}
              >
                <Radio.Button value={0.7}>慢速</Radio.Button>
                <Radio.Button value={1.0}>正常</Radio.Button>
                <Radio.Button value={1.3}>快速</Radio.Button>
              </Radio.Group>
            </div>
            
            <div>
              <Text strong>音调</Text>
              <Slider
                min={0.5}
                max={2}
                step={0.1}
                value={config?.pitch}
                disabled={!config?.enabled}
                onChange={(pitch) => handleConfigChange('pitch', pitch)}
                marks={{
                  0.5: '低',
                  1: '正常',
                  2: '高'
                }}
              />
            </div>
          </Space>
        </Card>
        
        {/* 语音选择 */}
        <Card size="small" title="语音类型" style={{ opacity: config?.enabled ? 1 : 0.5 }}>
          <div>
            <Text strong>选择语音</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={config?.voice}
              disabled={!config?.enabled || availableVoices.length === 0}
              onChange={(voice) => handleConfigChange('voice', voice)}
              placeholder={availableVoices.length === 0 ? "正在加载语音列表..." : "选择语音类型"}
            >
              {availableVoices
                .filter(voice => voice.lang.startsWith('zh') || voice.lang.startsWith('en'))
                .map(voice => (
                  <Option key={voice.name} value={voice.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{voice.name}</span>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {voice.lang}
                      </Text>
                    </div>
                  </Option>
                ))}
            </Select>
          </div>
        </Card>
        
        {/* 高级设置 */}
        <Collapse ghost>
          <Panel header="高级设置" key="advanced">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>队列大小限制</Text>
                <InputNumber
                  min={1}
                  max={20}
                  value={config?.queueSize}
                  disabled={!config?.enabled}
                  onChange={(queueSize) => handleConfigChange('queueSize', queueSize || 5)}
                  style={{ width: '100%', marginTop: 8 }}
                />
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  同时排队的语音消息数量上限
                </Text>
              </div>
              
              <div>
                <Text strong>语言设置</Text>
                <Select
                  value={config?.language}
                  disabled={!config?.enabled}
                  onChange={(language) => handleConfigChange('language', language)}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  <Option value="zh-CN">中文（简体）</Option>
                  <Option value="en-US">English (US)</Option>
                  <Option value="auto">自动检测</Option>
                </Select>
              </div>
            </Space>
          </Panel>
        </Collapse>
      </Space>
    </Modal>
  );
};
\`\`\`

#### 1.2 语音状态指示器 (15分钟)
\`\`\`typescript
interface VoiceStatusIndicatorProps {
  position?: 'top-right' | 'bottom-right' | 'bottom-left';
  style?: React.CSSProperties;
}

const VoiceStatusIndicator: React.FC<VoiceStatusIndicatorProps> = ({
  position = 'bottom-right',
  style = {}
}) => {
  const [status, setStatus] = useState<VoiceStatus>({
    isPlaying: false,
    currentMessage: '',
    queueLength: 0,
    isEnabled: true
  });
  
  const voiceService = VoiceFeedbackService.getInstance();
  
  useEffect(() => {
    const unsubscribe = voiceService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
    
    // 初始状态
    setStatus(voiceService.getCurrentStatus());
    
    return unsubscribe;
  }, []);
  
  if (!status.isEnabled || !status.isPlaying) {
    return null;
  }
  
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right': { top: 20, right: 20 },
    'bottom-right': { bottom: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 }
  };
  
  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: 300,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(8px)',
        ...style
      }}
    >
      <SoundOutlined 
        style={{ 
          fontSize: 16,
          animation: 'pulse 1.5s infinite'
        }} 
      />
      <div style={{ flex: 1, fontSize: 14 }}>
        <div style={{ fontWeight: 500 }}>正在播放语音</div>
        {status.currentMessage && (
          <div style={{ 
            fontSize: 12, 
            opacity: 0.8,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {status.currentMessage}
          </div>
        )}
      </div>
      {status.queueLength > 0 && (
        <Badge 
          count={status.queueLength} 
          style={{ backgroundColor: '#ff4d4f' }}
        />
      )}
    </div>
  );
};

// 添加CSS动画
const GlobalStyle = createGlobalStyle\`
  @keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
    100% { opacity: 1; transform: scale(1); }
  }
\`;
\`\`\`

#### 1.3 语音控制快捷按钮 (10分钟)
\`\`\`typescript
const VoiceControlButton: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const voiceService = VoiceFeedbackService.getInstance();
  
  useEffect(() => {
    const unsubscribe = voiceService.onStatusChange((status) => {
      setIsEnabled(status.isEnabled);
      setIsPlaying(status.isPlaying);
    });
    
    return unsubscribe;
  }, []);
  
  const toggleVoice = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    voiceService.updateConfig({ enabled: newEnabled });
    
    if (newEnabled) {
      message.success('语音反馈已开启');
    } else {
      voiceService.stopSpeaking();
      message.info('语音反馈已关闭');
    }
  };
  
  const stopCurrent = () => {
    voiceService.stopSpeaking();
    message.info('已停止当前语音');
  };
  
  return (
    <>
      <Dropdown
        overlay={
          <Menu>
            <Menu.Item key="toggle" onClick={toggleVoice}>
              {isEnabled ? (
                <>
                  <SoundOutlined /> 关闭语音反馈
                </>
              ) : (
                <>
                  <SoundFilled /> 开启语音反馈
                </>
              )}
            </Menu.Item>
            
            {isPlaying && (
              <Menu.Item key="stop" onClick={stopCurrent}>
                <PauseOutlined /> 停止当前语音
              </Menu.Item>
            )}
            
            <Menu.Divider />
            
            <Menu.Item key="settings" onClick={() => setShowSettings(true)}>
              <SettingOutlined /> 语音设置
            </Menu.Item>
          </Menu>
        }
        trigger={['click']}
      >
        <Button
          type="text"
          icon={
            isEnabled ? (
              isPlaying ? <SoundOutlined spin /> : <SoundFilled />
            ) : (
              <SoundOutlined />
            )
          }
          style={{
            opacity: isEnabled ? 1 : 0.5
          }}
        />
      </Dropdown>
      
      <VoiceSettingsPanel
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
};
\`\`\`

### 2. 设置持久化与用户偏好
#### 2.1 配置管理服务 (10分钟)
\`\`\`typescript
class VoiceConfigManager {
  private static readonly STORAGE_KEY = 'voice_feedback_config';
  private static readonly CONFIG_VERSION = '1.0';
  
  static saveConfig(config: VoiceFeedbackConfig): void {
    try {
      const configData = {
        version: this.CONFIG_VERSION,
        timestamp: Date.now(),
        config
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configData));
    } catch (error) {
      console.error('Save voice config failed:', error);
    }
  }
  
  static loadConfig(): VoiceFeedbackConfig | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      
      const configData = JSON.parse(stored);
      
      // 版本兼容性检查
      if (configData.version !== this.CONFIG_VERSION) {
        console.log('Voice config version mismatch, using defaults');
        return null;
      }
      
      return configData.config;
    } catch (error) {
      console.error('Load voice config failed:', error);
      return null;
    }
  }
  
  static clearConfig(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
  
  static exportConfig(): string {
    const config = this.loadConfig();
    if (!config) throw new Error('No config to export');
    
    return JSON.stringify(config, null, 2);
  }
  
  static importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      // 验证配置格式
      this.validateConfig(config);
      this.saveConfig(config);
    } catch (error) {
      throw new Error('Invalid config format: ' + error.message);
    }
  }
  
  private static validateConfig(config: any): void {
    const required = ['enabled', 'volume', 'rate', 'pitch', 'language'];
    for (const field of required) {
      if (!(field in config)) {
        throw new Error(\`Missing required field: \${field}\`);
      }
    }
  }
}
\`\`\`

## 🧪 测试与验证

### 组件测试 (15分钟)
\`\`\`typescript
describe('VoiceSettingsPanel', () => {
  test('should render all settings options', () => {
    render(<VoiceSettingsPanel visible={true} />);
    
    expect(screen.getByText('启用语音反馈')).toBeInTheDocument();
    expect(screen.getByText('音量')).toBeInTheDocument();
    expect(screen.getByText('语速')).toBeInTheDocument();
  });
  
  test('should handle configuration changes', () => {
    const mockOnConfigChange = jest.fn();
    
    render(<VoiceSettingsPanel visible={true} onConfigChange={mockOnConfigChange} />);
    
    const enableSwitch = screen.getByRole('switch');
    fireEvent.click(enableSwitch);
    
    expect(mockOnConfigChange).toHaveBeenCalledWith({ enabled: false });
  });
});

describe('VoiceStatusIndicator', () => {
  test('should not render when voice is disabled', () => {
    // Mock disabled state
    const { container } = render(<VoiceStatusIndicator />);
    expect(container.firstChild).toBeNull();
  });
  
  test('should render with current message when playing', () => {
    // Mock playing state
    render(<VoiceStatusIndicator />);
    expect(screen.getByText('正在播放语音')).toBeInTheDocument();
  });
});
\`\`\`

### 用户体验测试 (10分钟)
- 设置界面可用性测试
- 语音测试功能验证
- 配置持久化测试
- 响应式设计测试

## ✅ 验收标准

### 功能验收
- [ ] 语音设置面板完整功能正常
- [ ] 状态指示器实时反映语音状态
- [ ] 配置持久化和恢复正常
- [ ] 快捷控制按钮响应及时

### 用户体验验收
- [ ] 界面直观易用，操作流畅
- [ ] 语音测试功能正常工作
- [ ] 设置变更即时生效
- [ ] 错误提示清晰友好

### 兼容性验收
- [ ] 支持主流浏览器显示
- [ ] 移动端界面适配良好
- [ ] 无障碍功能符合标准
- [ ] 配置导入导出正常

这个阶段将为用户提供完整的语音反馈控制体验！🎛️`,
      status: 'todo',
      custom_fields: {
        priority: 'medium',
        estimated_hours: 1.0,
        category: 'ui-development',
        complexity: 'medium',
        tags: ['React组件', '用户界面', '设置管理', '状态指示']
      }
    });

    console.log('✅ Phase 3创建成功:', phase3.id);

    // Phase 4: 高级功能与优化
    const phase4 = await taskServer.createTask('Phase 4: 高级功能与优化', 1, {
      parent_id: 247,
      description: `# Phase 4: 高级功能与优化

## 🎯 任务目标
实现MCP语音反馈系统的高级功能和性能优化，包括智能音频管理、无障碍功能增强、多语言支持等，提升系统的稳定性和用户体验。

## 📋 开发任务

### 1. 智能音频管理
#### 1.1 音频冲突检测与处理 (15分钟)
\`\`\`typescript
class AudioConflictManager {
  private mediaCheckInterval: number | null = null;
  private conflictCallbacks: Array<(hasConflict: boolean) => void> = [];
  
  constructor() {
    this.startMediaDetection();
  }
  
  private startMediaDetection(): void {
    this.mediaCheckInterval = window.setInterval(() => {
      this.checkAudioConflicts();
    }, 1000);
  }
  
  private checkAudioConflicts(): boolean {
    const hasConflict = this.detectPlayingMedia();
    
    // 通知冲突状态变化
    this.conflictCallbacks.forEach(callback => {
      try {
        callback(hasConflict);
      } catch (error) {
        console.error('Audio conflict callback error:', error);
      }
    });
    
    return hasConflict;
  }
  
  private detectPlayingMedia(): boolean {
    // 检测页面中的音频/视频元素
    const mediaElements = document.querySelectorAll('audio, video');
    for (const element of mediaElements) {
      const media = element as HTMLMediaElement;
      if (!media.paused && !media.muted) {
        return true;
      }
    }
    
    // 检测Web Audio API
    if (this.isWebAudioActive()) {
      return true;
    }
    
    return false;
  }
  
  private isWebAudioActive(): boolean {
    // 简单检测：如果有其他语音合成在播放
    return window.speechSynthesis?.speaking || false;
  }
  
  onConflictChange(callback: (hasConflict: boolean) => void): () => void {
    this.conflictCallbacks.push(callback);
    return () => {
      this.conflictCallbacks = this.conflictCallbacks.filter(cb => cb !== callback);
    };
  }
  
  destroy(): void {
    if (this.mediaCheckInterval) {
      clearInterval(this.mediaCheckInterval);
      this.mediaCheckInterval = null;
    }
    this.conflictCallbacks = [];
  }
}

// 在VoiceFeedbackService中集成
class EnhancedVoiceFeedbackService extends VoiceFeedbackService {
  private audioManager: AudioConflictManager;
  private originalVolume: number;
  
  constructor() {
    super();
    this.audioManager = new AudioConflictManager();
    this.originalVolume = this.config.volume;
    this.setupConflictHandling();
  }
  
  private setupConflictHandling(): void {
    this.audioManager.onConflictChange((hasConflict) => {
      if (hasConflict) {
        // 降低音量或暂停
        this.handleAudioConflict();
      } else {
        // 恢复正常音量
        this.restoreAudioSettings();
      }
    });
  }
  
  private handleAudioConflict(): void {
    this.originalVolume = this.config.volume;
    
    // 降低音量到30%
    this.updateConfig({ volume: Math.min(this.config.volume, 30) });
    
    console.log('Audio conflict detected, reducing voice volume');
  }
  
  private restoreAudioSettings(): void {
    this.updateConfig({ volume: this.originalVolume });
    console.log('Audio conflict resolved, restoring voice volume');
  }
}
\`\`\`

#### 1.2 环境音适应与智能音量 (10分钟)
\`\`\`typescript
interface EnvironmentAudioContext {
  ambientNoiseLevel: number;  // 0-100
  recommendedVolume: number;  // 0-100
  confidence: number;         // 0-1
}

class EnvironmentAudioAdapter {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStream | null = null;
  
  async initialize(): Promise<boolean> {
    try {
      // 请求麦克风权限（仅用于环境音检测）
      this.microphone = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      
      const source = this.audioContext.createMediaStreamSource(this.microphone);
      source.connect(this.analyser);
      
      this.analyser.fftSize = 256;
      
      return true;
    } catch (error) {
      console.warn('Environment audio detection not available:', error);
      return false;
    }
  }
  
  getCurrentEnvironmentContext(): EnvironmentAudioContext {
    if (!this.analyser) {
      return { ambientNoiseLevel: 50, recommendedVolume: 70, confidence: 0 };
    }
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    
    // 计算平均音量
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const ambientNoiseLevel = Math.round((average / 255) * 100);
    
    // 根据环境音推荐音量
    let recommendedVolume: number;
    if (ambientNoiseLevel < 20) {
      recommendedVolume = 50; // 安静环境，较低音量
    } else if (ambientNoiseLevel < 60) {
      recommendedVolume = 70; // 正常环境
    } else {
      recommendedVolume = 90; // 嘈杂环境，提高音量
    }
    
    return {
      ambientNoiseLevel,
      recommendedVolume,
      confidence: 0.8
    };
  }
  
  dispose(): void {
    if (this.microphone) {
      this.microphone.getTracks().forEach(track => track.stop());
      this.microphone = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
\`\`\`

#### 1.3 播放队列优化 (10分钟)
\`\`\`typescript
class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = [];
  
  enqueue(item: T, priority: number): void {
    const queueItem = { item, priority };
    
    // 找到正确插入位置（高优先级在前）
    let insertIndex = this.items.length;
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].priority < priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.items.splice(insertIndex, 0, queueItem);
  }
  
  dequeue(): T | undefined {
    const queueItem = this.items.shift();
    return queueItem?.item;
  }
  
  peek(): T | undefined {
    return this.items[0]?.item;
  }
  
  size(): number {
    return this.items.length;
  }
  
  clear(): void {
    this.items = [];
  }
  
  // 允许高优先级消息打断低优先级消息
  canInterrupt(newPriority: number): boolean {
    if (this.items.length === 0) return true;
    
    const currentPriority = this.items[0].priority;
    return newPriority > currentPriority;
  }
}

// 队列管理增强
class EnhancedQueueManager {
  private priorityQueue = new PriorityQueue<VoiceQueueItem>();
  private processing = false;
  
  async addMessage(message: VoiceQueueItem, canInterrupt = false): Promise<void> {
    const priority = this.getPriorityValue(message.priority);
    
    // 检查是否需要打断当前播放
    if (canInterrupt && this.priorityQueue.canInterrupt(priority) && this.processing) {
      window.speechSynthesis.cancel();
      this.processing = false;
    }
    
    this.priorityQueue.enqueue(message, priority);
    
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private getPriorityValue(priority: string): number {
    const priorityMap: Record<string, number> = {
      'low': 1,
      'normal': 2,
      'high': 3
    };
    return priorityMap[priority] || 2;
  }
  
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    
    while (this.priorityQueue.size() > 0) {
      const message = this.priorityQueue.dequeue();
      if (message) {
        try {
          await this.playMessage(message);
        } catch (error) {
          console.error('Voice playback error:', error);
        }
      }
    }
    
    this.processing = false;
  }
}
\`\`\`

### 2. 无障碍功能增强
#### 2.1 视觉辅助功能 (10分钟)
\`\`\`typescript
interface AccessibilityFeatures {
  showVisualCaptions: boolean;
  highContrastMode: boolean;
  largeText: boolean;
  screenReaderSupport: boolean;
}

const VoiceAccessibilityProvider: React.FC<{
  children: React.ReactNode;
  features: AccessibilityFeatures;
}> = ({ children, features }) => {
  const [currentCaption, setCurrentCaption] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const voiceService = VoiceFeedbackService.getInstance();
    
    const unsubscribe = voiceService.onStatusChange((status) => {
      if (features.showVisualCaptions) {
        setCurrentCaption(status.currentMessage || '');
        setIsVisible(status.isPlaying);
      }
    });
    
    return unsubscribe;
  }, [features.showVisualCaptions]);
  
  return (
    <>
      {children}
      
      {/* 语音字幕显示 */}
      {features.showVisualCaptions && isVisible && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: features.highContrastMode ? '#000' : 'rgba(0, 0, 0, 0.8)',
            color: features.highContrastMode ? '#fff' : 'white',
            padding: '12px 20px',
            borderRadius: 8,
            fontSize: features.largeText ? 18 : 14,
            fontWeight: features.largeText ? 'bold' : 'normal',
            maxWidth: '80%',
            textAlign: 'center',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            border: features.highContrastMode ? '2px solid #fff' : 'none'
          }}
        >
          <SoundOutlined style={{ marginRight: 8 }} />
          {currentCaption}
        </div>
      )}
      
      {/* 屏幕阅读器支持 */}
      {features.screenReaderSupport && (
        <div
          id="voice-feedback-announcer"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: 'absolute',
            left: '-10000px',
            width: '1px',
            height: '1px',
            overflow: 'hidden'
          }}
        >
          {currentCaption}
        </div>
      )}
    </>
  );
};
\`\`\`

#### 2.2 键盘控制支持 (10分钟)
\`\`\`typescript
const useVoiceKeyboardShortcuts = () => {
  const voiceService = VoiceFeedbackService.getInstance();
  
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + V: 切换语音开关
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        const currentConfig = voiceService.getConfig();
        voiceService.updateConfig({ enabled: !currentConfig.enabled });
        
        // 提供音频反馈
        if (!currentConfig.enabled) {
          voiceService.speak({
            type: 'info',
            template: 'VOICE_ENABLED',
            priority: 'high'
          });
        }
      }
      
      // Ctrl/Cmd + Shift + S: 停止当前语音
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        voiceService.stopSpeaking();
      }
      
      // Ctrl/Cmd + Shift + T: 语音测试
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        voiceService.speak({
          type: 'info',
          template: 'VOICE_TEST',
          priority: 'high'
        });
      }
    };
    
    document.addEventListener('keydown', handleKeyboard);
    
    return () => {
      document.removeEventListener('keydown', handleKeyboard);
    };
  }, []);
};

// 键盘快捷键帮助组件
const VoiceKeyboardHelp: React.FC = () => {
  const shortcuts = [
    { key: 'Ctrl/Cmd + Shift + V', description: '切换语音反馈开关' },
    { key: 'Ctrl/Cmd + Shift + S', description: '停止当前语音播放' },
    { key: 'Ctrl/Cmd + Shift + T', description: '语音测试' }
  ];
  
  return (
    <Card title="🎹 键盘快捷键" size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        {shortcuts.map((shortcut, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <kbd style={{
              padding: '2px 6px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #d9d9d9',
              borderRadius: 3,
              fontSize: 12,
              fontFamily: 'monospace'
            }}>
              {shortcut.key}
            </kbd>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {shortcut.description}
            </Text>
          </div>
        ))}
      </Space>
    </Card>
  );
};
\`\`\`

### 3. 性能优化与缓存
#### 3.1 语音缓存机制 (8分钟)
\`\`\`typescript
class VoiceCacheManager {
  private cache = new Map<string, Blob>();
  private maxCacheSize = 50; // 最多缓存50个语音
  private cacheHits = 0;
  private cacheMisses = 0;
  
  private generateCacheKey(text: string, config: VoiceFeedbackConfig): string {
    return \`\${text}_\${config.voice}_\${config.rate}_\${config.pitch}\`;
  }
  
  async getCachedAudio(text: string, config: VoiceFeedbackConfig): Promise<Blob | null> {
    const key = this.generateCacheKey(text, config);
    
    if (this.cache.has(key)) {
      this.cacheHits++;
      return this.cache.get(key)!;
    }
    
    this.cacheMisses++;
    return null;
  }
  
  async cacheAudio(text: string, config: VoiceFeedbackConfig, audioBlob: Blob): Promise<void> {
    const key = this.generateCacheKey(text, config);
    
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, audioBlob);
  }
  
  getCacheStats(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
      size: this.cache.size
    };
  }
  
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}
\`\`\`

#### 3.2 懒加载与按需初始化 (7分钟)
\`\`\`typescript
class LazyVoiceService {
  private static _instance: VoiceFeedbackService | null = null;
  private static _initializing = false;
  
  static async getInstance(): Promise<VoiceFeedbackService> {
    if (this._instance) {
      return this._instance;
    }
    
    if (this._initializing) {
      // 等待初始化完成
      return new Promise((resolve) => {
        const checkInitialized = () => {
          if (this._instance) {
            resolve(this._instance);
          } else {
            setTimeout(checkInitialized, 10);
          }
        };
        checkInitialized();
      });
    }
    
    this._initializing = true;
    
    try {
      // 动态导入语音相关依赖
      const { VoiceFeedbackService } = await import('./VoiceFeedbackService');
      
      this._instance = new VoiceFeedbackService();
      await this._instance.initialize();
      
      return this._instance;
    } finally {
      this._initializing = false;
    }
  }
  
  static isInitialized(): boolean {
    return this._instance !== null;
  }
}

// 预加载优化
class VoicePreloader {
  private preloadedMessages: Set<string> = new Set();
  
  constructor(private voiceService: VoiceFeedbackService) {
    this.preloadCommonMessages();
  }
  
  private async preloadCommonMessages(): Promise<void> {
    const commonMessages = [
      'TASK_CREATED',
      'TASK_UPDATED',
      'TASK_DELETED',
      'OPERATION_FAILED',
      'BATCH_SUCCESS'
    ];
    
    // 在空闲时预加载
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.preloadMessages(commonMessages);
      });
    } else {
      setTimeout(() => {
        this.preloadMessages(commonMessages);
      }, 1000);
    }
  }
  
  private async preloadMessages(templates: string[]): Promise<void> {
    for (const template of templates) {
      if (!this.preloadedMessages.has(template)) {
        try {
          // 预生成语音但不播放
          await this.voiceService.prepareMessage({
            type: 'info',
            template,
            variables: { title: '示例任务' },
            priority: 'low'
          });
          
          this.preloadedMessages.add(template);
        } catch (error) {
          console.warn(\`Failed to preload message \${template}:\`, error);
        }
      }
    }
  }
}
\`\`\`

## 🧪 测试与验证

### 性能测试 (10分钟)
\`\`\`typescript
describe('Voice Performance Tests', () => {
  test('should handle high-frequency messages', async () => {
    const voiceService = await LazyVoiceService.getInstance();
    const startTime = performance.now();
    
    // 快速发送100个消息
    const promises = Array.from({ length: 100 }, (_, i) => 
      voiceService.speak({
        type: 'info',
        template: 'TASK_CREATED',
        variables: { title: \`Task \${i}\` },
        priority: 'low'
      })
    );
    
    await Promise.allSettled(promises);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(5000); // 5秒内完成
  });
  
  test('should maintain memory usage under limit', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    // 执行大量语音操作
    const voiceService = await LazyVoiceService.getInstance();
    for (let i = 0; i < 1000; i++) {
      await voiceService.speak({
        type: 'info',
        template: 'TASK_UPDATED',
        variables: { title: \`Task \${i}\` },
        priority: 'low'
      });
    }
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // 小于5MB
  });
});
\`\`\`

## ✅ 验收标准

### 性能验收
- [ ] 语音反馈响应时间 < 200ms
- [ ] 支持100+消息/分钟处理能力
- [ ] 内存使用增长 < 3MB
- [ ] 缓存命中率 > 60%

### 功能验收
- [ ] 音频冲突检测和处理正常
- [ ] 无障碍功能完整可用
- [ ] 键盘快捷键正常工作
- [ ] 环境音适应功能生效

### 兼容性验收
- [ ] 主流浏览器性能一致
- [ ] 移动端功能正常
- [ ] 屏幕阅读器兼容
- [ ] 高对比度模式支持

这个阶段将MCP语音反馈系统打造成一个高性能、高可用的企业级功能！🚀`,
      status: 'todo',
      custom_fields: {
        priority: 'medium',
        estimated_hours: 0.75,
        category: 'optimization',
        complexity: 'high',
        tags: ['性能优化', '无障碍', '缓存机制', '智能音频']
      }
    });

    console.log('✅ Phase 4创建成功:', phase4.id);

    // 总结
    console.log('\n🎉 MCP语音反馈功能所有子任务创建完成！');
    console.log('\n📋 任务结构:');
    console.log(`父任务 247: MCP语音反馈功能实现`);
    console.log(`├── 子任务 ${phase1.id}: Phase 1: 语音服务核心引擎开发 (1.5小时)`);
    console.log(`├── 子任务 ${phase2.id}: Phase 2: MCP集成与事件监听 (1.25小时)`);
    console.log(`├── 子任务 ${phase3.id}: Phase 3: 用户界面与设置管理 (1.0小时)`);
    console.log(`└── 子任务 ${phase4.id}: Phase 4: 高级功能与优化 (0.75小时)`);
    console.log('\n⏱️ 总预估工时: 4.5小时');
    console.log('\n🎯 开发路径: 核心引擎 → MCP集成 → 用户界面 → 高级优化');

  } catch (error) {
    console.error('❌ 创建子任务失败:', error.message);
  }
});