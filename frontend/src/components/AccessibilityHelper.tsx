// Phase 4: 无障碍辅助功能组件 - 增强键盘导航和屏幕阅读器支持
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Button, Modal, Card, List, Tooltip, message, Space } from 'antd';
import { 
  QuestionCircleOutlined,
  SoundOutlined,
  EyeOutlined,
  SettingOutlined,
  CloseOutlined
} from '@ant-design/icons';
import useKeyboardShortcuts, { KeyboardShortcut } from '../hooks/useKeyboardShortcuts';

// 无障碍配置接口
interface AccessibilityConfig {
  enableKeyboardNavigation: boolean;
  enableVoiceAnnouncements: boolean;
  enableHighContrast: boolean;
  enableReducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  focusIndicatorStyle: 'default' | 'enhanced' | 'high-contrast';
}

// 焦点管理 Hook
export const useFocusManagement = () => {
  const focusHistoryRef = useRef<HTMLElement[]>([]);
  const currentFocusRef = useRef<HTMLElement | null>(null);

  const pushFocus = useCallback((element: HTMLElement) => {
    if (currentFocusRef.current) {
      focusHistoryRef.current.push(currentFocusRef.current);
    }
    currentFocusRef.current = element;
    element.focus();
  }, []);

  const popFocus = useCallback(() => {
    const previousElement = focusHistoryRef.current.pop();
    if (previousElement) {
      currentFocusRef.current = previousElement;
      previousElement.focus();
    }
  }, []);

  const clearFocusHistory = useCallback(() => {
    focusHistoryRef.current = [];
    currentFocusRef.current = null;
  }, []);

  return { pushFocus, popFocus, clearFocusHistory };
};

// 语音播报服务
class VoiceAnnouncementService {
  private synth: SpeechSynthesis | null = null;
  private enabled: boolean = true;

