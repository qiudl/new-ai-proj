// Phase 4: 右键上下文菜单系统
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, Divider } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SettingOutlined,
  FolderOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  CopyOutlined,
  ShareAltOutlined
} from '@ant-design/icons';

// 菜单项接口
export interface ContextMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  divide?: boolean; // 是否在此项后添加分隔线
  shortcut?: string; // 快捷键显示
  submenu?: ContextMenuItem[]; // 子菜单
}

// 上下文菜单配置
export interface ContextMenuConfig {
  items: ContextMenuItem[];
  trigger?: 'rightClick' | 'click' | 'hover';
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
  disabled?: boolean;
}

// 菜单显示状态
interface MenuState {
  visible: boolean;
  x: number;
  y: number;
  config: ContextMenuConfig | null;
}

// 全局上下文菜单管理器
class ContextMenuManager {
  private currentMenu: MenuState = {
    visible: false,
    x: 0,
    y: 0,
    config: null
  };
  private listeners: Set<(state: MenuState) => void> = new Set();

  // 显示菜单
  showMenu(x: number, y: number, config: ContextMenuConfig) {
    if (config.disabled) return;

    this.currentMenu = {
      visible: true,
      x,
      y,
      config
    };
    this.notifyListeners();
  }

  // 隐藏菜单
  hideMenu() {
    this.currentMenu = {
      visible: false,
      x: 0,
      y: 0,
      config: null
    };
    this.notifyListeners();
  }

  // 添加状态监听器
  addListener(listener: (state: MenuState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // 通知所有监听器
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentMenu));
  }

  // 获取当前菜单状态
  getCurrentState() {
    return this.currentMenu;
  }
}

// 全局菜单管理器实例
export const contextMenuManager = new ContextMenuManager();

// 上下文菜单Hook
export const useContextMenu = (config: ContextMenuConfig) => {
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const showMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const { clientX, clientY } = event;
    contextMenuManager.showMenu(clientX, clientY, configRef.current);
  }, []);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    if (configRef.current.trigger === 'rightClick' || !configRef.current.trigger) {
      showMenu(event);
    }
  }, [showMenu]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (configRef.current.trigger === 'click') {
      showMenu(event);
    }
  }, [showMenu]);

  return {
    onContextMenu: handleContextMenu,
    onClick: configRef.current.trigger === 'click' ? handleClick : undefined,
    showMenu
  };
};

// 上下文菜单渲染组件
export const ContextMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuState, setMenuState] = useState<MenuState>({
    visible: false,
    x: 0,
    y: 0,
    config: null
  });

  useEffect(() => {
    const unsubscribe = contextMenuManager.addListener(setMenuState);

    // 点击其他地方关闭菜单
    const handleClickOutside = () => {
      contextMenuManager.hideMenu();
    };

    // 按ESC键关闭菜单
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        contextMenuManager.hideMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMenuClick = (key: string) => {
    const findMenuItem = (items: ContextMenuItem[]): ContextMenuItem | null => {
      for (const item of items) {
        if (item.key === key) return item;
        if (item.submenu) {
          const found = findMenuItem(item.submenu);
          if (found) return found;
        }
      }
      return null;
    };

    if (menuState.config) {
      const menuItem = findMenuItem(menuState.config.items);
      if (menuItem && !menuItem.disabled) {
        menuItem.onClick();
        contextMenuManager.hideMenu();
      }
    }
  };

  const renderMenuItems = (items: ContextMenuItem[]) => {
    const menuItems: React.ReactNode[] = [];

    items.forEach((item, index) => {
      if (item.submenu) {
        menuItems.push(
          <Menu.SubMenu
            key={item.key}
            title={
              <span>
                {item.icon} {item.label}
              </span>
            }
            disabled={item.disabled}
          >
            {renderMenuItems(item.submenu)}
          </Menu.SubMenu>
        );
      } else {
        menuItems.push(
          <Menu.Item
            key={item.key}
            disabled={item.disabled}
            danger={item.danger}
            icon={item.icon}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{item.label}</span>
              {item.shortcut && (
                <span style={{ color: '#8c8c8c', fontSize: '12px', marginLeft: '16px' }}>
                  {item.shortcut}
                </span>
              )}
            </div>
          </Menu.Item>
        );
      }

      // 添加分隔线
      if (item.divide && index < items.length - 1) {
        menuItems.push(<Menu.Divider key={`divider-${index}`} />);
      }
    });

    return menuItems;
  };

  return (
    <>
      {children}
      {menuState.visible && menuState.config && (
        <div
          style={{
            position: 'fixed',
            top: menuState.y,
            left: menuState.x,
            zIndex: 1010,
            pointerEvents: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Menu
            onClick={({ key }) => handleMenuClick(key)}
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08)',
              minWidth: '160px'
            }}
          >
            {renderMenuItems(menuState.config.items)}
          </Menu>
        </div>
      )}
    </>
  );
};

