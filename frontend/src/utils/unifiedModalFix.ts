/**
 * Unified Modal Fix Utility
 * 统一的Modal遮罩层修复工具
 * 
 * 此文件提供统一的Modal管理和修复功能，替代之前分散的修复方案
 */

// Modal状态追踪
const openModals: Set<string> = new Set();
let observer: MutationObserver | null = null;

/**
 * 检查Modal是否应该显示
 */
export const shouldShowModal = (modalElement: Element): boolean => {
  // 检查普通Modal的打开状态
  if (modalElement.classList.contains('ant-modal-wrap-open')) {
    return true;
  }
  
  // 检查确认对话框（Modal.confirm）
  if (modalElement.classList.contains('ant-modal-confirm-wrap')) {
    return true;
  }
  
  // 检查是否包含确认对话框的内容
  const confirmModal = modalElement.querySelector('.ant-modal-confirm');
  if (confirmModal) {
    return true;
  }
  
  return false;
};

/**
 * 修复单个Modal的显示状态
 */
export const fixModalVisibility = (modalWrap: Element): void => {
  const htmlElement = modalWrap as HTMLElement;
  
  if (shouldShowModal(modalWrap)) {
    // Modal应该显示
    htmlElement.style.opacity = '1';
    htmlElement.style.visibility = 'visible';
    htmlElement.style.pointerEvents = 'auto';
    
    // 确保遮罩也显示
    const mask = modalWrap.querySelector('.ant-modal-mask') as HTMLElement;
    if (mask) {
      mask.style.opacity = '1';
      mask.style.visibility = 'visible';
    }
    
    // 防止页面滚动
    document.body.classList.add('modal-open');
    
  } else {
    // Modal应该隐藏
    htmlElement.style.opacity = '0';
    htmlElement.style.visibility = 'hidden';
    htmlElement.style.pointerEvents = 'none';
    
    // 如果这是最后一个Modal，恢复页面滚动
    const allOpenModals = document.querySelectorAll('.ant-modal-wrap-open');
    if (allOpenModals.length === 0) {
      document.body.classList.remove('modal-open');
    }
  }
};

/**
 * 修复所有Modal的显示状态
 */
export const fixAllModalVisibility = (): void => {
  const allModalWraps = document.querySelectorAll('.ant-modal-wrap');
  
  allModalWraps.forEach((modalWrap) => {
    fixModalVisibility(modalWrap);
  });
};

/**
 * 清理孤立的Modal元素
 */
export const cleanupOrphanedModals = (): void => {
  const modalWraps = document.querySelectorAll('.ant-modal-wrap');
  
  modalWraps.forEach((wrap) => {
    const modalElement = wrap.querySelector('.ant-modal');
    const isOpen = wrap.classList.contains('ant-modal-wrap-open');
    
    // 如果Modal wrap存在但没有内容，且不在打开状态，则移除
    if (!modalElement && !isOpen) {
      console.log('移除孤立的Modal wrap:', wrap);
      wrap.remove();
    }
  });
};

/**
 * 处理Modal状态变化
 */
const handleModalMutation = (mutations: MutationRecord[]): void => {
  let shouldFix = false;
  
  mutations.forEach((mutation) => {
    // 检查新增的Modal元素
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          if (node.classList.contains('ant-modal-wrap') || 
              node.querySelector('.ant-modal-wrap')) {
            shouldFix = true;
          }
        }
      });
    }
    
    // 检查类名变化
    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
      const target = mutation.target as Element;
      if (target.classList.contains('ant-modal-wrap')) {
        shouldFix = true;
      }
    }
  });
  
  if (shouldFix) {
    // 使用RAF确保DOM完全更新后再修复
    requestAnimationFrame(() => {
      fixAllModalVisibility();
      cleanupOrphanedModals();
    });
  }
};

/**
 * 设置Modal观察器
 */
export const setupModalObserver = (): void => {
  if (observer) {
    observer.disconnect();
  }
  
  observer = new MutationObserver(handleModalMutation);
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
  
  console.log('Modal观察器已启动');
};

/**
 * 强制关闭所有Modal
 */