  constructor() {
    if ('speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  announce(text: string, priority: 'low' | 'medium' | 'high' = 'medium') {
    if (!this.enabled || !this.synth || !text.trim()) return;

    // 取消当前播报（如果优先级更高）
    if (priority === 'high') {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.8;
    utterance.volume = 0.7;

    // 根据优先级设置语音特性
    switch (priority) {
      case 'high':
        utterance.rate = 0.9;
        utterance.volume = 0.9;
        break;
      case 'low':
        utterance.rate = 0.7;
        utterance.volume = 0.5;
        break;
    }

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const voiceAnnouncer = new VoiceAnnouncementService();

// 主要的无障碍辅助组件
interface AccessibilityHelperProps {
  shortcuts?: KeyboardShortcut[];
  onConfigChange?: (config: AccessibilityConfig) => void;
}

const AccessibilityHelper: React.FC<AccessibilityHelperProps> = ({
  shortcuts = [],
  onConfigChange
}) => {
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);
  const [config, setConfig] = useState<AccessibilityConfig>({
    enableKeyboardNavigation: true,
    enableVoiceAnnouncements: true,
    enableHighContrast: false,
    enableReducedMotion: false,
    fontSize: 'medium',
    focusIndicatorStyle: 'default'
  });

  const { pushFocus, popFocus } = useFocusManagement();

  // 无障碍快捷键配置
  const accessibilityShortcuts: KeyboardShortcut[] = [
    {
      key: '?',
      shiftKey: true,
      action: () => setIsHelpModalVisible(true),
      description: '显示快捷键帮助',
      category: '无障碍'
    },
    {
      key: 'h',
      altKey: true,
      action: () => {
        document.querySelector('h1, h2, h3')?.focus();
        voiceAnnouncer.announce('跳转到主标题', 'medium');
      },
      description: '跳转到主标题',
      category: '无障碍'
    },
    {
      key: 'm',
      altKey: true,
      action: () => {
        const mainContent = document.querySelector('main, [role="main"]') as HTMLElement;
        if (mainContent) {
          mainContent.focus();
          voiceAnnouncer.announce('跳转到主内容区域', 'medium');
        }
      },
      description: '跳转到主内容',
      category: '无障碍'
    },
    {
      key: 'n',
      altKey: true,
      action: () => {
        const nav = document.querySelector('nav, [role="navigation"]') as HTMLElement;
        if (nav) {
          nav.focus();
          voiceAnnouncer.announce('跳转到导航区域', 'medium');
        }
      },
      description: '跳转到导航',
      category: '无障碍'
    },
    {
      key: 'v',
      altKey: true,
      action: () => {
        setConfig(prev => {
          const newConfig = {
            ...prev,
            enableVoiceAnnouncements: !prev.enableVoiceAnnouncements
          };
          voiceAnnouncer.setEnabled(newConfig.enableVoiceAnnouncements);
          if (newConfig.enableVoiceAnnouncements) {
            voiceAnnouncer.announce('语音播报已开启', 'high');
          }
          onConfigChange?.(newConfig);
          return newConfig;
        });
      },
      description: '切换语音播报',
      category: '无障碍'
    },
    {
      key: 'c',
      altKey: true,
      action: () => {
        setConfig(prev => {
          const newConfig = {
            ...prev,
            enableHighContrast: !prev.enableHighContrast
          };
          voiceAnnouncer.announce(
            newConfig.enableHighContrast ? '高对比度已开启' : '高对比度已关闭',
            'medium'
          );
          onConfigChange?.(newConfig);
          return newConfig;
        });
      },
      description: '切换高对比度模式',
      category: '无障碍'
    }
  ];

  const allShortcuts = [...shortcuts, ...accessibilityShortcuts];

  // 注册快捷键
  useKeyboardShortcuts(allShortcuts, {
    enabled: config.enableKeyboardNavigation
  });

  // 应用无障碍配置到DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // 应用字体大小
    root.style.setProperty('--accessibility-font-scale', {
      small: '0.875',
      medium: '1',
      large: '1.125'
    }[config.fontSize]);

    // 应用高对比度
    if (config.enableHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // 应用减少动画
    if (config.enableReducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // 应用焦点指示器样式
    root.classList.remove('focus-default', 'focus-enhanced', 'focus-high-contrast');
    root.classList.add(`focus-${config.focusIndicatorStyle}`);

  }, [config]);

  // 键盘导航增强
  useEffect(() => {
    if (!config.enableKeyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab陷阱实现（用于模态框等）
      if (e.key === 'Tab') {
        const activeElement = document.activeElement;
        const modal = activeElement?.closest('.ant-modal');
        
        if (modal) {
          const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
            
            if (e.shiftKey && activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            } else if (!e.shiftKey && activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      }

      // Escape键关闭模态框
      if (e.key === 'Escape' && isHelpModalVisible) {
        setIsHelpModalVisible(false);
        popFocus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [config.enableKeyboardNavigation, isHelpModalVisible, popFocus]);

  // 语音播报配置
  useEffect(() => {
    voiceAnnouncer.setEnabled(config.enableVoiceAnnouncements);
  }, [config.enableVoiceAnnouncements]);

  const handleShowHelp = useCallback(() => {
    setIsHelpModalVisible(true);
    voiceAnnouncer.announce('快捷键帮助对话框已打开', 'medium');
  }, []);

  const handleCloseHelp = useCallback(() => {
    setIsHelpModalVisible(false);
    voiceAnnouncer.announce('快捷键帮助对话框已关闭', 'medium');
  }, []);

  const groupedShortcuts = allShortcuts.reduce((groups, shortcut) => {
    const category = shortcut.category || '通用';
    if (!groups[category]) groups[category] = [];
    groups[category].push(shortcut);
    return groups;
  }, {} as Record<string, KeyboardShortcut[]>);

  const formatShortcut = (shortcut: KeyboardShortcut): string => {
    const parts: string[] = [];
    if (shortcut.metaKey) parts.push('⌘/Ctrl');
    if (shortcut.ctrlKey && !shortcut.metaKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  return (
    <>
      {/* 无障碍辅助按钮 */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <Tooltip title="快捷键帮助 (Shift + ?)">
          <Button
            type="primary"
            shape="circle"
            icon={<QuestionCircleOutlined />}
            onClick={handleShowHelp}
            aria-label="显示快捷键帮助"
            size="large"
            style={{
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          />
        </Tooltip>

        <Tooltip title={`语音播报: ${config.enableVoiceAnnouncements ? '开启' : '关闭'}`}>
          <Button
            type={config.enableVoiceAnnouncements ? 'primary' : 'default'}
            shape="circle"
            icon={<SoundOutlined />}
            onClick={() => {
              setConfig(prev => {
                const newConfig = {
                  ...prev,
                  enableVoiceAnnouncements: !prev.enableVoiceAnnouncements
                };
                voiceAnnouncer.setEnabled(newConfig.enableVoiceAnnouncements);
                if (newConfig.enableVoiceAnnouncements) {
                  voiceAnnouncer.announce('语音播报已开启', 'high');
                }
                return newConfig;
              });
            }}
            aria-label="切换语音播报"
            size="large"
            style={{
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
            }}
          />
        </Tooltip>
      </div>

      {/* 快捷键帮助模态框 */}
      <Modal
        title={
          <Space>
            <SettingOutlined />
            <span>快捷键帮助</span>
          </Space>
        }
        open={isHelpModalVisible}
        onCancel={handleCloseHelp}
        footer={[
          <Button key="close" type="primary" onClick={handleCloseHelp}>
            关闭 (Esc)
          </Button>
        ]}
        width={800}
        styles={{
          body: { maxHeight: '60vh', overflow: 'auto' }
        }}
        destroyOnClose
        aria-label="快捷键帮助对话框"
      >
        <div style={{ marginBottom: '16px', color: '#666' }}>
          使用以下快捷键可以快速操作系统功能。按 Shift + ? 可以随时打开此帮助。
        </div>

        {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
          <Card
            key={category}
            title={category}
            size="small"
            style={{ marginBottom: '16px' }}
          >
            <List
              size="small"
              dataSource={shortcuts}
              renderItem={(shortcut) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{shortcut.description}</span>
                        <code
                          style={{
                            background: '#f5f5f5',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        >
                          {formatShortcut(shortcut)}
                        </code>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        ))}

        <Card title="无障碍功能" size="small">
          <List size="small">
            <List.Item>
              <List.Item.Meta
                title="屏幕阅读器支持"
                description="支持NVDA、JAWS等屏幕阅读器，提供语义化的HTML结构和ARIA标签"
              />
            </List.Item>
            <List.Item>
              <List.Item.Meta
                title="键盘导航"
                description="完整的键盘导航支持，Tab键遍历、Enter键激活、Escape键取消"
              />
            </List.Item>
            <List.Item>
              <List.Item.Meta
                title="语音播报"
                description="重要操作和状态变化的语音提示，可通过 Alt + V 切换"
              />
            </List.Item>
            <List.Item>
              <List.Item.Meta
                title="高对比度"
                description="视觉障碍友好的高对比度模式，可通过 Alt + C 切换"
              />
            </List.Item>
          </List>
        </Card>
      </Modal>

      {/* 无障碍样式 */}
      <style jsx global>{`
        /* 高对比度模式 */
        .high-contrast {
          --primary-color: #000;
          --background-color: #fff;
          --text-color: #000;
          --border-color: #000;
        }

        .high-contrast .ant-btn-primary {
          background: #000 !important;
          border-color: #000 !important;
          color: #fff !important;
        }

        .high-contrast .ant-card {
          border: 2px solid #000 !important;
          background: #fff !important;
        }

        /* 减少动画模式 */
        .reduced-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }

        /* 焦点指示器样式 */
        .focus-enhanced *:focus {
          outline: 3px solid #1890ff !important;
          outline-offset: 2px !important;
        }

        .focus-high-contrast *:focus {
          outline: 4px solid #000 !important;
          outline-offset: 3px !important;
          background: #ffff00 !important;
        }

        /* 字体缩放 */
        body {
          font-size: calc(14px * var(--accessibility-font-scale, 1));
        }

        /* Skip links for screen readers */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .sr-only:focus {
          position: static;
          width: auto;
          height: auto;
          padding: 8px 16px;
          margin: 0;
          overflow: visible;
          clip: auto;
          white-space: normal;
          background: #000;
          color: #fff;
          z-index: 9999;
        }
      `}</style>
    </>
  );
};

export default AccessibilityHelper;