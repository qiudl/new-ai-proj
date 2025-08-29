import axios from 'axios';

/**
 * MCP权限管理器
 * 负责MCP命令的权限验证和管理
 */

// 权限检查请求接口
interface PermissionCheckRequest {
  permission_code: string;
  resource_id?: number;
  resource_type?: string;
}

// 权限检查响应接口
interface PermissionCheckResponse {
  has_permission: boolean;
  reason?: string;
  source?: string;
  user_permissions?: string[];
}

// 批量权限检查请求
interface BatchPermissionRequest {
  permissions: PermissionCheckRequest[];
}

// 批量权限检查响应
interface BatchPermissionResponse {
  results: Record<string, PermissionCheckResponse>;
}

// MCP权限配置
interface MCPPermissionConfig {
  enablePermissionCheck: boolean;
  cachePermissions: boolean;
  cacheTTL: number; // 缓存时间（秒）
  strictMode: boolean;
  debugMode: boolean;
}

// 权限缓存条目
interface PermissionCacheEntry {
  result: PermissionCheckResponse;
  timestamp: number;
  ttl: number;
}

/**
 * MCP权限管理器类
 * 提供MCP命令的权限验证功能
 */
export class MCPPermissionManager {
  private apiBase: string;
  private authToken?: string;
  private config: MCPPermissionConfig;
  private permissionCache: Map<string, PermissionCacheEntry>;
  private companyUserId?: number;

  constructor(apiBase: string, authToken?: string, config?: Partial<MCPPermissionConfig>) {
    this.apiBase = apiBase;
    this.authToken = authToken;
    this.permissionCache = new Map();
    
    // 默认配置
    this.config = {
      enablePermissionCheck: true,
      cachePermissions: true,
      cacheTTL: 300, // 5分钟
      strictMode: false,
      debugMode: false,
      ...config
    };

    if (this.config.debugMode) {
      console.error('[MCP_PERM] Permission manager initialized with config:', this.config);
    }
  }

  /**
   * 设置认证令牌和用户ID
   */
  setAuth(authToken: string, companyUserId?: number): void {
    this.authToken = authToken;
    this.companyUserId = companyUserId;
    
    if (this.config.debugMode) {
      console.error('[MCP_PERM] Auth updated - Token:', authToken ? 'present' : 'none', 'User ID:', companyUserId);
    }
  }

  /**
   * 检查单个权限
   */
  async checkPermission(
    permissionCode: string, 
    resourceId?: number,
    resourceType?: string
  ): Promise<PermissionCheckResponse> {
    
    // 如果权限检查被禁用，始终允许
    if (!this.config.enablePermissionCheck) {
      return {
        has_permission: true,
        reason: 'Permission check disabled',
        source: 'config'
      };
    }

    // 检查缓存
    if (this.config.cachePermissions) {
      const cached = this.getCachedPermission(permissionCode, resourceId);
      if (cached) {
        if (this.config.debugMode) {
          console.error('[MCP_PERM] Cache hit for permission:', permissionCode);
        }
        return cached.result;
      }
    }

    try {
      const request: PermissionCheckRequest = {
        permission_code: permissionCode,
        resource_id: resourceId,
        resource_type: resourceType
      };

      const response = await axios.post(`${this.apiBase}/auth/check-permission`, request, {
        headers: this.getHeaders(),
        timeout: 5000,
        proxy: false
      });

      const result: PermissionCheckResponse = response.data.data || response.data;

      // 缓存结果
      if (this.config.cachePermissions) {
        this.cachePermissionResult(permissionCode, resourceId, result);
      }

      if (this.config.debugMode) {
        console.error('[MCP_PERM] Permission check result:', permissionCode, result.has_permission);
      }

      return result;
    } catch (error: any) {
      console.error('[MCP_PERM] Permission check failed:', error.message);
      
      // 在严格模式下，权限检查失败则拒绝访问
      if (this.config.strictMode) {
        return {
          has_permission: false,
          reason: `Permission check failed: ${error.message}`,
          source: 'error'
        };
      }
      
      // 非严格模式下，权限检查失败则允许访问（向后兼容）
      return {
        has_permission: true,
        reason: 'Permission check failed, allowing access in non-strict mode',
        source: 'fallback'
      };
    }
  }

