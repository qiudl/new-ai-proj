/**
 * Modal Height Manager Utility
 * 模态框高度管理工具
 * 
 * 提供自动高度检测和滚动条管理功能
 */

export interface ModalHeightConfig {
  /** 最大高度百分比 (0-1) */
  maxHeightRatio?: number;
  /** 顶部留白像素 */
  topMargin?: number;
  /** 底部留白像素 */
  bottomMargin?: number;
  /** 是否启用自动滚动 */
  enableAutoScroll?: boolean;
  /** 调试模式 */
  debug?: boolean;
}

const DEFAULT_CONFIG: Required<ModalHeightConfig> = {
  maxHeightRatio: 0.9, // 最大占用90%屏幕高度
  topMargin: 20,
  bottomMargin: 20,
  enableAutoScroll: true,
  debug: false
};

/**
 * 获取视口高度
 */
export const getViewportHeight = (): number => {
  return window.innerHeight || document.documentElement.clientHeight;
};

/**
 * 计算最大可用高度
 */
export const calculateMaxAvailableHeight = (config: ModalHeightConfig = {}): number => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const viewportHeight = getViewportHeight();
  
  return viewportHeight * finalConfig.maxHeightRatio - finalConfig.topMargin - finalConfig.bottomMargin;
};

/**
 * 检查元素是否需要滚动条
 */
export const needsScrollbar = (element: HTMLElement, maxHeight: number): boolean => {
  if (!element) return false;
  
  // 获取元素的实际高度（包括内容）
  const scrollHeight = element.scrollHeight;
  const currentHeight = element.offsetHeight;
  
  // 如果内容高度超过最大可用高度，或者已经有滚动条
  return scrollHeight > maxHeight || scrollHeight > currentHeight;
};

/**
 * 应用高度限制和滚动条
 */
export const applyHeightConstraints = (
  modalElement: HTMLElement,
  config: ModalHeightConfig = {}
): boolean => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const maxHeight = calculateMaxAvailableHeight(finalConfig);
  
  if (finalConfig.debug) {
    console.log('[ModalHeightManager] 应用高度约束:', {
      element: modalElement,
      maxHeight,
      currentHeight: modalElement.offsetHeight,
      scrollHeight: modalElement.scrollHeight,
      config: finalConfig
    });
  }
  
  // 检查是否需要应用约束
  const needsConstraints = needsScrollbar(modalElement, maxHeight);
  
  if (needsConstraints) {
    // 应用最大高度
    modalElement.style.maxHeight = `${maxHeight}px`;
    
    if (finalConfig.enableAutoScroll) {
      // 启用垂直滚动
      modalElement.style.overflowY = 'auto';
      modalElement.style.overflowX = 'hidden';
    }
    
    // 添加滚动条样式
    modalElement.style.paddingRight = '8px';
    
    // 确保模态框位置居中
    const modal = modalElement.closest('.ant-modal') as HTMLElement;
    if (modal) {
      modal.style.top = `${finalConfig.topMargin}px`;
      modal.style.marginTop = '0';
    }
    
    if (finalConfig.debug) {
      console.log('[ModalHeightManager] 已应用滚动约束');
    }
    
    return true;
  }
  
  return false;
};

/**
 * 查找模态框的内容容器
 */
export const findModalBody = (modalWrapper: Element): HTMLElement | null => {
  // 按优先级查找模态框内容容器
  const selectors = [
    '.ant-modal-body',        // 标准 Ant Design Modal 内容区
    '.ant-modal-content',     // Modal 内容包装器
    '[role="dialog"] > div',  // 通用对话框内容
    '.modal-body',            // 自定义 Modal 内容
  ];
  
  for (const selector of selectors) {
    const element = modalWrapper.querySelector(selector) as HTMLElement;
    if (element) return element;
  }
  
  return null;
};

/**
 * 自动管理单个模态框的高度
 */
export const manageModalHeight = (
  modalWrapper: Element,
  config: ModalHeightConfig = {}
): boolean => {
  const modalBody = findModalBody(modalWrapper);
  if (!modalBody) {
    console.warn('[ModalHeightManager] 未找到模态框内容容器:', modalWrapper);
    return false;
  }
  
  return applyHeightConstraints(modalBody, config);
};

/**
 * 监听并自动管理所有模态框的高度
 */
