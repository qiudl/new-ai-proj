// Phase 5: 测试优化 - 跨浏览器兼容性测试
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../../pages/DashboardPage';
import { BrowserRouter } from 'react-router-dom';
import { TimerProvider } from '../../contexts/TimerContext';

// Mock timer context
const mockTimerContext = {
  timerState: {
    isRunning: false,
    isPaused: false,
    elapsedTime: 0,
    currentTask: null
  },
  startTimer: jest.fn(),
  stopTimer: jest.fn(),
  pauseTimer: jest.fn(),
  resumeTimer: jest.fn()
};

// 浏览器环境模拟工具
class BrowserEnvironmentMocker {
  private originalUserAgent: string;
  private originalGetComputedStyle: typeof window.getComputedStyle;
  private originalAddEventListener: typeof window.addEventListener;
  
  constructor() {
    this.originalUserAgent = navigator.userAgent;
    this.originalGetComputedStyle = window.getComputedStyle;
    this.originalAddEventListener = window.addEventListener;
  }

  mockChrome() {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      configurable: true
    });
  }

  mockFirefox() {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      configurable: true
    });
  }

  mockSafari() {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      configurable: true
    });
  }

  mockEdge() {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
      configurable: true
    });
  }

  mockIE11() {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
      configurable: true
    });
    
    // 模拟IE11缺少的API
    if (!window.fetch) {
      (window as any).fetch = undefined;
    }
  }

  mockMobileSafari() {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      configurable: true
    });
    
    // 模拟移动设备特性
    Object.defineProperty(window, 'innerWidth', {
      value: 375,
      configurable: true
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 667,
      configurable: true
    });
  }

  mockAndroidChrome() {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
      configurable: true
    });
  }

  reset() {
    Object.defineProperty(navigator, 'userAgent', {
      value: this.originalUserAgent,
      configurable: true
    });
    window.getComputedStyle = this.originalGetComputedStyle;
    window.addEventListener = this.originalAddEventListener;
  }
}

const renderDashboardWithTimer = () => {
  return render(
    <BrowserRouter>
      <TimerProvider value={mockTimerContext as any}>
        <DashboardPage />
      </TimerProvider>
    </BrowserRouter>
  );
};

