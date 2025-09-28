import { useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';

// 快捷键映射接口
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

// 快捷键组接口
export interface ShortcutGroup {
  name: string;
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

// 快捷键管理器Hook
export const useKeyboardShortcuts = (
  shortcutGroups: ShortcutGroup[], 
  enabled: boolean = true
) => {
  const registeredShortcuts = useRef<Map<string, KeyboardShortcut>>(new Map());
  const isComposing = useRef(false);

  // 生成快捷键唯一标识
  const generateShortcutKey = useCallback((shortcut: KeyboardShortcut): string => {
    const modifiers = [];
    if (shortcut.ctrlKey) modifiers.push('Ctrl');
    if (shortcut.altKey) modifiers.push('Alt');
    if (shortcut.shiftKey) modifiers.push('Shift');
    if (shortcut.metaKey) modifiers.push('Meta');
    
    return [...modifiers, shortcut.key.toUpperCase()].join('+');
  }, []);

  // 检查快捷键匹配
  const matchesShortcut = useCallback((event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
    return (
      event.key.toLowerCase() === shortcut.key.toLowerCase() &&
      !!event.ctrlKey === !!shortcut.ctrlKey &&
      !!event.altKey === !!shortcut.altKey &&
      !!event.shiftKey === !!shortcut.shiftKey &&
      !!event.metaKey === !!shortcut.metaKey
    );
  }, []);

  // 处理键盘事件
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 忽略输入法组合状态
    if (isComposing.current) return;
    
    // 忽略在表单元素中的快捷键（除非明确指定）
    const target = event.target as HTMLElement;
    const isFormElement = target.tagName === 'INPUT' || 
                         target.tagName === 'TEXTAREA' || 
                         target.isContentEditable;
    
    if (isFormElement && !event.ctrlKey && !event.metaKey) return;

    // 遍历所有启用的快捷键组
    for (const group of shortcutGroups) {
      if (group.enabled === false) continue;
      
      for (const shortcut of group.shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
            event.stopPropagation();
          }
          
          try {
            shortcut.action();
          } catch (error) {
            console.error(`快捷键执行错误 (${generateShortcutKey(shortcut)}):`, error);
            message.error('快捷键执行失败');
          }
          return;
        }
      }
    }
  }, [shortcutGroups, matchesShortcut, generateShortcutKey]);

  // 处理输入法事件
  const handleCompositionStart = useCallback(() => {
    isComposing.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposing.current = false;
  }, []);

  // 注册快捷键
  useEffect(() => {
    if (!enabled) return;

    // 清空之前的注册
    registeredShortcuts.current.clear();
    
    // 重新注册所有快捷键
    shortcutGroups.forEach(group => {
      if (group.enabled === false) return;
      
      group.shortcuts.forEach(shortcut => {
        const key = generateShortcutKey(shortcut);
        registeredShortcuts.current.set(key, shortcut);
      });
    });

    // 绑定事件监听器
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('compositionstart', handleCompositionStart);
    document.addEventListener('compositionend', handleCompositionEnd);

    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('compositionstart', handleCompositionStart);
      document.removeEventListener('compositionend', handleCompositionEnd);
    };
  }, [enabled, shortcutGroups, handleKeyDown, handleCompositionStart, handleCompositionEnd, generateShortcutKey]);

  // 获取所有注册的快捷键
  const getRegisteredShortcuts = useCallback((): KeyboardShortcut[] => {
    return Array.from(registeredShortcuts.current.values());
  }, []);

  // 获取快捷键描述文本
  const getShortcutText = useCallback((shortcut: KeyboardShortcut): string => {
    return generateShortcutKey(shortcut);
  }, [generateShortcutKey]);

  // 显示快捷键帮助
  const showShortcutHelp = useCallback(() => {
    const shortcuts = getRegisteredShortcuts();
    const helpText = shortcuts
      .map(s => `${getShortcutText(s)}: ${s.description}`)
      .join('\n');
    
    message.info({
      content: (
        <div style={{ whiteSpace: 'pre-line', textAlign: 'left' }}>
          <strong>可用快捷键：</strong><br />
          {helpText}
        </div>
      ),
      duration: 8,
    });
  }, [getRegisteredShortcuts, getShortcutText]);

  return {
    getRegisteredShortcuts,
    getShortcutText,
    showShortcutHelp,
    registeredCount: registeredShortcuts.current.size
  };
};

// 预定义的快捷键配置
export const createDocumentShortcuts = (callbacks: {
  save?: () => void;
  toggleEditMode?: () => void;
  focusSearch?: () => void;
  upload?: () => void;
  refresh?: () => void;
  showHelp?: () => void;
  newDocument?: () => void;
  copyDocument?: () => void;
  deleteDocument?: () => void;
  switchTab?: (direction: 'next' | 'prev') => void;
  switchListView?: () => void;
}): ShortcutGroup[] => {
  return [
    {
      name: '文档编辑',
      shortcuts: [
        {
          key: 's',
          ctrlKey: true,
          action: callbacks.save || (() => message.info('保存功能未配置')),
          description: '保存文档'
        },
        {
          key: 'e',
          ctrlKey: true,
          action: callbacks.toggleEditMode || (() => message.info('切换模式功能未配置')),
          description: '切换编辑/预览模式'
        },
        {
          key: 'n',
          ctrlKey: true,
          action: callbacks.newDocument || (() => message.info('新建文档功能未配置')),
          description: '新建文档'
        }
      ]
    },
    {
      name: '文档操作',
      shortcuts: [
        {
          key: 'u',
          ctrlKey: true,
          action: callbacks.upload || (() => message.info('上传功能未配置')),
          description: '上传文件'
        },
        {
          key: 'r',
          ctrlKey: true,
          action: callbacks.refresh || (() => message.info('刷新功能未配置')),
          description: '刷新数据'
        },
        {
          key: 'c',
          ctrlKey: true,
          shiftKey: true,
          action: callbacks.copyDocument || (() => message.info('复制文档功能未配置')),
          description: '复制文档'
        },
        {
          key: 'Delete',
          action: callbacks.deleteDocument || (() => message.info('删除功能未配置')),
          description: '删除选中文档'
        }
      ]
    },
    {
      name: '导航操作',
      shortcuts: [
        {
          key: 'f',
          ctrlKey: true,
          action: callbacks.focusSearch || (() => message.info('搜索功能未配置')),
          description: '聚焦搜索框'
        },
        {
          key: 'Tab',
          ctrlKey: true,
          action: () => callbacks.switchTab?.('next'),
          description: '切换到下一个标签页'
        },
        {
          key: 'Tab',
          ctrlKey: true,
          shiftKey: true,
          action: () => callbacks.switchTab?.('prev'),
          description: '切换到上一个标签页'
        },
        {
          key: 'v',
          ctrlKey: true,
          action: callbacks.switchListView || (() => message.info('切换视图功能未配置')),
          description: '切换文档列表视图'
        }
      ]
    },
    {
      name: '帮助',
      shortcuts: [
        {
          key: '?',
          ctrlKey: true,
          action: callbacks.showHelp || (() => message.info('帮助功能未配置')),
          description: '显示快捷键帮助'
        }
      ]
    }
  ];
};

export default useKeyboardShortcuts;