// 预定义的菜单配置
export const createTimerContextMenu = (
  isRunning: boolean,
  isPaused: boolean,
  onStart: () => void,
  onPause: () => void,
  onStop: () => void,
  onReset: () => void,
  onViewHistory: () => void,
  onSettings: () => void
): ContextMenuConfig => ({
  items: [
    {
      key: 'start',
      label: isRunning ? (isPaused ? '继续计时' : '重新开始') : '开始计时',
      icon: <PlayCircleOutlined />,
      onClick: onStart,
      disabled: isRunning && !isPaused,
      shortcut: 'Space'
    },
    {
      key: 'pause',
      label: isPaused ? '继续' : '暂停',
      icon: <PauseCircleOutlined />,
      onClick: onPause,
      disabled: !isRunning,
      shortcut: 'Ctrl+P',
      divide: true
    },
    {
      key: 'stop',
      label: '停止计时',
      icon: <StopOutlined />,
      onClick: onStop,
      disabled: !isRunning,
      shortcut: 'Ctrl+S'
    },
    {
      key: 'reset',
      label: '重置计时器',
      icon: <ReloadOutlined />,
      onClick: onReset,
      divide: true
    },
    {
      key: 'history',
      label: '查看历史',
      icon: <ClockCircleOutlined />,
      onClick: onViewHistory,
      shortcut: 'Ctrl+H'
    },
    {
      key: 'settings',
      label: '计时器设置',
      icon: <SettingOutlined />,
      onClick: onSettings,
      divide: true
    }
  ]
});

export const createTaskContextMenu = (
  onStartTimer: () => void,
  onEdit: () => void,
  onDuplicate: () => void,
  onArchive: () => void,
  onDelete: () => void,
  onViewDetails: () => void
): ContextMenuConfig => ({
  items: [
    {
      key: 'start',
      label: '开始计时',
      icon: <PlayCircleOutlined />,
      onClick: onStartTimer,
      shortcut: 'Enter'
    },
    {
      key: 'view',
      label: '查看详情',
      icon: <EyeOutlined />,
      onClick: onViewDetails,
      divide: true
    },
    {
      key: 'edit',
      label: '编辑任务',
      icon: <EditOutlined />,
      onClick: onEdit,
      shortcut: 'F2'
    },
    {
      key: 'duplicate',
      label: '复制任务',
      icon: <CopyOutlined />,
      onClick: onDuplicate,
      shortcut: 'Ctrl+D',
      divide: true
    },
    {
      key: 'archive',
      label: '归档任务',
      icon: <FolderOutlined />,
      onClick: onArchive
    },
    {
      key: 'delete',
      label: '删除任务',
      icon: <DeleteOutlined />,
      onClick: onDelete,
      danger: true,
      shortcut: 'Delete'
    }
  ]
});

export const createChartContextMenu = (
  onRefresh: () => void,
  onExport: () => void,
  onFullscreen: () => void,
  onTimeRange: () => void,
  onShare: () => void
): ContextMenuConfig => ({
  items: [
    {
      key: 'refresh',
      label: '刷新数据',
      icon: <ReloadOutlined />,
      onClick: onRefresh,
      shortcut: 'F5'
    },
    {
      key: 'fullscreen',
      label: '全屏查看',
      icon: <BarChartOutlined />,
      onClick: onFullscreen,
      shortcut: 'F11',
      divide: true
    },
    {
      key: 'timerange',
      label: '时间范围',
      icon: <ClockCircleOutlined />,
      onClick: onTimeRange,
      submenu: [
        {
          key: 'today',
          label: '今天',
          onClick: () => onTimeRange()
        },
        {
          key: 'week',
          label: '本周',
          onClick: () => onTimeRange()
        },
        {
          key: 'month',
          label: '本月',
          onClick: () => onTimeRange()
        },
        {
          key: 'custom',
          label: '自定义...',
          onClick: () => onTimeRange()
        }
      ]
    },
    {
      key: 'export',
      label: '导出数据',
      icon: <DownloadOutlined />,
      onClick: onExport,
      divide: true
    },
    {
      key: 'share',
      label: '分享图表',
      icon: <ShareAltOutlined />,
      onClick: onShare
    }
  ]
});

export default ContextMenuProvider;