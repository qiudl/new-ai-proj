/**
 * 缓存感知组件框架
 * 提供可复用的缓存感知组件基础和HOC
 */

import React, { createContext, useContext, ReactNode, ComponentType } from 'react';
import { enhancedCacheManager } from '../../utils/enhancedCacheManager';
import { cacheEventSystem, CacheEvent } from '../../utils/cacheEventSystem';
import { useCacheState } from '../../hooks/useCacheState';
import { CacheDependency } from '../../utils/cacheDependencyManager';

// 缓存上下文接口
export interface CacheContextValue {
  /** 增强缓存管理器 */
  cacheManager: typeof enhancedCacheManager;
  /** 事件系统 */
  eventSystem: typeof cacheEventSystem;
  /** 缓存统计 */
  stats: ReturnType<typeof enhancedCacheManager.getStats>;
  /** 操作方法 */
  actions: {
    invalidate: (key: string) => Promise<void>;
    refresh: (key: string) => Promise<void>;
    prefetch: (key: string) => Promise<void>;
    invalidateByTag: (tags: string[]) => Promise<string[]>;
    cleanup: () => Promise<void>;
  };
}

// 创建缓存上下文
export const CacheContext = createContext<CacheContextValue | null>(null);

// 缓存提供者组件
export interface CacheProviderProps {
  children: ReactNode;
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 自定义事件处理器 */
  onCacheEvent?: (event: CacheEvent) => void;
}

export function CacheProvider({ 
  children, 
  debug = false,
  onCacheEvent 
}: CacheProviderProps): JSX.Element {
  const { stats, actions } = useCacheState();

  // 统一的缓存操作方法
  const contextValue: CacheContextValue = {
    cacheManager: enhancedCacheManager,
    eventSystem: cacheEventSystem,
    stats,
    actions: {
      invalidate: async (key: string) => {
        await enhancedCacheManager.delete(key);
      },
      refresh: async (key: string) => {
        await enhancedCacheManager.delete(key);
        // 触发重新获取逻辑由使用方决定
      },
      prefetch: async (key: string) => {
        // 预加载逻辑
        const exists = await enhancedCacheManager.has(key);
        if (!exists && debug) {
          console.log(`Prefetch requested for: ${key}`);
        }
      },
      invalidateByTag: async (tags: string[]) => {
        return await enhancedCacheManager.invalidateByTags(tags);
      },
      cleanup: async () => {
        await enhancedCacheManager.cleanup();
      }
    }
  };

  // 设置全局事件监听
  React.useEffect(() => {
    if (onCacheEvent) {
      const unsubscribe = cacheEventSystem.onAll(onCacheEvent);
      return unsubscribe;
    }
  }, [onCacheEvent]);

  return (
    <CacheContext.Provider value={contextValue}>
      {children}
    </CacheContext.Provider>
  );
}

// 使用缓存上下文的Hook
export function useCacheContext(): CacheContextValue {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCacheContext must be used within a CacheProvider');
  }
  return context;
}

// 缓存感知组件配置
export interface CacheAwareOptions {
  /** 实体类型 */
  entityType: 'task' | 'project' | 'user';
  /** 缓存键构建函数 */
  keyBuilder?: (props: any) => string;
  /** 依赖关系构建函数 */
  dependencies?: (props: any) => CacheDependency[];
  /** 自动刷新配置 */
  autoRefresh?: {
    interval?: number;
    trigger?: ('focus' | 'mount' | 'props_change')[];
  };
  /** 是否启用性能监控 */
  enableMetrics?: boolean;
  /** 缓存标签 */
  tags?: (props: any) => string[];
}

// 缓存感知属性接口
export interface CacheAwareProps {
  /** 缓存配置覆盖 */
  cacheConfig?: Partial<CacheAwareOptions>;
  /** 缓存事件处理器 */
  onCacheEvent?: (event: CacheEvent) => void;
  /** 是否禁用缓存 */
  disableCache?: boolean;
}

/**
 * 高阶组件：为组件添加缓存感知能力
 */