  /**
   * 批量检查权限
   */
  async checkBatchPermissions(
    requests: PermissionCheckRequest[]
  ): Promise<Record<string, PermissionCheckResponse>> {
    
    if (!this.config.enablePermissionCheck) {
      const results: Record<string, PermissionCheckResponse> = {};
      requests.forEach(req => {
        results[req.permission_code] = {
          has_permission: true,
          reason: 'Permission check disabled',
          source: 'config'
        };
      });
      return results;
    }

    try {
      const batchRequest: BatchPermissionRequest = {
        permissions: requests
      };

      const response = await axios.post(`${this.apiBase}/auth/check-batch-permissions`, batchRequest, {
        headers: this.getHeaders(),
        timeout: 10000,
        proxy: false
      });

      const batchResponse: BatchPermissionResponse = response.data.data || response.data;
      
      // 缓存批量结果
      if (this.config.cachePermissions) {
        requests.forEach(req => {
          const result = batchResponse.results[req.permission_code];
          if (result) {
            this.cachePermissionResult(req.permission_code, req.resource_id, result);
          }
        });
      }

      return batchResponse.results;
    } catch (error: any) {
      console.error('[MCP_PERM] Batch permission check failed:', error.message);
      
      // 回退到单个检查
      const results: Record<string, PermissionCheckResponse> = {};
      for (const request of requests) {
        results[request.permission_code] = await this.checkPermission(
          request.permission_code,
          request.resource_id,
          request.resource_type
        );
      }
      
      return results;
    }
  }