export const setupAutoHeightManagement = (config: ModalHeightConfig = {}): (() => void) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // 处理现有模态框
  const processExistingModals = () => {
    const modals = document.querySelectorAll('.ant-modal-wrap');
    modals.forEach(modal => {
      if (modal.classList.contains('ant-modal-wrap-open')) {
        manageModalHeight(modal, finalConfig);
      }
    });
  };
  
  // 立即处理现有模态框
  processExistingModals();
  
  // 设置 MutationObserver 监听新模态框
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // 检查新增的模态框
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            if (node.classList.contains('ant-modal-wrap') ||
                node.querySelector('.ant-modal-wrap')) {
              shouldProcess = true;
            }
          }
        });
      } else if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        // 检查模态框状态变化
        const target = mutation.target as Element;
        if (target.classList.contains('ant-modal-wrap')) {
          shouldProcess = true;
        }
      }
    });
    
    if (shouldProcess) {
      // 使用 requestAnimationFrame 确保 DOM 完全更新
      requestAnimationFrame(() => {
        processExistingModals();
      });
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
  
  // 监听窗口大小变化
  const handleResize = () => {
    processExistingModals();
  };
  
  window.addEventListener('resize', handleResize);
  
  if (finalConfig.debug) {
    console.log('[ModalHeightManager] 自动高度管理已启动');
  }
  
  // 返回清理函数
  return () => {
    observer.disconnect();
    window.removeEventListener('resize', handleResize);
    
    if (finalConfig.debug) {
      console.log('[ModalHeightManager] 自动高度管理已停止');
    }
  };
};

/**
 * 手动触发高度重新计算
 */
export const recalculateModalHeights = (config: ModalHeightConfig = {}): void => {
  const modals = document.querySelectorAll('.ant-modal-wrap-open');
  modals.forEach(modal => {
    manageModalHeight(modal, config);
  });
};

/**
 * 为特定模态框创建高度管理样式
 */
export const createModalHeightStyles = (config: ModalHeightConfig = {}): string => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const maxHeight = calculateMaxAvailableHeight(finalConfig);
  
  return `
    .modal-height-managed .ant-modal-body {
      max-height: ${maxHeight}px;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 8px;
    }
    
    .modal-height-managed .ant-modal {
      top: ${finalConfig.topMargin}px !important;
      margin-top: 0 !important;
    }
    
    /* 滚动条样式优化 */
    .modal-height-managed .ant-modal-body::-webkit-scrollbar {
      width: 6px;
    }
    
    .modal-height-managed .ant-modal-body::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }
    
    .modal-height-managed .ant-modal-body::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }
    
    .modal-height-managed .ant-modal-body::-webkit-scrollbar-thumb:hover {
      background: #a1a1a1;
    }
  `;
};

/**
 * 应用模态框高度管理样式类
 */
export const applyHeightManagedClass = (modalElement: Element): void => {
  const modal = modalElement.closest('.ant-modal-wrap');
  if (modal) {
    modal.classList.add('modal-height-managed');
  }
};

/**
 * 移除模态框高度管理样式类
 */
export const removeHeightManagedClass = (modalElement: Element): void => {
  const modal = modalElement.closest('.ant-modal-wrap');
  if (modal) {
    modal.classList.remove('modal-height-managed');
  }
};

/**
 * 通用高度管理工具函数（非React Hook）
 * 可以在任何环境中使用
 */
export const createModalHeightManager = (config: ModalHeightConfig = {}) => {
  if (typeof window === 'undefined') return { cleanup: () => {} };
  
  const cleanup = setupAutoHeightManagement(config);
  
  return {
    cleanup,
    recalculate: () => recalculateModalHeights(config),
    applyToModal: (element: Element) => applyHeightManagedClass(element),
    removeFromModal: (element: Element) => removeHeightManagedClass(element)
  };
};

// 全局初始化（可选）
let globalCleanup: (() => void) | null = null;

/**
 * 全局启用模态框高度管理
 */
export const enableGlobalModalHeightManagement = (config: ModalHeightConfig = {}): void => {
  if (globalCleanup) {
    console.warn('[ModalHeightManager] 全局高度管理已启用，先清理旧实例');
    globalCleanup();
  }
  
  globalCleanup = setupAutoHeightManagement(config);
  
  // 注入样式
  const styleId = 'modal-height-manager-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = createModalHeightStyles(config);
    document.head.appendChild(style);
  }
  
  console.log('[ModalHeightManager] 全局高度管理已启用');
};

/**
 * 禁用全局模态框高度管理
 */
export const disableGlobalModalHeightManagement = (): void => {
  if (globalCleanup) {
    globalCleanup();
    globalCleanup = null;
  }
  
  // 移除注入的样式
  const styleElement = document.getElementById('modal-height-manager-styles');
  if (styleElement) {
    styleElement.remove();
  }
  
  console.log('[ModalHeightManager] 全局高度管理已禁用');
};