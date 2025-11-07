/**
 * 性能优化工具
 * 提供各种性能优化策略和工具
 */

import { debounce, throttle } from 'lodash';

interface OptimizationConfig {
  imageOptimization: boolean;
  lazyLoading: boolean;
  caching: boolean;
  bundleOptimization: boolean;
  memoryOptimization: boolean;
}

class PerformanceOptimizer {
  private config: OptimizationConfig;
  private imageCache = new Map<string, HTMLImageElement>();
  private componentCache = new Map<string, any>();
  private requestCache = new Map<string, any>();

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      imageOptimization: true,
      lazyLoading: true,
      caching: true,
      bundleOptimization: true,
      memoryOptimization: true,
      ...config
    };
  }

  /**
   * 图片优化和懒加载
   */
  optimizeImages(): void {
    if (!this.config.imageOptimization) return;

    // 实现图片懒加载
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            
            if (src) {
              // 预加载图片
              this.preloadImage(src).then(() => {
                img.src = src;
                img.classList.add('loaded');
              }).catch(error => {
                console.error('图片加载失败:', error);
                img.classList.add('error');
              });
              
              observer.unobserve(img);
            }
          }
        });
      });

      // 观察所有延迟加载的图片
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }

    // 图片格式优化建议
    this.suggestImageFormats();
  }

  /**
   * 预加载图片
   */
  private preloadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      // 检查缓存
      if (this.imageCache.has(src)) {
        resolve(this.imageCache.get(src)!);
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * 建议最佳图片格式
   */
  private suggestImageFormats(): void {
    const supportsWebP = this.supportsImageFormat('webp');
    const supportsAVIF = this.supportsImageFormat('avif');

    if (supportsAVIF) {
      console.log('💡 建议使用AVIF格式以获得最佳压缩率');
    } else if (supportsWebP) {
      console.log('💡 建议使用WebP格式以获得更好的压缩率');
    }
  }

  /**
   * 检测图片格式支持
   */
  private supportsImageFormat(format: string): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL(`image/${format}`).indexOf(`image/${format}`) === 5;
  }

  /**
   * 组件级别的缓存优化
   */
  cacheComponent<T>(key: string, factory: () => T, ttl: number = 300000): T {
    if (!this.config.caching) return factory();

    const cached = this.componentCache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < ttl) {
      return cached.data;
    }

    const data = factory();
    this.componentCache.set(key, { data, timestamp: now });
    return data;
  }

  /**
   * 请求缓存优化
   */
  async cacheRequest<T>(
    key: string, 
    requestFn: () => Promise<T>, 
    ttl: number = 300000
  ): Promise<T> {
    if (!this.config.caching) return await requestFn();

    const cached = this.requestCache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < ttl) {
      return cached.data;
    }

    const data = await requestFn();
    this.requestCache.set(key, { data, timestamp: now });
    return data;
  }

  /**
   * 防抖处理优化
   */
  createDebouncedFunction<T extends (...args: any[]) => any>(
    fn: T,
    delay: number = 300
  ): T {
    // ✅ FIXED - Use double assertion through unknown for type conversion (TS2352)
    return debounce(fn, delay) as unknown as T;
  }

  /**
   * 节流处理优化
   */
  createThrottledFunction<T extends (...args: any[]) => any>(
    fn: T,
    delay: number = 100
  ): T {
    // ✅ FIXED - Use double assertion through unknown for type conversion (TS2352)
    return throttle(fn, delay) as unknown as T;
  }

  /**
   * 虚拟滚动优化
   */
  createVirtualizedList(
    container: HTMLElement,
    items: any[],
    itemHeight: number,
    renderItem: (item: any, index: number) => HTMLElement
  ): {
    update: () => void;
    scrollTo: (index: number) => void;
    destroy: () => void;
  } {
    const visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2;
    let scrollTop = 0;
    let startIndex = 0;

    const viewport = document.createElement('div');
    viewport.style.height = `${items.length * itemHeight}px`;
    viewport.style.position = 'relative';

    const visibleItems = document.createElement('div');
    visibleItems.style.position = 'absolute';
    visibleItems.style.top = '0';
    visibleItems.style.width = '100%';

    viewport.appendChild(visibleItems);
    container.appendChild(viewport);

    const update = () => {
      startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleCount, items.length);

      visibleItems.style.transform = `translateY(${startIndex * itemHeight}px)`;
      visibleItems.innerHTML = '';

      for (let i = startIndex; i < endIndex; i++) {
        const itemElement = renderItem(items[i], i);
        itemElement.style.height = `${itemHeight}px`;
        visibleItems.appendChild(itemElement);
      }
    };

    const handleScroll = throttle(() => {
      scrollTop = container.scrollTop;
      update();
    }, 16);

    container.addEventListener('scroll', handleScroll);
    update();

    return {
      update,
      scrollTo: (index: number) => {
        container.scrollTop = index * itemHeight;
        update();
      },
      destroy: () => {
        container.removeEventListener('scroll', handleScroll);
        container.removeChild(viewport);
      }
    };
  }

  /**
   * 内存优化
   */
  optimizeMemory(): void {
    if (!this.config.memoryOptimization) return;

    // 清理过期缓存
    this.cleanupExpiredCache();

    // 监控内存使用
    this.monitorMemoryUsage();

    // 优化事件监听器
    this.optimizeEventListeners();
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1小时

    // 清理组件缓存
    for (const [key, value] of this.componentCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.componentCache.delete(key);
      }
    }

    // 清理请求缓存
    for (const [key, value] of this.requestCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.requestCache.delete(key);
      }
    }

    // 清理图片缓存（保留最近使用的50张）
    if (this.imageCache.size > 50) {
      const entries = Array.from(this.imageCache.entries());
      const toKeep = entries.slice(-50);
      this.imageCache.clear();
      toKeep.forEach(([key, value]) => {
        this.imageCache.set(key, value);
      });
    }
  }

  /**
   * 监控内存使用
   */
  private monitorMemoryUsage(): void {
    if (!('memory' in performance)) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

      if (usagePercent > 80) {
        console.warn('⚠️ 内存使用率过高:', `${usagePercent.toFixed(1)}%`);
        this.triggerMemoryCleanup();
      }
    };

    setInterval(checkMemory, 30000); // 每30秒检查一次
  }

  /**
   * 触发内存清理
   */
  private triggerMemoryCleanup(): void {
    // 清理所有缓存
    this.componentCache.clear();
    this.requestCache.clear();
    
    // 保留最近的20张图片
    if (this.imageCache.size > 20) {
      const entries = Array.from(this.imageCache.entries());
      const toKeep = entries.slice(-20);
      this.imageCache.clear();
      toKeep.forEach(([key, value]) => {
        this.imageCache.set(key, value);
      });
    }

    // 强制垃圾回收（如果可用）
    if (window.gc) {
      window.gc();
    }

    console.log('🧹 内存清理完成');
  }

  /**
   * 优化事件监听器
   */
  private optimizeEventListeners(): void {
    // 创建被动事件监听器
    const passiveEvents = ['touchstart', 'touchmove', 'wheel', 'scroll'];
    
    passiveEvents.forEach(eventType => {
      const elements = document.querySelectorAll(`[data-${eventType}-listener]`);
      elements.forEach(element => {
        const handler = (element as any)[`_${eventType}Handler`];
        if (handler) {
          element.removeEventListener(eventType, handler);
          element.addEventListener(eventType, handler, { passive: true });
        }
      });
    });
  }

  /**
   * 代码分割优化
   */
  async loadChunk(chunkName: string): Promise<any> {
    try {
      // 动态导入优化
      const startTime = performance.now();
      const module = await import(/* webpackChunkName: "[request]" */ chunkName);
      const loadTime = performance.now() - startTime;
      
      console.log(`📦 代码块 ${chunkName} 加载耗时: ${loadTime.toFixed(2)}ms`);
      
      return module;
    } catch (error) {
      console.error(`❌ 代码块 ${chunkName} 加载失败:`, error);
      throw error;
    }
  }

  /**
   * 预加载关键资源
   */
  preloadCriticalResources(resources: string[]): void {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = this.getResourceType(resource);
      link.href = resource;
      document.head.appendChild(link);
    });
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
        return 'script';
      case 'css':
        return 'style';
      case 'woff':
      case 'woff2':
        return 'font';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'avif':
        return 'image';
      default:
        return 'fetch';
    }
  }

  /**
   * 批量DOM操作优化
   */
  batchDOMOperations(operations: (() => void)[]): void {
    // 使用 requestAnimationFrame 批量处理DOM操作
    requestAnimationFrame(() => {
      const fragment = document.createDocumentFragment();
      
      operations.forEach(operation => {
        operation();
      });
    });
  }

  /**
   * 服务器端渲染优化提示
   */
  analyzeSsrOpportunities(): void {
    const criticalElements = [
      'header',
      'nav', 
      '[data-testid="main-content"]',
      'aside',
      'footer'
    ];

    let ssrCandidates = 0;
    
    criticalElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        ssrCandidates++;
      }
    });

    if (ssrCandidates >= 3) {
      console.log('💡 建议考虑服务器端渲染以改善首次内容绘制时间');
    }
  }

  /**
   * 获取性能优化报告
   */
  getOptimizationReport(): {
    cacheStats: {
      componentCacheSize: number;
      requestCacheSize: number;
      imageCacheSize: number;
    };
    memoryStats: any;
    recommendations: string[];
  } {
    const recommendations = [];

    // 检查图片格式支持
    if (!this.supportsImageFormat('webp')) {
      recommendations.push('考虑添加WebP格式支持以减少图片大小');
    }

    // 检查内存使用
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      if (usagePercent > 70) {
        recommendations.push('内存使用率较高，建议优化内存使用');
      }
    }

    // 检查缓存大小
    if (this.componentCache.size > 100) {
      recommendations.push('组件缓存较大，考虑实施更积极的清理策略');
    }

    return {
      cacheStats: {
        componentCacheSize: this.componentCache.size,
        requestCacheSize: this.requestCache.size,
        imageCacheSize: this.imageCache.size
      },
      memoryStats: 'memory' in performance ? (performance as any).memory : null,
      recommendations
    };
  }

  /**
   * 清理所有缓存
   */
  clearAllCaches(): void {
    this.componentCache.clear();
    this.requestCache.clear();
    this.imageCache.clear();
    console.log('🧹 所有缓存已清理');
  }
}

// 创建全局性能优化器实例
const performanceOptimizer = new PerformanceOptimizer();

export default performanceOptimizer;