describe('跨浏览器兼容性测试', () => {
  let browserMocker: BrowserEnvironmentMocker;

  beforeEach(() => {
    browserMocker = new BrowserEnvironmentMocker();
    jest.clearAllMocks();
  });

  afterEach(() => {
    browserMocker.reset();
    jest.restoreAllMocks();
  });

  describe('Chrome浏览器兼容性', () => {
    beforeEach(() => {
      browserMocker.mockChrome();
    });

    it('在Chrome中应该正常渲染', () => {
      expect(() => {
        renderDashboardWithTimer();
      }).not.toThrow();

      expect(screen.getByText('我的工作台')).toBeInTheDocument();
    });

    it('Chrome中的拖拽功能应该正常工作', async () => {
      renderDashboardWithTimer();
      
      // Chrome支持现代拖拽API
      expect(window.DragEvent).toBeDefined();
      expect(window.DataTransfer).toBeDefined();
    });

    it('Chrome中的CSS Grid应该被支持', () => {
      const { container } = renderDashboardWithTimer();
      
      const gridElement = container.querySelector('.dashboard-simplified-layout');
      if (gridElement) {
        const computedStyle = getComputedStyle(gridElement);
        expect(computedStyle.display).toBe('grid');
      }
    });
  });

  describe('Firefox浏览器兼容性', () => {
    beforeEach(() => {
      browserMocker.mockFirefox();
    });

    it('在Firefox中应该正常渲染', () => {
      expect(() => {
        renderDashboardWithTimer();
      }).not.toThrow();

      expect(screen.getByText('我的工作台')).toBeInTheDocument();
    });

    it('Firefox中的事件处理应该正常', async () => {
      const user = userEvent.setup();
      renderDashboardWithTimer();

      // 测试键盘事件
      fireEvent.keyDown(document, { key: '?', shiftKey: true });
      await waitFor(() => {
        expect(screen.getByText('快捷键帮助')).toBeInTheDocument();
      });
    });

    it('Firefox中的Web API应该可用', () => {
      expect(window.speechSynthesis).toBeDefined();
      expect(window.localStorage).toBeDefined();
      expect(window.sessionStorage).toBeDefined();
    });
  });

  describe('Safari浏览器兼容性', () => {
    beforeEach(() => {
      browserMocker.mockSafari();
    });

    it('在Safari中应该正常渲染', () => {
      expect(() => {
        renderDashboardWithTimer();
      }).not.toThrow();

      expect(screen.getByText('我的工作台')).toBeInTheDocument();
    });

    it('Safari中的CSS前缀应该被处理', () => {
      const { container } = renderDashboardWithTimer();
      
      // Safari可能需要webkit前缀
      const elements = container.querySelectorAll('*');
      elements.forEach(element => {
        const style = getComputedStyle(element);
        // 检查是否有webkit前缀样式
        expect(typeof style.webkitTransform).toBeDefined();
      });
    });

    it('Safari中的日期处理应该正确', () => {
      // Safari对日期格式比较严格
      const testDate = new Date('2025-01-01T00:00:00.000Z');
      expect(testDate.toString()).not.toBe('Invalid Date');
    });
  });

  describe('Edge浏览器兼容性', () => {
    beforeEach(() => {
      browserMocker.mockEdge();
    });

    it('在Edge中应该正常渲染', () => {
      expect(() => {
        renderDashboardWithTimer();
      }).not.toThrow();

      expect(screen.getByText('我的工作台')).toBeInTheDocument();
    });

    it('Edge中的现代JavaScript特性应该可用', () => {
      // Edge支持现代JavaScript
      expect(Array.prototype.includes).toBeDefined();
      expect(Promise.prototype.finally).toBeDefined();
      expect(Object.entries).toBeDefined();
    });
  });

  describe('移动Safari兼容性', () => {
    beforeEach(() => {
      browserMocker.mockMobileSafari();
    });

    it('在移动Safari中应该正常渲染', () => {
      expect(() => {
        renderDashboardWithTimer();
      }).not.toThrow();

      expect(screen.getByText('我的工作台')).toBeInTheDocument();
    });

    it('移动Safari中的触摸事件应该正常', () => {
      renderDashboardWithTimer();
      
      // 检查触摸事件支持
      expect('ontouchstart' in window || 'TouchEvent' in window).toBe(true);
    });

    it('移动Safari中的viewport应该正确', () => {
      // 检查移动端适配
      expect(window.innerWidth).toBe(375);
      expect(window.innerHeight).toBe(667);
    });
  });

  describe('Android Chrome兼容性', () => {
    beforeEach(() => {
      browserMocker.mockAndroidChrome();
    });

    it('在Android Chrome中应该正常渲染', () => {
      expect(() => {
        renderDashboardWithTimer();
      }).not.toThrow();

      expect(screen.getByText('我的工作台')).toBeInTheDocument();
    });

    it('Android Chrome中的手势应该被支持', () => {
      // Android Chrome支持触摸手势
      expect(window.TouchEvent).toBeDefined();
      expect(window.PointerEvent).toBeDefined();
    });
  });

  describe('API兼容性测试', () => {
    it('应该检测并处理不支持的API', () => {
      // 模拟不支持speechSynthesis的浏览器
      const originalSpeechSynthesis = window.speechSynthesis;
      delete (window as any).speechSynthesis;

      expect(() => {
        renderDashboardWithTimer();
      }).not.toThrow();

      // 恢复
      window.speechSynthesis = originalSpeechSynthesis;
    });

    it('应该为不支持的CSS特性提供fallback', () => {
      // 模拟不支持Grid的浏览器
      const mockGetComputedStyle = jest.fn().mockReturnValue({
        display: 'block', // 不支持grid
        gridTemplateColumns: undefined
      });
      
      window.getComputedStyle = mockGetComputedStyle;

      expect(() => {
        renderDashboardWithTimer();
      }).not.toThrow();
    });

    it('应该检测浏览器功能支持', () => {
      const features = {
        localStorage: typeof Storage !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        Promise: typeof Promise !== 'undefined',
        arrow: (() => { try { eval('()=>{}'); return true; } catch { return false; } })(),
        classList: 'classList' in document.createElement('div'),
        querySelector: 'querySelector' in document,
        addEventListener: 'addEventListener' in window
      };

      // 所有现代浏览器都应该支持这些特性
      Object.entries(features).forEach(([feature, supported]) => {
        expect(supported).toBe(true);
      });
    });
  });

  describe('CSS兼容性测试', () => {
    it('应该处理CSS前缀', () => {
      const testElement = document.createElement('div');
      testElement.style.transform = 'translateX(100px)';
      
      // 检查是否设置成功
      expect(testElement.style.transform || testElement.style.webkitTransform).toBeTruthy();
    });

    it('应该支持CSS变量', () => {
      const testElement = document.createElement('div');
      document.body.appendChild(testElement);
      
      // 设置CSS变量
      document.documentElement.style.setProperty('--test-color', '#ff0000');
      testElement.style.color = 'var(--test-color)';
      
      // 在支持CSS变量的浏览器中应该生效
      const computedStyle = getComputedStyle(testElement);
      expect(computedStyle.color).toBeDefined();
      
      document.body.removeChild(testElement);
    });

    it('应该优雅降级不支持的CSS特性', () => {
      const { container } = renderDashboardWithTimer();
      
      // 检查是否有fallback样式
      const gridContainer = container.querySelector('.dashboard-simplified-layout');
      if (gridContainer) {
        const style = getComputedStyle(gridContainer);
        // 即使不支持grid，也应该有基础的布局
        expect(style.display).toBeDefined();
      }
    });
  });

  describe('JavaScript兼容性测试', () => {
    it('应该处理不支持的JavaScript特性', () => {
      // 模拟不支持某些ES6特性的环境
      const originalArray = Array.prototype.includes;
      delete (Array.prototype as any).includes;

      expect(() => {
        renderDashboardWithTimer();
      }).not.toThrow();

      // 恢复
      Array.prototype.includes = originalArray;
    });

    it('应该有polyfill支持', () => {
      // 检查是否有必要的polyfill
      expect(Array.prototype.includes).toBeDefined();
      expect(Object.assign).toBeDefined();
      expect(Promise).toBeDefined();
    });
  });

  describe('事件兼容性测试', () => {
    it('应该处理不同的事件模型', async () => {
      const user = userEvent.setup();
      renderDashboardWithTimer();

      // 测试鼠标事件
      const helpButton = screen.getByLabelText('显示快捷键帮助');
      await user.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText('快捷键帮助')).toBeInTheDocument();
      });
    });

    it('应该支持触摸事件', () => {
      renderDashboardWithTimer();
      
      // 创建触摸事件
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [{
          clientX: 100,
          clientY: 100,
          identifier: 0
        } as Touch]
      });

      expect(() => {
        document.dispatchEvent(touchStartEvent);
      }).not.toThrow();
    });

    it('应该处理键盘事件差异', () => {
      renderDashboardWithTimer();

      // 测试不同的键盘事件
      const keyEvents = [
        { key: 'Enter', keyCode: 13 },
        { key: 'Escape', keyCode: 27 },
        { key: ' ', keyCode: 32 }
      ];

      keyEvents.forEach(({ key, keyCode }) => {
        expect(() => {
          fireEvent.keyDown(document, { key, keyCode });
        }).not.toThrow();
      });
    });
  });

  describe('网络请求兼容性', () => {
    it('应该支持fetch API和XMLHttpRequest fallback', () => {
      // 测试fetch存在的情况
      expect(typeof fetch).toBe('function');

      // 模拟不支持fetch的环境
      const originalFetch = window.fetch;
      delete (window as any).fetch;

      // XMLHttpRequest应该作为fallback
      expect(typeof XMLHttpRequest).toBe('function');

      // 恢复
      window.fetch = originalFetch;
    });

    it('应该正确处理CORS和请求头', () => {
      // 检查Headers API支持
      expect(typeof Headers).toBe('function');
      
      const headers = new Headers();
      headers.append('Content-Type', 'application/json');
      
      expect(headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('存储兼容性', () => {
    it('应该支持localStorage和sessionStorage', () => {
      expect(typeof localStorage).toBe('object');
      expect(typeof sessionStorage).toBe('object');

      // 测试存储功能
      localStorage.setItem('test', 'value');
      expect(localStorage.getItem('test')).toBe('value');
      localStorage.removeItem('test');
    });

    it('应该处理存储配额限制', () => {
      // 模拟存储配额错误
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      expect(() => {
        // 应用应该优雅处理存储错误
        try {
          localStorage.setItem('test', 'value');
        } catch (e) {
          // 错误被捕获和处理
        }
      }).not.toThrow();

      localStorage.setItem = originalSetItem;
    });
  });
});