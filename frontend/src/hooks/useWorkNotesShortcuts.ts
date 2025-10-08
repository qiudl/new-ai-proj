import { useRef } from 'react';
import { useKeyboardShortcuts, KeyboardShortcut } from './useKeyboardShortcuts';

interface WorkNotesShortcutsActions {
  onQuickCreate: () => void;
  onFullCreate: () => void;
  onFocusSearch: () => void;
  onEscape: () => void;
  onRefresh?: () => void;
}

export const useWorkNotesShortcuts = (actions: WorkNotesShortcutsActions) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 创建工作笔记专用快捷键
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'n',
      metaKey: true,
      action: actions.onQuickCreate,
      description: '快速创建笔记',
      category: '创建操作'
    },
    {
      key: 'n',
      metaKey: true,
      shiftKey: true,
      action: actions.onFullCreate,
      description: '完整创建笔记',
      category: '创建操作'
    },
    {
      key: 'k',
      metaKey: true,
      action: () => {
        actions.onFocusSearch();
        // 尝试聚焦搜索框
        const searchInput = document.querySelector('input[placeholder*="搜索"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: '聚焦搜索框',
      category: '导航操作'
    },
    {
      key: 'Escape',
      action: actions.onEscape,
      description: '关闭模态框/取消操作',
      category: '通用操作'
    }
  ];

  // 如果有刷新功能，添加刷新快捷键
  if (actions.onRefresh) {
    shortcuts.push({
      key: 'r',
      metaKey: true,
      action: actions.onRefresh,
      description: '刷新笔记列表',
      category: '通用操作'
    });
  }

  const { getShortcutsHelp } = useKeyboardShortcuts(shortcuts, {
    enabled: true,
    preventDefault: true,
    stopPropagation: true
  });

  return {
    getShortcutsHelp,
    searchInputRef
  };
};