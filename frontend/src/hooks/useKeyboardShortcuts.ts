// 键盘快捷键Hook - Timer System 2.0 (Docker环境兼容版)
import { useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';

export interface KeyboardShortcut {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = true
  } = options;

  const shortcutsRef = useRef<KeyboardShortcut[]>(shortcuts);
  const enabledRef = useRef(enabled);

  // 更新refs
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // 键盘事件处理器 (Docker环境兼容版)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 安全检查: 确保必要的对象和方法存在
    if (!enabledRef?.current || !event || !shortcutsRef?.current) {
      return;
    }

    // 忽略在输入框中的按键
    const target = event.target as HTMLElement;
    if (target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      (typeof target.closest === 'function' && (
        target.closest('.ant-select') ||
        target.closest('.ant-modal') ||
        target.closest('.ant-drawer')
      ))
    )) {
      return;
    }

    // 安全的快捷键查找 - 使用try-catch保护
    let matchedShortcut;
    try {
      matchedShortcut = shortcutsRef.current.find(shortcut => {
        if (!shortcut || typeof shortcut.key !== 'string') {
          return false;
        }
        
        const keyMatch = shortcut.key.toLowerCase() === event.key?.toLowerCase();
        const metaMatch = !!shortcut.metaKey === (event.metaKey || event.ctrlKey);
        const ctrlMatch = shortcut.ctrlKey === undefined || !!shortcut.ctrlKey === event.ctrlKey;
        const altMatch = shortcut.altKey === undefined || !!shortcut.altKey === event.altKey;
        const shiftMatch = shortcut.shiftKey === undefined || !!shortcut.shiftKey === event.shiftKey;

        return keyMatch && metaMatch && ctrlMatch && altMatch && shiftMatch;
      });
    } catch (error) {
      console.warn('快捷键匹配过程中发生错误:', error);
      return;
    }

    if (matchedShortcut && typeof matchedShortcut.action === 'function') {
      if (preventDefault && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (stopPropagation && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }

      try {
        matchedShortcut.action();
      } catch (error) {
        console.error('快捷键执行错误:', error);
        // 使用安全的消息提示
        if (message && typeof message.error === 'function') {
          message.error('快捷键执行失败');
        }
      }
    }
  }, [preventDefault, stopPropagation]);

  // 注册键盘事件监听器 (Docker环境兼容版)
  useEffect(() => {
    if (enabled && typeof document !== 'undefined' && document.addEventListener) {
      // 安全检查: 确保addEventListener方法存在
      try {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
          if (document.removeEventListener) {
            document.removeEventListener('keydown', handleKeyDown);
          }
        };
      } catch (error) {
        console.warn('键盘事件监听器注册失败:', error);
      }
    }
  }, [enabled, handleKeyDown]);

  // 返回快捷键帮助信息
  const getShortcutsHelp = useCallback(() => {
    return shortcutsRef.current.map(shortcut => ({
      key: formatShortcutKey(shortcut),
      description: shortcut.description,
      category: shortcut.category || '通用'
    }));
  }, []);

  return {
    getShortcutsHelp,
    showShortcutHelp: getShortcutsHelp, // Alias for compatibility
    registeredCount: shortcutsRef.current.length
  };
};

// 格式化快捷键显示
const formatShortcutKey = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  
  if (shortcut.metaKey) {
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  }
  if (shortcut.ctrlKey && !shortcut.metaKey) {
    parts.push('Ctrl');
  }
  if (shortcut.altKey) {
    parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');
  }
  if (shortcut.shiftKey) {
    parts.push('⇧');
  }
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(' + ');
};

