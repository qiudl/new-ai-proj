import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Button, 
  Dropdown, 
  Space, 
  Tooltip, 
  Slider,
  Typography
} from 'antd';
import {
  CloseOutlined,
  EditOutlined,
  EyeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BookOutlined,
  SettingOutlined,
  DownloadOutlined,
  PrinterOutlined,
  ShareAltOutlined,
  BgColorsOutlined,
  CompressOutlined,
  ExpandOutlined
} from '@ant-design/icons';
import './FullscreenToolbar.css';

const { Text } = Typography;

export interface FullscreenToolbarProps {
  // 视图状态
  viewMode: 'preview' | 'edit';
  sidebarCollapsed: boolean;
  showOutline: boolean;
  isCompactMode: boolean;
  isFullscreen?: boolean;
  
  // 用户偏好
  fontSize: number;
  theme: 'light' | 'dark';
  
  // 回调函数
  onViewModeChange: (mode: 'preview' | 'edit') => void;
  onSidebarToggle: () => void;
  onOutlineToggle: () => void;
  onCompactModeToggle: () => void;
  onThemeChange: (theme: 'light' | 'dark') => void;
  onFontSizeChange: (size: number) => void;
  onDownload: () => void;
  onPrint: () => void;
  onShare: () => void;
  onSettings: () => void;
  onClose: () => void;
  
  // 配置选项
  autoHide?: boolean;
  hideDelay?: number;
  showTitle?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  loading?: boolean;
}

// 自动隐藏Hook
const useAutoHide = (enabled: boolean, delay: number) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (enabled && !isHovered) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, delay);
    }
  }, [enabled, isHovered, delay]);

  const showToolbar = useCallback(() => {
    setIsVisible(true);
    resetTimer();
  }, [resetTimer]);

  const hideToolbar = useCallback(() => {
    if (!isHovered) {
      setIsVisible(false);
    }
  }, [isHovered]);

  // 鼠标移动显示工具栏
  useEffect(() => {
    const handleMouseMove = () => showToolbar();
    
    if (enabled) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }
  }, [enabled, showToolbar]);

  // 键盘活动显示工具栏
  useEffect(() => {
    const handleKeyPress = () => showToolbar();
    
    if (enabled) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [enabled, showToolbar]);

  // 组件挂载时启动定时器
  useEffect(() => {
    if (enabled) {
      resetTimer();
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, resetTimer]);

  return {
    isVisible,
    setIsHovered,
    showToolbar,
    hideToolbar
  };
};

// 快捷键Hook
const useToolbarShortcuts = (callbacks: {
  onToggleToolbar: () => void;
  onToggleEdit: () => void;
  onToggleSidebar: () => void;
  onClose: () => void;
  onDownload: () => void;
  onPrint: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 只在没有输入框焦点时处理快捷键
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || 
                            document.activeElement?.tagName === 'TEXTAREA';
      
      if (isInputFocused) return;

      // Ctrl+H: 切换工具栏
      if (event.ctrlKey && event.key === 'h') {
        event.preventDefault();
        callbacks.onToggleToolbar();
      }
      
      // Ctrl+E: 编辑模式
      if (event.ctrlKey && event.key === 'e') {
        event.preventDefault();
        callbacks.onToggleEdit();
      }
      
      // Ctrl+B: 侧边栏
      if (event.ctrlKey && event.key === 'b') {
        event.preventDefault();
        callbacks.onToggleSidebar();
      }
      
      // ESC: 关闭
      if (event.key === 'Escape') {
        event.preventDefault();
        callbacks.onClose();
      }
      
      // Ctrl+D: 下载
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        callbacks.onDownload();
      }
      
      // Ctrl+P: 打印
      if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        callbacks.onPrint();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callbacks]);
};

// 字体控制组件
interface FontSizeControlProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const FontSizeControl: React.FC<FontSizeControlProps> = ({
  fontSize,
  onFontSizeChange,
  min = 10,
  max = 24,
  step = 1
}) => {
  const handleSliderChange = (value: number) => {
    onFontSizeChange(value);
  };

  const handleReset = () => {
    onFontSizeChange(14); // 默认大小
  };

  return (
    <div className="font-size-control">
      <Tooltip title={`字体大小: ${fontSize}px`}>
        <div className="font-size-slider">
          <Button 
            type="text" 
            size="small"
            onClick={() => onFontSizeChange(Math.max(min, fontSize - step))}
            disabled={fontSize <= min}
            className="font-adjust-btn"
          >
            A-
          </Button>
          
          <Slider
            min={min}
            max={max}
            step={step}
            value={fontSize}
            onChange={handleSliderChange}
            style={{ width: 80, margin: '0 8px' }}
          />
          
          <Button 
            type="text" 
            size="small"
            onClick={() => onFontSizeChange(Math.min(max, fontSize + step))}
            disabled={fontSize >= max}
            className="font-adjust-btn"
          >
            A+
          </Button>
          
          <Button 
            type="text" 
            size="small"
            onClick={handleReset}
            title="重置"
            className="font-adjust-btn"
          >
            ↺
          </Button>
        </div>
      </Tooltip>
    </div>
  );
};

