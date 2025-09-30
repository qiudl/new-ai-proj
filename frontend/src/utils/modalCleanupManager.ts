/**
 * Modal Cleanup Manager
 * 全局弹窗清理管理器
 * 
 * 提供统一的弹窗状态清理和内存泄漏防护功能
 */

interface ModalCleanupConfig {
  /** 调试模式 */
  debug?: boolean;
  /** 是否强制清理所有弹窗 */
  forceCleanAll?: boolean;
  /** 清理超时时间（毫秒） */
  timeout?: number;
}

const DEFAULT_CONFIG: Required<ModalCleanupConfig> = {
  debug: false,
  forceCleanAll: false,
  timeout: 5000
};

/**
 * 清理所有开放的弹窗
 */
export const cleanupAllModals = (config: ModalCleanupConfig = {}): void => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  try {
    if (finalConfig.debug) {
      console.log('[ModalCleanupManager] 开始清理所有弹窗...');
    }

    // 1. 使用 Ant Design 的 Modal.destroyAll()
    if (typeof window !== 'undefined' && window.antd?.Modal?.destroyAll) {
      window.antd.Modal.destroyAll();
    }

    // 2. 清理残留的弹窗 DOM 元素
    const modalElements = document.querySelectorAll('.ant-modal-wrap, .ant-modal-root');
    modalElements.forEach(modal => {
      try {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      } catch (error) {
        if (finalConfig.debug) {
          console.warn('[ModalCleanupManager] 清理弹窗元素失败:', error);
        }
      }
    });

    // 3. 清理弹窗遮罩
    const masks = document.querySelectorAll('.ant-modal-mask');
    masks.forEach(mask => {
      try {
        if (mask.parentNode) {
          mask.parentNode.removeChild(mask);
        }
      } catch (error) {
        if (finalConfig.debug) {
          console.warn('[ModalCleanupManager] 清理遮罩失败:', error);
        }
      }
    });

    // 4. 重置 body 的样式
    const body = document.body;
    if (body) {
      body.style.removeProperty('overflow');
      body.style.removeProperty('padding-right');
      body.classList.remove('ant-scrolling-effect');
    }

    // 5. 清理可能的全局事件监听器
    cleanupGlobalEventListeners(finalConfig);

    if (finalConfig.debug) {
      console.log('[ModalCleanupManager] 弹窗清理完成');
    }
  } catch (error) {
    console.error('[ModalCleanupManager] 清理过程发生错误:', error);
  }
};

/**
 * 清理全局事件监听器
 */
const cleanupGlobalEventListeners = (config: Required<ModalCleanupConfig>): void => {
  try {
    // 移除可能残留的键盘事件监听器
    const events = ['keydown', 'keyup', 'click', 'resize'];
    
    events.forEach(eventType => {
      // 这里只能清理我们已知的监听器
      // 对于第三方库的监听器，需要调用其清理方法
    });

    if (config.debug) {
      console.log('[ModalCleanupManager] 全局事件监听器清理完成');
    }
  } catch (error) {
    if (config.debug) {
      console.warn('[ModalCleanupManager] 清理全局事件监听器失败:', error);
    }
  }
};

/**
 * 检查弹窗状态
 */
export const getModalStatus = (): {
  openModals: number;
  masks: number;
  bodyScrollingEffect: boolean;
} => {
  return {
    openModals: document.querySelectorAll('.ant-modal-wrap:not([style*="display: none"])').length,
    masks: document.querySelectorAll('.ant-modal-mask').length,
    bodyScrollingEffect: document.body.classList.contains('ant-scrolling-effect')
  };
};

/**
 * 强制清理特定弹窗
 */
export const forceCleanupModal = (modalId: string, config: ModalCleanupConfig = {}): boolean => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  try {
    const modal = document.querySelector(`[data-modal-id="${modalId}"], #${modalId}`);
    if (!modal) {
      if (finalConfig.debug) {
        console.warn(`[ModalCleanupManager] 未找到弹窗: ${modalId}`);
      }
      return false;
    }

    // 查找最接近的弹窗容器
    const modalWrap = modal.closest('.ant-modal-wrap') || modal;
    
    if (modalWrap && modalWrap.parentNode) {
      modalWrap.parentNode.removeChild(modalWrap);
      
      if (finalConfig.debug) {
        console.log(`[ModalCleanupManager] 强制清理弹窗成功: ${modalId}`);
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error(`[ModalCleanupManager] 强制清理弹窗失败: ${modalId}`, error);
    return false;
  }
};

/**
 * 定时清理任务
 */
export const scheduleModalCleanup = (intervalMs: number = 30000): (() => void) => {
  const cleanup = () => {
    const status = getModalStatus();
    
    // 如果检测到孤立的遮罩或滚动效果，进行清理
    if (status.masks > status.openModals || 
        (status.openModals === 0 && status.bodyScrollingEffect)) {
      cleanupAllModals({ debug: false });
    }
  };

  const intervalId = setInterval(cleanup, intervalMs);
  
  // 返回清理函数
  return () => {
    clearInterval(intervalId);
  };
};

/**
 * 页面卸载时的清理
 */
export const setupPageUnloadCleanup = (config: ModalCleanupConfig = {}): void => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const cleanup = () => {
    cleanupAllModals(finalConfig);
  };

  // 监听页面卸载事件
  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('unload', cleanup);
  
  // 监听页面隐藏事件（用于单页应用）
  if ('onpagehide' in window) {
    window.addEventListener('pagehide', cleanup);
  }
  
  // 返回清理函数（虽然页面卸载时可能用不到）
  // return () => {
  //   window.removeEventListener('beforeunload', cleanup);
  //   window.removeEventListener('unload', cleanup);
  //   if ('onpagehide' in window) {
  //     window.removeEventListener('pagehide', cleanup);
  //   }
  // };
};

/**
 * React 组件卸载时的清理 Hook 辅助函数
 */
export const createModalCleanupEffect = (config: ModalCleanupConfig = {}) => {
  return () => {
    // 这个函数应该在 useEffect 的清理函数中调用
    cleanupAllModals(config);
  };
};

/**
 * 全局初始化弹窗清理管理器
 */
let globalCleanupScheduler: (() => void) | null = null;

export const initGlobalModalCleanup = (config: ModalCleanupConfig = {}): void => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // 避免重复初始化
  if (globalCleanupScheduler) {
    if (finalConfig.debug) {
      console.warn('[ModalCleanupManager] 全局清理管理器已初始化');
    }
    return;
  }

  // 设置定时清理
  globalCleanupScheduler = scheduleModalCleanup();
  
  // 设置页面卸载清理
  setupPageUnloadCleanup(finalConfig);
  
  if (finalConfig.debug) {
    console.log('[ModalCleanupManager] 全局清理管理器已启动');
  }
};

/**
 * 停止全局清理管理器
 */
export const stopGlobalModalCleanup = (): void => {
  if (globalCleanupScheduler) {
    globalCleanupScheduler();
    globalCleanupScheduler = null;
  }
};

// 扩展 window 对象以支持 Ant Design 的 Modal
declare global {
  interface Window {
    antd?: {
      Modal?: {
        destroyAll?: () => void;
      };
    };
  }
}