/**
 * Modal DOM清理工具
 * 用于解决Modal关闭后DOM残留的问题
 */

// 清理所有残留的Modal DOM元素
export const cleanupModalDOMs = (): void => {
  // 清理空的ant-modal-wrap
  const emptyWraps = document.querySelectorAll('.ant-modal-wrap:empty');
  emptyWraps.forEach(wrap => {
    wrap.remove();
  });

  // 清理没有内容的ant-modal-wrap
  const allWraps = document.querySelectorAll('.ant-modal-wrap');
  allWraps.forEach(wrap => {
    const hasModal = wrap.querySelector('.ant-modal, .ant-modal-confirm');
    // ✅ FIXED - 类型断言为HTMLElement以访问style属性
    const htmlWrap = wrap as HTMLElement;
    const isHidden = htmlWrap.style.display === 'none' ||
                     htmlWrap.style.visibility === 'hidden' ||
                     wrap.getAttribute('style')?.includes('display: none') ||
                     wrap.getAttribute('style')?.includes('visibility: hidden');

    if (!hasModal || isHidden) {
      wrap.remove();
    }
  });

  // 清理残留的遮罩层
  const orphanMasks = document.querySelectorAll('.ant-modal-mask');
  orphanMasks.forEach(mask => {
    const parentWrap = mask.closest('.ant-modal-wrap');
    if (!parentWrap) {
      mask.remove();
    }
  });

  // 清理ant-modal-root容器中的空内容
  const modalRoots = document.querySelectorAll('.ant-modal-root');
  modalRoots.forEach(root => {
    const hasContent = root.querySelector('.ant-modal-wrap .ant-modal, .ant-modal-wrap .ant-modal-confirm');
    if (!hasContent) {
      // 不要删除根容器，只清空内容
      const wraps = root.querySelectorAll('.ant-modal-wrap');
      wraps.forEach(wrap => wrap.remove());
    }
  });
};

// 监听Modal状态变化并自动清理
export const setupModalCleanup = (): (() => void) => {
  let observer: MutationObserver | null = null;
  
  const startObserver = () => {
    if (observer) return;
    
    observer = new MutationObserver((mutations) => {
      let needsCleanup = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'style' &&
            mutation.target instanceof HTMLElement) {
          
          const target = mutation.target;
          if (target.classList.contains('ant-modal-wrap')) {
            const isHidden = target.style.display === 'none' || 
                             target.style.visibility === 'hidden';
            if (isHidden) {
              needsCleanup = true;
            }
          }
        }
        
        if (mutation.type === 'childList') {
          // 检查是否有Modal相关的DOM变化
          const hasModalChanges = Array.from(mutation.removedNodes).some(node => 
            node instanceof HTMLElement && 
            (node.classList.contains('ant-modal') || 
             node.classList.contains('ant-modal-confirm'))
          );
          if (hasModalChanges) {
            needsCleanup = true;
          }
        }
      });
      
      if (needsCleanup) {
        // 延迟清理，让React有时间完成清理
        setTimeout(cleanupModalDOMs, 100);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  };
  
  const stopObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };
  
  // 立即开始观察
  startObserver();
  
  // 返回清理函数
  return stopObserver;
};

// 强制清理所有Modal DOM（紧急情况使用）
export const forceCleanupAllModals = (): void => {
  // 移除所有Modal相关DOM
  const modalElements = document.querySelectorAll(
    '.ant-modal-wrap, .ant-modal-mask, .ant-modal-root > div'
  );
  modalElements.forEach(el => el.remove());
  
  // 重置body的modal-open类
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
  
  console.log('已强制清理所有Modal DOM');
};

// 在开发环境下暴露到全局，方便调试
if (process.env.NODE_ENV === 'development') {
  (window as any).modalCleanup = {
    cleanup: cleanupModalDOMs,
    forceCleanup: forceCleanupAllModals,
    setupCleanup: setupModalCleanup
  };
}

export default {
  cleanupModalDOMs,
  setupModalCleanup,
  forceCleanupAllModals
};