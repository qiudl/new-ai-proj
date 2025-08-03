// Chunk loading error handler
// 防止 Webpack chunk 加载失败导致的白屏问题

export {}; // 使文件成为模块

declare global {
  interface Window {
    caches: CacheStorage;
    location: Location;
  }
}

// 处理 chunk 加载错误
window.addEventListener('error', (event: ErrorEvent) => {
  const { message, filename } = event;
  
  // 检测是否为 chunk 加载失败
  if (message && message.includes('Loading chunk') && message.includes('failed')) {
    console.warn('🚨 Chunk loading failed:', {
      message,
      filename,
      timestamp: new Date().toISOString()
    });

    // 尝试自动刷新页面恢复
    const shouldReload = window.confirm(
      '页面加载出现问题，是否刷新页面？\n\n' +
      '这通常是由于代码更新导致的，刷新后即可正常使用。'
    );

    if (shouldReload) {
      // 清除可能的缓存问题
      if (typeof window !== 'undefined' && 'caches' in window) {
        window.caches.keys().then((names: string[]) => {
          names.forEach((name: string) => window.caches.delete(name));
        }).finally(() => {
          (window as Window).location.reload();
        });
      } else {
        (window as Window).location.reload();
      }
    }
    
    return true; // 阻止默认错误处理
  }
  
  // 处理其他类型的加载错误
  if (filename && filename.includes('.chunk.js')) {
    console.warn('⚠️ Static resource loading issue:', {
      filename,
      message,
      timestamp: new Date().toISOString()
    });
  }
});