export function withCacheAware<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: CacheAwareOptions
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  function CacheAwareComponent(props: P & CacheAwareProps) {
    const {
      cacheConfig = {},
      onCacheEvent,
      disableCache = false,
      ...wrappedProps
    } = props;
    
    const mergedOptions = { ...options, ...cacheConfig };
    const cacheContext = useCacheContext();
    
    // 构建缓存键
    const cacheKey = React.useMemo(() => {
      if (disableCache || !mergedOptions.keyBuilder) return null;
      return mergedOptions.keyBuilder(props);
    }, [props, mergedOptions.keyBuilder, disableCache]);
    
    // 注册依赖关系
    React.useEffect(() => {
      if (disableCache || !mergedOptions.dependencies) return;
      
      const dependencies = mergedOptions.dependencies(props);
      dependencies.forEach(dep => {
        cacheContext.cacheManager.registerDependency(dep);
      });
    }, [props, mergedOptions.dependencies, disableCache, cacheContext.cacheManager]);
    
    // 自动刷新处理
    React.useEffect(() => {
      if (disableCache || !mergedOptions.autoRefresh) return;
      
      const { interval, trigger = ['mount'] } = mergedOptions.autoRefresh;
      
      if (trigger.includes('mount') && cacheKey) {
        // 组件挂载时的刷新逻辑
        console.log(`Auto refresh on mount for: ${cacheKey}`);
      }
      
      if (interval && interval > 0 && cacheKey) {
        const timer = setInterval(() => {
          cacheContext.actions.refresh(cacheKey);
        }, interval);
        
        return () => clearInterval(timer);
      }
    }, [cacheKey, mergedOptions.autoRefresh, disableCache, cacheContext.actions]);
    
    // 事件监听
    React.useEffect(() => {
      if (disableCache || !onCacheEvent) return;
      
      const unsubscribe = cacheContext.eventSystem.onAll(onCacheEvent);
      return unsubscribe;
    }, [onCacheEvent, disableCache, cacheContext.eventSystem]);
    
    // 性能监控
    React.useEffect(() => {
      if (disableCache || !mergedOptions.enableMetrics || !cacheKey) return;
      
      const startTime = Date.now();
      
      return () => {
        const duration = Date.now() - startTime;
        cacheContext.eventSystem.emit({
          type: 'cleanup',
          key: cacheKey,
          timestamp: Date.now(),
          duration,
          source: `CacheAware(${displayName})`
        });
      };
    }, [cacheKey, mergedOptions.enableMetrics, disableCache, cacheContext.eventSystem]);
    
    // 扩展组件props
    const enhancedProps = {
      ...wrappedProps,
      cacheKey,
      cacheContext,
      cacheActions: cacheContext.actions
    } as P;
    
    return <WrappedComponent {...enhancedProps} />;
  }
  
  CacheAwareComponent.displayName = `CacheAware(${displayName})`;
  
  return CacheAwareComponent;
}

/**
 * 缓存感知Hook
 * 为函数组件提供缓存管理能力
 */
export function useCacheAware<T>(
  key: string,
  options?: {
    entityType?: 'task' | 'project' | 'user';
    tags?: string[];
    autoInvalidate?: string[];
    onCacheEvent?: (event: CacheEvent) => void;
  }
) {
  const cacheContext = useCacheContext();
  const [lastRefresh, setLastRefresh] = React.useState(Date.now());
  
  // 智能失效
  const smartInvalidate = React.useCallback(async (changeType: 'create' | 'update' | 'delete' = 'update') => {
    if (options?.entityType === 'task') {
      // 从key中提取项目ID和任务ID (假设格式为 task:projectId:taskId)
      const parts = key.split(':');
      if (parts.length >= 3) {
        const projectId = parseInt(parts[1]);
        const taskId = parseInt(parts[2]);
        await cacheContext.cacheManager.invalidateTask(projectId, taskId, changeType);
      }
    } else {
      await cacheContext.actions.invalidate(key);
    }
    setLastRefresh(Date.now());
  }, [key, options?.entityType, cacheContext]);
  
  // 按标签失效
  const invalidateByTags = React.useCallback(async (tags: string[]) => {
    const invalidatedKeys = await cacheContext.actions.invalidateByTag(tags);
    setLastRefresh(Date.now());
    return invalidatedKeys;
  }, [cacheContext.actions]);
  
  // 事件监听
  React.useEffect(() => {
    if (options?.onCacheEvent) {
      const unsubscribe = cacheContext.eventSystem.onAll(options.onCacheEvent);
      return unsubscribe;
    }
  }, [options?.onCacheEvent, cacheContext.eventSystem]);
  
  return {
    cacheKey: key,
    lastRefresh,
    smartInvalidate,
    invalidateByTags,
    cacheStats: cacheContext.stats,
    cacheActions: cacheContext.actions,
    eventSystem: cacheContext.eventSystem
  };
}

/**
 * 缓存性能监控Hook
 */
export function useCachePerformance(componentName: string) {
  const cacheContext = useCacheContext();
  const [metrics, setMetrics] = React.useState({
    renderCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgResponseTime: 0
  });
  
  // 渲染计数
  React.useEffect(() => {
    setMetrics(prev => ({ ...prev, renderCount: prev.renderCount + 1 }));
  });
  
  // 监听缓存事件
  React.useEffect(() => {
    const unsubscribe = cacheContext.eventSystem.onAll((event) => {
      if (event.source === componentName) {
        setMetrics(prev => {
          const newMetrics = { ...prev };
          if (event.type === 'hit') {
            newMetrics.cacheHits++;
          } else if (event.type === 'miss') {
            newMetrics.cacheMisses++;
          }
          
          if (event.duration) {
            const totalRequests = newMetrics.cacheHits + newMetrics.cacheMisses;
            newMetrics.avgResponseTime = (
              (newMetrics.avgResponseTime * (totalRequests - 1) + event.duration) / totalRequests
            );
          }
          
          return newMetrics;
        });
      }
    });
    
    return unsubscribe;
  }, [componentName, cacheContext.eventSystem]);
  
  return metrics;
}

export default CacheProvider;