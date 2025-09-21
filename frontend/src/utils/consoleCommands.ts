/**
 * Console Commands for Modal Debugging
 * 浏览器控制台命令，用于调试和修复 Modal 问题
 */

import { 
  forceCloseAllModals, 
  cleanupOrphanedModals, 
  fixModalDisplay, 
  hasOpenModal, 
  getOpenModalCount 
} from './modalFix';

// 在全局 window 对象上添加调试命令
declare global {
  interface Window {
    modalDebug: {
      forceCloseAll: () => void;
      cleanup: () => void;
      fix: () => void;
      status: () => void;
      inspect: () => void;
      help: () => void;
    };
  }
}

// 创建全局调试对象
window.modalDebug = {
  /**
   * 强制关闭所有 Modal
   * 使用方法：modalDebug.forceCloseAll()
   */
  forceCloseAll: () => {
    console.log('🚨 Force closing all modals...');
    forceCloseAllModals();
    console.log('✅ All modals have been force closed');
  },

  /**
   * 清理无效的 Modal 元素
   * 使用方法：modalDebug.cleanup()
   */
  cleanup: () => {
    console.log('🧹 Cleaning up orphaned modals...');
    cleanupOrphanedModals();
    console.log('✅ Cleanup completed');
  },

  /**
   * 修复 Modal 显示问题
   * 使用方法：modalDebug.fix()
   */
  fix: () => {
    console.log('🔧 Fixing modal display issues...');
    fixModalDisplay();
    console.log('✅ Modal display fixed');
  },

  /**
   * 检查 Modal 状态
   * 使用方法：modalDebug.status()
   */
  status: () => {
    console.log('📊 Modal Status Report:');
    console.log(`- Has open modal: ${hasOpenModal()}`);
    console.log(`- Open modal count: ${getOpenModalCount()}`);
    
    const allWraps = document.querySelectorAll('.ant-modal-wrap');
    const openWraps = document.querySelectorAll('.ant-modal-wrap.ant-modal-wrap-open');
    
    console.log(`- Total modal wraps: ${allWraps.length}`);
    console.log(`- Open modal wraps: ${openWraps.length}`);
    
    if (allWraps.length > openWraps.length) {
      console.log('⚠️ Warning: Found potential orphaned modal wraps');
    }
  },

  /**
   * 检查页面中所有的 Modal 元素
   * 使用方法：modalDebug.inspect()
   */
  inspect: () => {
    console.log('🔍 Inspecting all modal elements:');
    
    const modalWraps = document.querySelectorAll('.ant-modal-wrap');
    const modalMasks = document.querySelectorAll('.ant-modal-mask');
    const modals = document.querySelectorAll('.ant-modal');
    
    console.log('Modal Wraps:', modalWraps);
    console.log('Modal Masks:', modalMasks);
    console.log('Modals:', modals);
    
    modalWraps.forEach((wrap, index) => {
      console.log(`Modal Wrap ${index}:`, {
        element: wrap,
        isOpen: wrap.classList.contains('ant-modal-wrap-open'),
        style: (wrap as HTMLElement).style.cssText,
        hasModal: !!wrap.querySelector('.ant-modal')
      });
    });
  },

  /**
   * 显示可用的命令帮助
   * 使用方法：modalDebug.help()
   */
  help: () => {
    console.log('🆘 Modal Debug Commands:');
    console.log('');
    console.log('modalDebug.forceCloseAll() - 强制关闭所有 Modal');
    console.log('modalDebug.cleanup()       - 清理无效的 Modal 元素');
    console.log('modalDebug.fix()           - 修复 Modal 显示问题');
    console.log('modalDebug.status()        - 检查 Modal 状态');
    console.log('modalDebug.inspect()       - 检查页面中所有的 Modal 元素');
    console.log('modalDebug.help()          - 显示此帮助信息');
    console.log('');
    console.log('🔧 紧急快捷键: Ctrl+Shift+Esc 强制关闭所有 Modal');
    console.log('');
    console.log('如果遇到 Modal 遮挡问题，建议按以下顺序尝试:');
    console.log('1. modalDebug.fix()');
    console.log('2. modalDebug.cleanup()'); 
    console.log('3. modalDebug.forceCloseAll()');
  }
};

// 在开发环境下自动显示帮助信息
if (process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    console.log('🎯 Modal Debug Tools Loaded!');
    console.log('Type "modalDebug.help()" in the console for available commands.');
  }, 2000);
}

export default window.modalDebug;