// 预定义的Timer系统快捷键
export const createTimerShortcuts = (actions: {
  startTimer?: () => void;
  stopTimer?: () => void;
  pauseTimer?: () => void;
  createTask?: () => void;
  openTaskList?: () => void;
  openAnalytics?: () => void;
  openHistory?: () => void;
  showHelp?: () => void;
  toggleFocus?: () => void;
  quickSave?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.startTimer) {
    shortcuts.push({
      key: 's',
      metaKey: true,
      action: actions.startTimer,
      description: '开始计时',
      category: '计时控制'
    });
  }

  if (actions.stopTimer) {
    shortcuts.push({
      key: 'e',
      metaKey: true,
      action: actions.stopTimer,
      description: '停止计时',
      category: '计时控制'
    });
  }

  if (actions.pauseTimer) {
    shortcuts.push({
      key: 'p',
      metaKey: true,
      action: actions.pauseTimer,
      description: '暂停/恢复计时',
      category: '计时控制'
    });
  }

  if (actions.createTask) {
    shortcuts.push({
      key: 'n',
      metaKey: true,
      action: actions.createTask,
      description: '创建新任务',
      category: '任务管理'
    });
  }

  if (actions.openTaskList) {
    shortcuts.push({
      key: 't',
      metaKey: true,
      action: actions.openTaskList,
      description: '打开任务列表',
      category: '导航'
    });
  }

  if (actions.openAnalytics) {
    shortcuts.push({
      key: 'a',
      metaKey: true,
      action: actions.openAnalytics,
      description: '打开数据分析',
      category: '导航'
    });
  }

  if (actions.openHistory) {
    shortcuts.push({
      key: 'h',
      metaKey: true,
      action: actions.openHistory,
      description: '打开历史记录',
      category: '导航'
    });
  }

  if (actions.showHelp) {
    shortcuts.push({
      key: '?',
      shiftKey: true,
      action: actions.showHelp,
      description: '显示快捷键帮助',
      category: '帮助'
    });
  }

  if (actions.toggleFocus) {
    shortcuts.push({
      key: 'f',
      metaKey: true,
      action: actions.toggleFocus,
      description: '切换专注模式',
      category: '界面'
    });
  }

  if (actions.quickSave) {
    shortcuts.push({
      key: 's',
      metaKey: true,
      shiftKey: true,
      action: actions.quickSave,
      description: '快速保存',
      category: '操作'
    });
  }

  // 添加数字键快捷键（选择任务）
  for (let i = 1; i <= 9; i++) {
    shortcuts.push({
      key: i.toString(),
      metaKey: true,
      action: () => {
        // 触发选择第i个任务的事件
        const event = new CustomEvent('selectTaskByIndex', { detail: { index: i - 1 } });
        document.dispatchEvent(event);
      },
      description: `选择第${i}个任务`,
      category: '快速操作'
    });
  }

  return shortcuts;
};

// 预定义的文档系统快捷键
export const createDocumentShortcuts = (actions: {
  saveDocument?: () => void;
  toggleEdit?: () => void;
  togglePreview?: () => void;
  uploadFile?: () => void;
  refreshDocuments?: () => void;
  openManager?: () => void;
  showStats?: () => void;
  exportDocument?: () => void;
  newDocument?: () => void;
  deleteDocument?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.saveDocument) {
    shortcuts.push({
      key: 's',
      metaKey: true,
      action: actions.saveDocument,
      description: '保存文档',
      category: '文档操作'
    });
  }

  if (actions.toggleEdit) {
    shortcuts.push({
      key: 'e',
      metaKey: true,
      action: actions.toggleEdit,
      description: '切换编辑模式',
      category: '视图切换'
    });
  }

  if (actions.togglePreview) {
    shortcuts.push({
      key: 'p',
      metaKey: true,
      action: actions.togglePreview,
      description: '切换预览模式',
      category: '视图切换'
    });
  }

  if (actions.uploadFile) {
    shortcuts.push({
      key: 'u',
      metaKey: true,
      action: actions.uploadFile,
      description: '上传文件',
      category: '文档操作'
    });
  }

  if (actions.refreshDocuments) {
    shortcuts.push({
      key: 'r',
      metaKey: true,
      action: actions.refreshDocuments,
      description: '刷新文档列表',
      category: '文档操作'
    });
  }

  if (actions.openManager) {
    shortcuts.push({
      key: 'm',
      metaKey: true,
      action: actions.openManager,
      description: '打开文档管理器',
      category: '导航'
    });
  }

  if (actions.showStats) {
    shortcuts.push({
      key: 'i',
      metaKey: true,
      action: actions.showStats,
      description: '显示文档统计',
      category: '信息'
    });
  }

  if (actions.exportDocument) {
    shortcuts.push({
      key: 'd',
      metaKey: true,
      action: actions.exportDocument,
      description: '导出文档',
      category: '文档操作'
    });
  }

  if (actions.newDocument) {
    shortcuts.push({
      key: 'n',
      metaKey: true,
      shiftKey: true,
      action: actions.newDocument,
      description: '新建文档',
      category: '文档操作'
    });
  }

  if (actions.deleteDocument) {
    shortcuts.push({
      key: 'Delete',
      action: actions.deleteDocument,
      description: '删除选中文档',
      category: '文档操作'
    });
  }

  return shortcuts;
};

// 导出命名的useKeyboardShortcuts
export { useKeyboardShortcuts };

export default useKeyboardShortcuts;