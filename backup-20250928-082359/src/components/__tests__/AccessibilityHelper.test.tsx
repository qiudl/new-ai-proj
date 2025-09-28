// Phase 5: 测试优化 - AccessibilityHelper组件单元测试
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccessibilityHelper, { voiceAnnouncer, useFocusManagement } from '../AccessibilityHelper';

// Mock speechSynthesis API
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn().mockReturnValue([])
};

Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: mockSpeechSynthesis
});

// Mock antd components
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  }
}));

// 模拟快捷键数据
const mockShortcuts = [
  {
    key: 's',
    metaKey: true,
    action: jest.fn(),
    description: '保存',
    category: '编辑'
  },
  {
    key: 'h',
    altKey: true,
    action: jest.fn(),
    description: '帮助',
    category: '导航'
  }
];

describe('AccessibilityHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 重置语音播报服务
    voiceAnnouncer.setEnabled(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('基本渲染', () => {
    it('应该渲染无障碍辅助按钮', () => {
      render(<AccessibilityHelper shortcuts={mockShortcuts} />);
      
      // 检查帮助按钮
      expect(screen.getByLabelText('显示快捷键帮助')).toBeInTheDocument();
      
      // 检查语音播报按钮
      expect(screen.getByLabelText('切换语音播报')).toBeInTheDocument();
    });

    it('无障碍按钮应该有正确的位置', () => {
      const { container } = render(<AccessibilityHelper />);
      
      const buttonContainer = container.querySelector('[style*="position: fixed"]');
      expect(buttonContainer).toHaveStyle({
        position: 'fixed',
        bottom: '20px',
        right: '20px'
      });
    });
  });

  describe('快捷键帮助模态框', () => {
    it('点击帮助按钮应该打开帮助模态框', async () => {
      const user = userEvent.setup();
      render(<AccessibilityHelper shortcuts={mockShortcuts} />);
      
      const helpButton = screen.getByLabelText('显示快捷键帮助');
      await user.click(helpButton);
      
      await waitFor(() => {
        expect(screen.getByText('快捷键帮助')).toBeInTheDocument();
      });
    });

    it('帮助模态框应该显示快捷键列表', async () => {
      const user = userEvent.setup();
      render(<AccessibilityHelper shortcuts={mockShortcuts} />);
      
      const helpButton = screen.getByLabelText('显示快捷键帮助');
      await user.click(helpButton);
      
      await waitFor(() => {
        expect(screen.getByText('保存')).toBeInTheDocument();
        expect(screen.getByText('帮助')).toBeInTheDocument();
        expect(screen.getByText('⌘/Ctrl + S')).toBeInTheDocument();
        expect(screen.getByText('Alt + H')).toBeInTheDocument();
      });
    });

    it('应该按类别分组显示快捷键', async () => {
      const user = userEvent.setup();
      render(<AccessibilityHelper shortcuts={mockShortcuts} />);
      
      const helpButton = screen.getByLabelText('显示快捷键帮助');
      await user.click(helpButton);
      
      await waitFor(() => {
        expect(screen.getByText('编辑')).toBeInTheDocument();
        expect(screen.getByText('导航')).toBeInTheDocument();
        expect(screen.getByText('无障碍')).toBeInTheDocument();
      });
    });

    it('按ESC键应该关闭帮助模态框', async () => {
      const user = userEvent.setup();
      render(<AccessibilityHelper shortcuts={mockShortcuts} />);
      
      const helpButton = screen.getByLabelText('显示快捷键帮助');
      await user.click(helpButton);
      
      await waitFor(() => {
        expect(screen.getByText('快捷键帮助')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByText('快捷键帮助')).not.toBeInTheDocument();
      });
    });
  });

  describe('语音播报功能', () => {
    it('点击语音播报按钮应该切换语音状态', async () => {
      const user = userEvent.setup();
      render(<AccessibilityHelper />);
      
      const voiceButton = screen.getByLabelText('切换语音播报');
      await user.click(voiceButton);
      
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('语音播报按钮状态应该反映当前设置', () => {
      render(<AccessibilityHelper />);
      
      const voiceButton = screen.getByLabelText('切换语音播报');
      expect(voiceButton).toHaveClass('ant-btn-primary');
    });

    it('VoiceAnnouncementService应该正确工作', () => {
      voiceAnnouncer.announce('测试消息', 'medium');
      
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      
      const call = mockSpeechSynthesis.speak.mock.calls[0];
      const utterance = call[0];
      expect(utterance.text).toBe('测试消息');
    });

    it('禁用语音播报时不应该播放', () => {
      voiceAnnouncer.setEnabled(false);
      voiceAnnouncer.announce('测试消息', 'medium');
      
      expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
    });

    it('高优先级消息应该取消当前播报', () => {
      voiceAnnouncer.announce('低优先级消息', 'low');
      voiceAnnouncer.announce('高优先级消息', 'high');
      
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });
  });

  describe('键盘导航', () => {
    it('应该注册无障碍相关的快捷键', () => {
      render(<AccessibilityHelper shortcuts={mockShortcuts} />);
      
      // 测试Shift + ?打开帮助
      fireEvent.keyDown(document, { key: '?', shiftKey: true });
      
      expect(screen.getByText('快捷键帮助')).toBeInTheDocument();
    });

    it('Alt + V应该切换语音播报', () => {
      render(<AccessibilityHelper />);
      
      fireEvent.keyDown(document, { key: 'v', altKey: true });
      
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('Alt + H应该跳转到主标题', () => {
      // 创建一个标题元素
      const heading = document.createElement('h1');
      heading.textContent = '主标题';
      heading.focus = jest.fn();
      document.body.appendChild(heading);
      
      render(<AccessibilityHelper />);
      
      fireEvent.keyDown(document, { key: 'h', altKey: true });
      
      expect(heading.focus).toHaveBeenCalled();
      
      document.body.removeChild(heading);
    });

    it('Tab键在模态框中应该被正确处理', () => {
      const user = userEvent.setup();
      render(<AccessibilityHelper shortcuts={mockShortcuts} />);
      
      // 打开帮助模态框
      const helpButton = screen.getByLabelText('显示快捷键帮助');
      fireEvent.click(helpButton);
      
      // 模拟Tab键导航
      fireEvent.keyDown(document, { key: 'Tab' });
      
      // 验证焦点管理逻辑（此处主要验证不会抛错）
      expect(screen.getByText('快捷键帮助')).toBeInTheDocument();
    });
  });

  describe('配置管理', () => {
    it('配置变化应该触发回调', async () => {
      const onConfigChange = jest.fn();
      const user = userEvent.setup();
      
      render(<AccessibilityHelper onConfigChange={onConfigChange} />);
      
      const voiceButton = screen.getByLabelText('切换语音播报');
      await user.click(voiceButton);
      
      expect(onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          enableVoiceAnnouncements: expect.any(Boolean)
        })
      );
    });

    it('配置应该应用到DOM元素', () => {
      render(<AccessibilityHelper />);
      
      // 验证CSS类被正确应用
      expect(document.documentElement).toHaveClass('focus-default');
    });

    it('高对比度模式应该正确应用', () => {
      render(<AccessibilityHelper />);
      
      fireEvent.keyDown(document, { key: 'c', altKey: true });
      
      expect(document.documentElement).toHaveClass('high-contrast');
    });
  });

  describe('useFocusManagement Hook', () => {
    const TestComponent = () => {
      const { pushFocus, popFocus, clearFocusHistory } = useFocusManagement();
      
      return (
        <div>
          <button id="btn1" onClick={() => {
            const element = document.getElementById('btn2') as HTMLElement;
            pushFocus(element);
          }}>
            Push Focus
          </button>
          <button id="btn2">Target Button</button>
          <button onClick={popFocus}>Pop Focus</button>
          <button onClick={clearFocusHistory}>Clear History</button>
        </div>
      );
    };

    it('pushFocus应该正确设置焦点', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);
      
      const btn2 = document.getElementById('btn2');
      btn2!.focus = jest.fn();
      
      const pushButton = screen.getByText('Push Focus');
      await user.click(pushButton);
      
      expect(btn2!.focus).toHaveBeenCalled();
    });

    it('popFocus应该返回到之前的焦点', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);
      
      const btn1 = document.getElementById('btn1');
      const btn2 = document.getElementById('btn2');
      
      btn1!.focus = jest.fn();
      btn2!.focus = jest.fn();
      
      // 先设置焦点
      await user.click(screen.getByText('Push Focus'));
      
      // 然后弹出焦点
      await user.click(screen.getByText('Pop Focus'));
      
      expect(btn1!.focus).toHaveBeenCalled();
    });
  });

  describe('可访问性', () => {
    it('所有按钮应该有正确的ARIA标签', () => {
      render(<AccessibilityHelper />);
      
      expect(screen.getByLabelText('显示快捷键帮助')).toBeInTheDocument();
      expect(screen.getByLabelText('切换语音播报')).toBeInTheDocument();
    });

    it('模态框应该有正确的角色', async () => {
      const user = userEvent.setup();
      render(<AccessibilityHelper shortcuts={mockShortcuts} />);
      
      const helpButton = screen.getByLabelText('显示快捷键帮助');
      await user.click(helpButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText('快捷键帮助对话框')).toBeInTheDocument();
      });
    });

    it('快捷键描述应该包含无障碍功能说明', async () => {
      const user = userEvent.setup();
      render(<AccessibilityHelper />);
      
      const helpButton = screen.getByLabelText('显示快捷键帮助');
      await user.click(helpButton);
      
      await waitFor(() => {
        expect(screen.getByText('屏幕阅读器支持')).toBeInTheDocument();
        expect(screen.getByText('键盘导航')).toBeInTheDocument();
        expect(screen.getByText('语音播报')).toBeInTheDocument();
        expect(screen.getByText('高对比度')).toBeInTheDocument();
      });
    });
  });

  describe('响应式设计', () => {
    it('按钮应该在移动设备上保持可访问', () => {
      const { container } = render(<AccessibilityHelper />);
      
      const buttonContainer = container.querySelector('[style*="position: fixed"]');
      expect(buttonContainer).toHaveStyle({
        display: 'flex',
        flexDirection: 'column'
      });
    });
  });

  describe('错误处理', () => {
    it('当speechSynthesis不可用时应该优雅处理', () => {
      // 临时移除speechSynthesis
      const originalSpeechSynthesis = window.speechSynthesis;
      delete (window as any).speechSynthesis;
      
      expect(() => {
        voiceAnnouncer.announce('测试消息');
      }).not.toThrow();
      
      // 恢复speechSynthesis
      window.speechSynthesis = originalSpeechSynthesis;
    });

    it('无效的快捷键配置应该不会导致崩溃', () => {
      const invalidShortcuts = [
        { key: '', description: '', action: jest.fn() }
      ];
      
      expect(() => {
        render(<AccessibilityHelper shortcuts={invalidShortcuts as any} />);
      }).not.toThrow();
    });
  });
});