const FullscreenToolbar: React.FC<FullscreenToolbarProps> = ({
  viewMode,
  sidebarCollapsed,
  showOutline,
  isCompactMode,
  fontSize,
  theme,
  onViewModeChange,
  onSidebarToggle,
  onOutlineToggle,
  onCompactModeToggle,
  onThemeChange,
  onFontSizeChange,
  onDownload,
  onPrint,
  onShare,
  onSettings,
  onClose,
  autoHide = true,
  hideDelay = 3000,
  showTitle = true,
  title = '',
  subtitle = '',
  className = ''
}) => {
  const [forceVisible, setForceVisible] = useState(false);
  
  const { isVisible, setIsHovered, showToolbar } = useAutoHide(
    autoHide && !forceVisible, 
    hideDelay
  );

  // 快捷键回调
  const shortcutCallbacks = {
    onToggleToolbar: () => {
      setForceVisible(!forceVisible);
      showToolbar();
    },
    onToggleEdit: () => onViewModeChange(viewMode === 'edit' ? 'preview' : 'edit'),
    onToggleSidebar: onSidebarToggle,
    onClose,
    onDownload,
    onPrint
  };

  useToolbarShortcuts(shortcutCallbacks);

  const handleMouseEnter = () => {
    setIsHovered(true);
    showToolbar();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // 主题切换菜单
  const themeMenuItems = [
    {
      key: 'light',
      label: '浅色主题',
      icon: <BgColorsOutlined />,
      onClick: () => onThemeChange('light')
    },
    {
      key: 'dark',
      label: '深色主题',
      icon: <BgColorsOutlined />,
      onClick: () => onThemeChange('dark')
    }
  ];

  // 更多操作菜单
  const moreMenuItems = [
    {
      key: 'download',
      label: '下载文档',
      icon: <DownloadOutlined />,
      onClick: onDownload
    },
    {
      key: 'print',
      label: '打印文档',
      icon: <PrinterOutlined />,
      onClick: onPrint
    },
    {
      key: 'share',
      label: '分享文档',
      icon: <ShareAltOutlined />,
      onClick: onShare
    },
    {
      type: 'divider' as const
    },
    {
      key: 'settings',
      label: '设置',
      icon: <SettingOutlined />,
      onClick: onSettings
    }
  ];

  const toolbarClasses = [
    'fullscreen-toolbar',
    isVisible ? 'visible' : 'hidden',
    theme === 'dark' ? 'dark-theme' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={toolbarClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="fullscreen-toolbar"
    >
      {/* 左侧工具组 */}
      <div className="toolbar-section toolbar-left">
        <Space size="small">
          {/* 侧边栏切换 */}
          <Tooltip title={`${sidebarCollapsed ? '显示' : '隐藏'}侧边栏 (Ctrl+B)`}>
            <Button
              type="text"
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={onSidebarToggle}
              className="toolbar-button"
              data-testid="sidebar-toggle"
            />
          </Tooltip>

          {/* 编辑/预览模式切换 */}
          <Tooltip title={`切换到${viewMode === 'edit' ? '预览' : '编辑'}模式 (Ctrl+E)`}>
            <Button
              type={viewMode === 'edit' ? 'primary' : 'text'}
              icon={viewMode === 'edit' ? <EyeOutlined /> : <EditOutlined />}
              onClick={() => onViewModeChange(viewMode === 'edit' ? 'preview' : 'edit')}
              className="toolbar-button"
              data-testid="edit-mode-toggle"
            >
              {viewMode === 'edit' ? '预览' : '编辑'}
            </Button>
          </Tooltip>

          {/* 目录切换 */}
          <Tooltip title={`${showOutline ? '隐藏' : '显示'}目录`}>
            <Button
              type={showOutline ? 'primary' : 'text'}
              icon={<BookOutlined />}
              onClick={onOutlineToggle}
              className="toolbar-button"
            />
          </Tooltip>

          {/* 紧凑模式切换 */}
          <Tooltip title={`${isCompactMode ? '正常' : '紧凑'}模式`}>
            <Button
              type="text"
              icon={isCompactMode ? <ExpandOutlined /> : <CompressOutlined />}
              onClick={onCompactModeToggle}
              className="toolbar-button"
            />
          </Tooltip>
        </Space>
      </div>

      {/* 中间标题区 */}
      {showTitle && (title || subtitle) && (
        <div className="toolbar-section toolbar-center">
          <div className="toolbar-title">
            <div className="title-icon">📄</div>
            <div className="title-content">
              {title && <div className="title-text" title={title}>{title}</div>}
              {subtitle && <div className="subtitle-text" title={subtitle}>{subtitle}</div>}
            </div>
          </div>
        </div>
      )}

      {/* 右侧操作组 */}
      <div className="toolbar-section toolbar-right">
        <Space size="small">
          {/* 字体大小控制 */}
          <div className="font-control-wrapper">
            <FontSizeControl
              fontSize={fontSize}
              onFontSizeChange={onFontSizeChange}
            />
          </div>

          {/* 主题切换 */}
          <Dropdown 
            menu={{ items: themeMenuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Tooltip title="主题设置">
              <Button
                type="text"
                icon={<BgColorsOutlined />}
                className="toolbar-button"
              />
            </Tooltip>
          </Dropdown>

          {/* 更多操作 */}
          <Dropdown 
            menu={{ items: moreMenuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Tooltip title="更多操作">
              <Button
                type="text"
                icon={<SettingOutlined />}
                className="toolbar-button"
              />
            </Tooltip>
          </Dropdown>

          {/* 关闭按钮 */}
          <Tooltip title="关闭全屏预览 (ESC)">
            <Button
              type="text"
              danger
              icon={<CloseOutlined />}
              onClick={onClose}
              className="toolbar-button close-button"
              data-testid="close-button"
            />
          </Tooltip>
        </Space>
      </div>

      {/* 快捷键提示 (3秒后自动消失) */}
      {autoHide && (
        <div className="shortcut-hint">
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Ctrl+H: 切换工具栏 | Ctrl+E: 编辑模式 | Ctrl+B: 侧边栏 | ESC: 退出
          </Text>
        </div>
      )}
    </div>
  );
};

export default FullscreenToolbar;