  /**
   * 清除权限缓存
   */
  clearCache(permissionCode?: string): void {
    if (permissionCode) {
      // 清除特定权限的所有缓存
      const keysToDelete: string[] = [];
      for (const key of this.permissionCache.keys()) {
        if (key.startsWith(`${permissionCode}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.permissionCache.delete(key));
    } else {
      // 清除所有缓存
      this.permissionCache.clear();
    }

    if (this.config.debugMode) {
      console.error('[MCP_PERM] Cache cleared for:', permissionCode || 'all');
    }
  }

  /**
   * 获取权限管理器状态
   */
  getStatus(): {
    enabled: boolean;
    cacheSize: number;
    config: MCPPermissionConfig;
    hasAuth: boolean;
  } {
    return {
      enabled: this.config.enablePermissionCheck,
      cacheSize: this.permissionCache.size,
      config: this.config,
      hasAuth: !!this.authToken
    };
  }

  /**
   * 获取HTTP请求头
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  /**
   * 获取缓存的权限结果
   */
  private getCachedPermission(
    permissionCode: string, 
    resourceId?: number
  ): PermissionCacheEntry | null {
    const cacheKey = this.generateCacheKey(permissionCode, resourceId);
    const cached = this.permissionCache.get(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl * 1000) {
      // 缓存已过期
      this.permissionCache.delete(cacheKey);
      return null;
    }
    
    return cached;
  }

  /**
   * 缓存权限检查结果
   */
  private cachePermissionResult(
    permissionCode: string,
    resourceId: number | undefined,
    result: PermissionCheckResponse
  ): void {
    const cacheKey = this.generateCacheKey(permissionCode, resourceId);
    const entry: PermissionCacheEntry = {
      result,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL
    };
    
    this.permissionCache.set(cacheKey, entry);
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(permissionCode: string, resourceId?: number): string {
    return `${permissionCode}:${resourceId || 'null'}`;
  }
}

/**
 * MCP命令权限映射
 * 定义每个MCP命令需要的权限
 */
export const MCP_COMMAND_PERMISSIONS: Record<string, {
  permission: string;
  resourceType?: string;
  requiresResourceId?: boolean;
  description: string;
}> = {
  // 任务管理
  'create_task': {
    permission: 'task.create',
    description: '创建任务'
  },
  'start_task': {
    permission: 'task.update',
    resourceType: 'task',
    requiresResourceId: true,
    description: '开始任务'
  },
  'complete_task': {
    permission: 'task.update',
    resourceType: 'task',
    requiresResourceId: true,
    description: '完成任务'
  },
  'update_task': {
    permission: 'task.update',
    resourceType: 'task',
    requiresResourceId: true,
    description: '更新任务'
  },
  'delete_task': {
    permission: 'task.delete',
    resourceType: 'task',
    requiresResourceId: true,
    description: '删除任务'
  },
  'list_tasks': {
    permission: 'task.list.read',
    description: '查看任务列表'
  },
  'find_task': {
    permission: 'task.list.read',
    description: '搜索任务'
  },
  'get_detailed_task_info': {
    permission: 'task.read',
    resourceType: 'task',
    requiresResourceId: true,
    description: '获取任务详情'
  },
  'move_task': {
    permission: 'task.update',
    resourceType: 'task',
    requiresResourceId: true,
    description: '移动任务'
  },

  // 子任务管理
  'create_subtask': {
    permission: 'task.create',
    description: '创建子任务'
  },
  'create_sibling_task': {
    permission: 'task.create',
    description: '创建兄弟任务'
  },
  'get_task_children': {
    permission: 'task.read',
    resourceType: 'task',
    requiresResourceId: true,
    description: '获取子任务'
  },

  // 项目管理
  'create_project': {
    permission: 'project.create',
    description: '创建项目'
  },
  'list_projects': {
    permission: 'project.list.read',
    description: '查看项目列表'
  },

  // 文档管理
  'create-and-attach': {
    permission: 'document.create',
    description: '创建并关联任务文档'
  },
  'get_task_document': {
    permission: 'document.read',
    resourceType: 'task',
    requiresResourceId: true,
    description: '获取任务文档'
  },
  'has_task_document': {
    permission: 'document.read',
    resourceType: 'task',
    requiresResourceId: true,
    description: '检查任务文档'
  },
  'delete_task_document': {
    permission: 'document.delete',
    resourceType: 'task',
    requiresResourceId: true,
    description: '删除任务文档'
  },

  // 工作笔记管理
  'create-and-attach-work-note': {
    permission: 'work_note.create',
    description: '创建并关联工作笔记到任务'
  },
  'create_batch_documents': {
    permission: 'document.create',
    description: '批量创建文档'
  },

  // 工作笔记
  'create_work_note': {
    permission: 'worknote.create',
    description: '创建工作笔记'
  },
  'list_work_notes': {
    permission: 'worknote.list.read',
    description: '查看工作笔记列表'
  },
  'search_work_notes': {
    permission: 'worknote.list.read',
    description: '搜索工作笔记'
  },
  'get_work_note': {
    permission: 'worknote.read',
    resourceType: 'worknote',
    requiresResourceId: true,
    description: '获取工作笔记'
  },
  'update_work_note': {
    permission: 'worknote.update',
    resourceType: 'worknote',
    requiresResourceId: true,
    description: '更新工作笔记'
  },

  // 时间管理
  'start_timer': {
    permission: 'timer.create',
    description: '开始计时'
  },
  'stop_timer': {
    permission: 'timer.update',
    description: '停止计时'
  },
  'get_current_timer': {
    permission: 'timer.read',
    description: '获取当前计时'
  },

  // 高级功能
  'start_task_with_timer': {
    permission: 'task.update',
    resourceType: 'task',
    description: '启动任务并开始计时'
  },
  'switch_to_task': {
    permission: 'task.update',
    description: '切换任务'
  },
  'get_daily_work_report': {
    permission: 'report.read',
    description: '获取日报'
  },

  // 开发环境功能
  'dev_quick_login': {
    permission: 'auth.dev_login',
    description: '开发环境快速登录'
  }
};

/**
 * 权限装饰器工厂
 * 用于为方法添加权限检查
 */
export function requiresPermission(commandName: string) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(this: any, ...args: any[]) {
      // 获取权限管理器实例
      const permissionManager: MCPPermissionManager | undefined = this.permissionManager;
      
      if (!permissionManager) {
        console.error('[MCP_PERM] Permission manager not found, executing without permission check');
        return originalMethod.apply(this, args);
      }

      // 获取命令权限配置
      const permissionConfig = MCP_COMMAND_PERMISSIONS[commandName];
      if (!permissionConfig) {
        console.error('[MCP_PERM] No permission configuration for command:', commandName);
        return originalMethod.apply(this, args);
      }

      // 提取资源ID（如果需要）
      let resourceId: number | undefined;
      if (permissionConfig.requiresResourceId && args.length > 0) {
        // 尝试从第一个参数获取资源ID
        const firstArg = args[0];
        if (typeof firstArg === 'number') {
          resourceId = firstArg;
        } else if (typeof firstArg === 'object' && firstArg && 'id' in firstArg) {
          resourceId = firstArg.id;
        }
      }

      // 检查权限
      try {
        const permissionResult = await permissionManager.checkPermission(
          permissionConfig.permission,
          resourceId,
          permissionConfig.resourceType
        );

        if (!permissionResult.has_permission) {
          return {
            success: false,
            error: `权限不足: ${permissionResult.reason || '缺少必要权限'}`,
            permission_required: permissionConfig.permission,
            permission_description: permissionConfig.description,
            resource_type: permissionConfig.resourceType,
            resource_id: resourceId
          };
        }

        // 权限检查通过，执行原方法
        return originalMethod.apply(this, args);
      } catch (error: any) {
        console.error('[MCP_PERM] Permission check error for command', commandName, ':', error.message);
        
        // 权限检查失败，返回错误
        return {
          success: false,
          error: `权限验证失败: ${error.message}`,
          permission_required: permissionConfig.permission,
          command: commandName
        };
      }
    };

    return descriptor;
  };
}
