// 键盘快捷键Hook - Timer System 2.0
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

  // 键盘事件处理器
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabledRef.current) return;

    // 忽略在输入框中的按键
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('.ant-select') ||
      target.closest('.ant-modal') ||
      target.closest('.ant-drawer')
    ) {
      return;
    }

    // 查找匹配的快捷键
    const matchedShortcut = shortcutsRef.current.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const metaMatch = !!shortcut.metaKey === (event.metaKey || event.ctrlKey);
      const ctrlMatch = shortcut.ctrlKey === undefined || !!shortcut.ctrlKey === event.ctrlKey;
      const altMatch = shortcut.altKey === undefined || !!shortcut.altKey === event.altKey;
      const shiftMatch = shortcut.shiftKey === undefined || !!shortcut.shiftKey === event.shiftKey;

      return keyMatch && metaMatch && ctrlMatch && altMatch && shiftMatch;
    });

    if (matchedShortcut) {
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }

      try {
        matchedShortcut.action();
      } catch (error) {
        console.error('快捷键执行错误:', error);
        message.error('快捷键执行失败');
      }
    }
  }, [preventDefault, stopPropagation]);

  // 注册键盘事件监听器
  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
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
    getShortcutsHelp
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

export default useKeyboardShortcuts;