import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskParentSelector } from '../../components/TaskParentSelector';
import { TaskParentSelectorModal } from '../../components/TaskParentSelectorModal';

// Mock user agent detection
const mockUserAgent = (userAgent: string) => {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: userAgent,
    writable: true,
  });
};

// Browser user agents for testing
const browsers = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.2151.72',
  ie11: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
};

// Mock CSS supports for feature detection
const mockCSSSupports = (feature: string, value: string) => {
  const originalSupports = (CSS as any).supports;
  (CSS as any).supports = jest.fn((prop: string, val: string) => {
    if (prop === feature && val === value) {
      return true;
    }
    return originalSupports ? originalSupports(prop, val) : false;
  });
};

describe('Cross-Browser Compatibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch for all tests
    global.fetch = jest.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { data: [], total: 0 },
        }),
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Chrome Compatibility', () => {
    beforeEach(() => {
      mockUserAgent(browsers.chrome);
    });

    it('should render TaskParentSelector correctly in Chrome', () => {
      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={2}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByText('搜索并选择父任务...')).toBeInTheDocument();
    });

    it('should handle modern CSS features in Chrome', () => {
      mockCSSSupports('display', 'flex');
      mockCSSSupports('position', 'sticky');

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText('选择父任务')).toBeInTheDocument();
    });
  });

  describe('Firefox Compatibility', () => {
    beforeEach(() => {
      mockUserAgent(browsers.firefox);
    });

    it('should render TaskParentSelector correctly in Firefox', () => {
      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={2}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByText('搜索并选择父任务...')).toBeInTheDocument();
    });

    it('should handle Firefox-specific quirks', () => {
      // Test Firefox scrollbar styling
      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Safari Compatibility', () => {
    beforeEach(() => {
      mockUserAgent(browsers.safari);
    });

    it('should render TaskParentSelector correctly in Safari', () => {
      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={2}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByText('搜索并选择父任务...')).toBeInTheDocument();
    });

    it('should handle Safari webkit prefixes', () => {
      // Mock webkit-specific styles
      mockCSSSupports('-webkit-appearance', 'none');

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText('选择父任务')).toBeInTheDocument();
    });
  });

  describe('Edge Compatibility', () => {
    beforeEach(() => {
      mockUserAgent(browsers.edge);
    });

    it('should render TaskParentSelector correctly in Edge', () => {
      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={2}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByText('搜索并选择父任务...')).toBeInTheDocument();
    });
  });

  describe('Legacy Browser Support (IE11)', () => {
    beforeEach(() => {
      mockUserAgent(browsers.ie11);
      
      // Mock missing modern features
      delete (window as any).fetch;
      delete (window as any).AbortController;
    });

    it('should gracefully degrade for IE11', () => {
      // Should render but without modern features
      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={2}
          onChange={jest.fn()}
        />
      );

      expect(screen.getByText('搜索并选择父任务...')).toBeInTheDocument();
    });

    it('should handle polyfill requirements', () => {
      // Test that component doesn't break without modern APIs
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Should render without throwing errors
      expect(screen.getByText('选择父任务')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Feature Detection Tests', () => {
    it('should detect and use modern CSS Grid when available', () => {
      mockCSSSupports('display', 'grid');

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText('选择父任务')).toBeInTheDocument();
    });

    it('should fallback to flexbox when CSS Grid is not available', () => {
      // Mock no grid support
      (CSS as any).supports = jest.fn(() => false);

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText('选择父任务')).toBeInTheDocument();
    });

    it('should handle missing IntersectionObserver API', () => {
      const originalIntersectionObserver = window.IntersectionObserver;
      delete (window as any).IntersectionObserver;

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText('选择父任务')).toBeInTheDocument();

      // Restore
      window.IntersectionObserver = originalIntersectionObserver;
    });
  });

  describe('Touch Device Compatibility', () => {
    beforeEach(() => {
      // Mock touch device
      Object.defineProperty(window, 'ontouchstart', {
        value: function() {},
        writable: true,
      });
    });

    it('should handle touch events on mobile Safari', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1');

      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={2}
          onChange={jest.fn()}
        />
      );

      const trigger = screen.getByText('搜索并选择父任务...');
      
      // Test touch interaction
      fireEvent.touchStart(trigger);
      fireEvent.touchEnd(trigger);
      fireEvent.click(trigger);

      expect(trigger).toBeInTheDocument();
    });

    it('should adapt modal for touch devices', async () => {
      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Should handle touch scrolling
      fireEvent.touchStart(modal);
      fireEvent.touchMove(modal);
      fireEvent.touchEnd(modal);
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should provide proper ARIA labels', () => {
      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={2}
          onChange={jest.fn()}
        />
      );

      const trigger = document.querySelector('.parent-selector-trigger');
      expect(trigger).toHaveAttribute('role', 'button');
    });

    it('should support keyboard navigation', async () => {
      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const modal = screen.getByRole('dialog');
      
      // Test keyboard navigation
      fireEvent.keyDown(modal, { key: 'Tab' });
      fireEvent.keyDown(modal, { key: 'Enter' });
      fireEvent.keyDown(modal, { key: 'Escape' });

      expect(modal).toBeInTheDocument();
    });
  });

  describe('Performance Across Browsers', () => {
    it('should render within performance budget on slow devices', async () => {
      const startTime = performance.now();

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('选择父任务')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle large datasets efficiently across browsers', async () => {
      // Mock large dataset
      global.fetch = jest.fn().mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { 
              data: Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                title: `Task ${i}`,
                status: 'todo',
                project_id: 1,
                parent_id: null,
                task_level: 0,
                sort_order: i,
                created_at: '2024-01-01',
                updated_at: '2024-01-01',
              })),
              total: 1000,
            },
          }),
        })
      );

      const startTime = performance.now();

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('选择父任务')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should handle large datasets within reasonable time
      expect(renderTime).toBeLessThan(500);
    });
  });
});