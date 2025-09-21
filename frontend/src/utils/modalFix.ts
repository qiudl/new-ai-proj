/**
 * Modal Fix Utility
 * 修复 ant-modal-wrap 相关问题的工具函数
 */

/**
 * 清理有问题的 Modal DOM 元素
 */
export const cleanupOrphanedModals = () => {
  // 查找所有的 Modal wrap 元素
  const modalWraps = document.querySelectorAll('.ant-modal-wrap');
  
  modalWraps.forEach((wrap) => {
    const modalElement = wrap.querySelector('.ant-modal');
    
    // 如果 Modal wrap 存在但没有内容，或者没有正确的类名，则移除
    if (!modalElement || !wrap.classList.contains('ant-modal-wrap-open')) {
      console.log('Removing orphaned modal wrap:', wrap);
      wrap.remove();
    }
  });
};

/**
 * 修复 Modal 显示问题
 */
export const fixModalDisplay = () => {
  const modalWraps = document.querySelectorAll('.ant-modal-wrap');
  
  modalWraps.forEach((wrap) => {
    const htmlElement = wrap as HTMLElement;
    
    // 确保只有打开的 Modal 才显示
    if (wrap.classList.contains('ant-modal-wrap-open')) {
      htmlElement.style.display = 'flex';
      htmlElement.style.pointerEvents = 'auto';
      htmlElement.style.visibility = 'visible';
    } else {
      htmlElement.style.display = 'none';
      htmlElement.style.pointerEvents = 'none';
      htmlElement.style.visibility = 'hidden';
    }
  });
};

/**
 * 监听 DOM 变化，自动修复 Modal 问题
 */
export const setupModalObserver = () => {
  const observer = new MutationObserver((mutations) => {
    let shouldFix = false;
    
    mutations.forEach((mutation) => {
      // 检查是否有新的 Modal 元素被添加
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
      // 延迟执行修复，确保 DOM 完全更新
      setTimeout(() => {
        fixModalDisplay();
        cleanupOrphanedModals();
      }, 100);
    }
  });
  
  // 开始观察 document.body 的变化
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });
  
  return observer;
};

/**
 * 强制关闭所有 Modal
 */
export const forceCloseAllModals = () => {
  const modalWraps = document.querySelectorAll('.ant-modal-wrap');
  const modalMasks = document.querySelectorAll('.ant-modal-mask');
  
  modalWraps.forEach((wrap) => {
    wrap.remove();
  });
  
  modalMasks.forEach((mask) => {
    mask.remove();
  });
  
  // 恢复 body 滚动
  document.body.style.overflow = '';
  document.body.classList.remove('ant-scrolling-effect');
  
  console.log('All modals have been force closed');
};

/**
 * 添加全局键盘快捷键来强制关闭 Modal (Ctrl+Shift+Esc)
 */
export const setupEmergencyModalClose = () => {
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'Escape') {
      console.log('Emergency modal close triggered');
      forceCloseAllModals();
      event.preventDefault();
      event.stopPropagation();
    }
  });
};

/**
 * 初始化所有 Modal 修复功能
 */
export const initModalFix = () => {
  console.log('Initializing modal fix utilities...');
  
  // 立即清理一次
  cleanupOrphanedModals();
  fixModalDisplay();
  
  // 设置观察器
  setupModalObserver();
  
  // 设置紧急关闭快捷键
  setupEmergencyModalClose();
  
  // 定期清理（每 30 秒）
  setInterval(() => {
    cleanupOrphanedModals();
    fixModalDisplay();
  }, 30000);
  
  console.log('Modal fix utilities initialized successfully');
};

/**
 * 检查当前是否有 Modal 在显示
 */
export const hasOpenModal = (): boolean => {
  return document.querySelectorAll('.ant-modal-wrap.ant-modal-wrap-open').length > 0;
};

/**
 * 获取当前打开的 Modal 数量
 */
export const getOpenModalCount = (): number => {
  return document.querySelectorAll('.ant-modal-wrap.ant-modal-wrap-open').length;
};