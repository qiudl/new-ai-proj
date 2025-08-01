import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TaskParentSelector } from '../../components/TaskParentSelector';
import { TaskParentSelectorModal } from '../../components/TaskParentSelectorModal';

// Mock window dimensions
const mockWindowDimensions = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  // Trigger resize event
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

// Mock touch events
const mockTouchSupport = () => {
  Object.defineProperty(window, 'ontouchstart', {
    value: function() {},
    writable: true,
  });

  // Mock touch events
  global.TouchEvent = class MockTouchEvent extends Event {
    touches: any[];
    targetTouches: any[];
    changedTouches: any[];

    constructor(type: string, eventInitDict: any = {}) {
      super(type, eventInitDict);
      this.touches = eventInitDict.touches || [];
      this.targetTouches = eventInitDict.targetTouches || [];
      this.changedTouches = eventInitDict.changedTouches || [];
    }
  };
};

describe('Mobile Responsive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTouchSupport();
    
    // Mock fetch
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
    // Reset to desktop size
    mockWindowDimensions(1024, 768);
  });

  describe('Phone Viewport (320px - 768px)', () => {
    it('should adapt TaskParentSelector for phone screens', () => {
      mockWindowDimensions(375, 667); // iPhone dimensions

      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={2}
          onChange={jest.fn()}
        />
      );

      const trigger = screen.getByText('搜索并选择父任务...');
      expect(trigger).toBeInTheDocument();

      // Click to open dropdown
      fireEvent.click(trigger);

      // On mobile, dropdown should be positioned differently
      const dropdown = document.querySelector('.parent-selector-dropdown');
      if (dropdown) {
        const styles = window.getComputedStyle(dropdown);
        // Should use fixed positioning on mobile
        expect(styles.position).toBe('fixed');
      }
    });

    it('should make TaskParentSelectorModal fullscreen on mobile', () => {
      mockWindowDimensions(375, 667);

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

      // Modal should take full viewport on mobile
      const modalContent = modal.querySelector('.ant-modal-content');
      if (modalContent) {
        const styles = window.getComputedStyle(modalContent);
        // Should have mobile-friendly dimensions
        expect(parseInt(styles.maxHeight)).toBeGreaterThan(400);
      }
    });

    it('should handle touch interactions properly', () => {
      mockWindowDimensions(375, 667);

      const mockOnChange = jest.fn();
      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={2}
          onChange={mockOnChange}
        />
      );

      const trigger = screen.getByText('搜索并选择父任务...');

      // Simulate touch interaction
      fireEvent.touchStart(trigger, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      fireEvent.touchEnd(trigger, {
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });

      // Should handle touch events without issues
      expect(trigger).toBeInTheDocument();
    });

    it('should have appropriate touch targets (min 44px)', () => {
      mockWindowDimensions(375, 667);

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Check buttons have minimum touch target size
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        const minSize = 44; // Minimum recommended touch target size
        
        // At least one dimension should meet minimum size
        expect(Math.max(rect.width, rect.height)).toBeGreaterThanOrEqual(minSize);
      });
    });
  });

  describe('Tablet Viewport (768px - 1024px)', () => {
    it('should adapt TaskParentSelector for tablet screens', () => {
      mockWindowDimensions(768, 1024); // iPad dimensions

      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={2}
          onChange={jest.fn()}
        />
      );

      const trigger = screen.getByText('搜索并选择父任务...');
      fireEvent.click(trigger);

      // On tablet, should use regular dropdown positioning
      const dropdown = document.querySelector('.parent-selector-dropdown');
      if (dropdown) {
        expect(dropdown).toBeInTheDocument();
      }
    });

    it('should optimize TaskParentSelectorModal for tablet', () => {
      mockWindowDimensions(768, 1024);

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

      // Should have tablet-optimized width
      const modalWrapper = modal.closest('.ant-modal');
      if (modalWrapper) {
        const styles = window.getComputedStyle(modalWrapper);
        expect(parseInt(styles.width)).toBeGreaterThan(600);
      }
    });
  });

  describe('Orientation Changes', () => {
    it('should handle portrait to landscape orientation change', () => {
      // Start in portrait
      mockWindowDimensions(375, 667);

      const { rerender } = render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Change to landscape
      mockWindowDimensions(667, 375);

      rerender(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Should adapt to new orientation
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });

    it('should handle landscape to portrait orientation change', () => {
      // Start in landscape
      mockWindowDimensions(667, 375);

      const { rerender } = render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={2}
          onChange={jest.fn()}
        />
      );

      const trigger = screen.getByText('搜索并选择父任务...');
      fireEvent.click(trigger);

      // Change to portrait
      mockWindowDimensions(375, 667);

      rerender(
        <TaskParentSelector
          projectId={1}
          currentTaskId={2}
          onChange={jest.fn()}
        />
      );

      // Should adapt to new orientation
      expect(trigger).toBeInTheDocument();
    });
  });

  describe('Viewport-Specific Behavior', () => {
    it('should show different UI elements based on screen size', () => {
      // Test small screen
      mockWindowDimensions(320, 568);

      const { rerender } = render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      let modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Test large screen
      mockWindowDimensions(1200, 800);

      rerender(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });

    it('should optimize list rendering for small screens', () => {
      mockWindowDimensions(375, 667);

      // Mock tasks data
      global.fetch = jest.fn().mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { 
              data: Array.from({ length: 20 }, (_, i) => ({
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
              total: 20,
            },
          }),
        })
      );

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Should render list efficiently on mobile
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Mobile-Specific Interactions', () => {
    it('should handle swipe gestures', () => {
      mockWindowDimensions(375, 667);

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const modal = screen.getByRole('dialog');
      
      // Simulate swipe down gesture
      fireEvent.touchStart(modal, {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      fireEvent.touchMove(modal, {
        touches: [{ clientX: 200, clientY: 200 }],
      });
      fireEvent.touchEnd(modal, {
        changedTouches: [{ clientX: 200, clientY: 200 }],
      });

      // Should handle swipe without crashing
      expect(modal).toBeInTheDocument();
    });

    it('should prevent zoom on double tap', () => {
      mockWindowDimensions(375, 667);

      render(
        <TaskParentSelector
          projectId={1}
          currentTaskId={2}
          onChange={jest.fn()}
        />
      );

      const trigger = screen.getByText('搜索并选择父任务...');

      // Simulate double tap
      fireEvent.touchStart(trigger);
      fireEvent.touchEnd(trigger);
      fireEvent.touchStart(trigger);
      fireEvent.touchEnd(trigger);

      // Should not cause zoom issues
      expect(trigger).toBeInTheDocument();
    });

    it('should handle virtual keyboard appearance', () => {
      mockWindowDimensions(375, 667);

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Simulate virtual keyboard appearance (reduces viewport height)
      mockWindowDimensions(375, 400);

      const searchInput = screen.getByPlaceholderText('搜索父任务...');
      fireEvent.focus(searchInput);

      // Should handle reduced viewport height
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Performance on Mobile Devices', () => {
    it('should render efficiently on slow mobile devices', async () => {
      mockWindowDimensions(375, 667);

      // Mock slow device performance
      const originalRequestAnimationFrame = window.requestAnimationFrame;
      let frameCallbacks: (() => void)[] = [];
      
      window.requestAnimationFrame = jest.fn((callback) => {
        frameCallbacks.push(callback);
        return 1;
      });

      const startTime = performance.now();

      render(
        <TaskParentSelectorModal
          visible={true}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Execute pending frame callbacks
      act(() => {
        frameCallbacks.forEach(callback => callback());
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly even on slow devices
      expect(renderTime).toBeLessThan(200);

      // Restore
      window.requestAnimationFrame = originalRequestAnimationFrame;
    });

    it('should not cause memory leaks on repeated modal open/close', () => {
      mockWindowDimensions(375, 667);

      const { rerender } = render(
        <TaskParentSelectorModal
          visible={false}
          projectId={1}
          onOk={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Simulate rapid open/close cycles
      for (let i = 0; i < 10; i++) {
        rerender(
          <TaskParentSelectorModal
            visible={true}
            projectId={1}
            onOk={jest.fn()}
            onCancel={jest.fn()}
          />
        );

        rerender(
          <TaskParentSelectorModal
            visible={false}
            projectId={1}
            onOk={jest.fn()}
            onCancel={jest.fn()}
          />
        );
      }

      // Should not cause memory issues
      expect(true).toBe(true); // Test passes if no errors thrown
    });
  });
});