export const forceCloseAllModals = (): void => {
  // 移除所有Modal相关元素
  const modalElements = document.querySelectorAll('.ant-modal-wrap, .ant-modal-mask');
  modalElements.forEach(el => el.remove());
  
  // 清理body状态
  document.body.classList.remove('modal-open', 'ant-scrolling-effect');
  document.body.style.overflow = '';
  
  // 清理追踪状态
  openModals.clear();
  
  console.log('所有Modal已强制关闭');
};

/**
 * 添加紧急关闭快捷键
 */
export const setupEmergencyCloseShortcut = (): void => {
  const handleKeydown = (event: KeyboardEvent) => {
    // Ctrl+Shift+Esc 强制关闭所有Modal
    if (event.ctrlKey && event.shiftKey && event.key === 'Escape') {
      console.log('紧急Modal关闭快捷键触发');
      forceCloseAllModals();
      event.preventDefault();
      event.stopPropagation();
    }
  };
  
  document.addEventListener('keydown', handleKeydown);
  console.log('紧急Modal关闭快捷键已设置 (Ctrl+Shift+Esc)');
};

/**
 * 获取当前打开的Modal数量
 */
export const getOpenModalCount = (): number => {
  return document.querySelectorAll('.ant-modal-wrap-open').length;
};

/**
 * 检查是否有Modal在显示
 */
export const hasOpenModal = (): boolean => {
  return getOpenModalCount() > 0;
};

/**
 * 添加Modal打开/关闭的事件监听
 */
export const onModalStateChange = (callback: (isOpen: boolean) => void): (() => void) => {
  let lastOpenCount = getOpenModalCount();
  
  const checkInterval = setInterval(() => {
    const currentOpenCount = getOpenModalCount();
    if (currentOpenCount !== lastOpenCount) {
      callback(currentOpenCount > 0);
      lastOpenCount = currentOpenCount;
    }
  }, 100);
  
  // 返回清理函数
  return () => clearInterval(checkInterval);
};

/**
 * 调试功能：显示所有Modal的状态
 */
export const debugModalStates = (): void => {
  const modalWraps = document.querySelectorAll('.ant-modal-wrap');
  
  console.group('Modal状态调试');
  console.log(`找到 ${modalWraps.length} 个Modal容器`);
  
  modalWraps.forEach((wrap, index) => {
    const isOpen = wrap.classList.contains('ant-modal-wrap-open');
    const hasContent = wrap.querySelector('.ant-modal') !== null;
    const style = getComputedStyle(wrap as HTMLElement);
    
    console.log(`Modal ${index + 1}:`, {
      isOpen,
      hasContent,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      zIndex: style.zIndex,
      classes: Array.from(wrap.classList)
    });
  });
  
  console.log(`当前打开的Modal数量: ${getOpenModalCount()}`);
  console.log(`Body类名:`, Array.from(document.body.classList));
  console.groupEnd();
};

/**
 * 初始化统一Modal修复系统
 */
export const initUnifiedModalFix = (): void => {
  console.log('初始化统一Modal修复系统...');
  
  // 立即执行一次修复
  fixAllModalVisibility();
  cleanupOrphanedModals();
  
  // 设置观察器
  setupModalObserver();
  
  // 设置紧急关闭快捷键
  setupEmergencyCloseShortcut();
  
  // 定期清理（每30秒）
  setInterval(() => {
    cleanupOrphanedModals();
    fixAllModalVisibility();
  }, 30000);
  
  // 在开发环境下添加调试功能
  if (process.env.NODE_ENV === 'development') {
    // 添加全局调试函数
    (window as any).__debugModals = debugModalStates;
    console.log('调试功能已添加: window.__debugModals()');
  }
  
  console.log('统一Modal修复系统初始化完成');
};

/**
 * 清理Modal修复系统
 */
export const cleanupModalFix = (): void => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  
  openModals.clear();
  
  // 移除全局调试函数
  if (process.env.NODE_ENV === 'development') {
    delete (window as any).__debugModals;
  }
  
  console.log('Modal修复系统已清理');
};

// 页面卸载时自动清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupModalFix);
}