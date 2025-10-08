/**
 * TaskDetailLayout - 布局组件测试
 *
 * 测试覆盖:
 * - 布局渲染
 * - 两栏结构(lg=16/lg=8)
 * - content和sidebar props
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TaskDetailLayout } from '../../../components/Layout/TaskDetailLayout';

describe('TaskDetailLayout', () => {
  describe('基本渲染', () => {
    it('应该正确渲染布局组件', () => {
      render(
        <TaskDetailLayout
          content={<div>Content Area</div>}
          sidebar={<div>Sidebar Area</div>}
        />
      );

      expect(screen.getByText('Content Area')).toBeInTheDocument();
      expect(screen.getByText('Sidebar Area')).toBeInTheDocument();
    });

    it('应该渲染包含两栏的Row组件', () => {
      const { container } = render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={<div>Sidebar</div>}
        />
      );

      const row = container.querySelector('.ant-row');
      expect(row).toBeInTheDocument();
    });

    it('应该正确设置gutter属性', () => {
      const { container } = render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={<div>Sidebar</div>}
        />
      );

      const row = container.querySelector('.ant-row');
      expect(row).toHaveStyle({ position: 'relative' });
    });
  });

  describe('Props处理', () => {
    it('应该接受并渲染content prop', () => {
      const content = <div data-testid="test-content">Test Content</div>;

      render(
        <TaskDetailLayout
          content={content}
          sidebar={<div>Sidebar</div>}
        />
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('应该接受并渲染sidebar prop', () => {
      const sidebar = <div data-testid="test-sidebar">Test Sidebar</div>;

      render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={sidebar}
        />
      );

      expect(screen.getByTestId('test-sidebar')).toBeInTheDocument();
      expect(screen.getByText('Test Sidebar')).toBeInTheDocument();
    });

    it('应该接受自定义className', () => {
      const { container } = render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={<div>Sidebar</div>}
          className="custom-layout"
        />
      );

      const row = container.querySelector('.ant-row');
      expect(row).toHaveClass('custom-layout');
    });

    it('应该接受自定义style', () => {
      const customStyle = { background: 'red', padding: '20px' };

      const { container } = render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={<div>Sidebar</div>}
          style={customStyle}
        />
      );

      const row = container.querySelector('.ant-row');
      expect(row).toHaveStyle({ background: 'red', padding: '20px' });
    });

    it('应该合并自定义style和默认position style', () => {
      const customStyle = { background: 'blue' };

      const { container } = render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={<div>Sidebar</div>}
          style={customStyle}
        />
      );

      const row = container.querySelector('.ant-row');
      expect(row).toHaveStyle({ background: 'blue', position: 'relative' });
    });
  });

  describe('列结构', () => {
    it('应该包含两个Col组件', () => {
      const { container } = render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={<div>Sidebar</div>}
        />
      );

      const cols = container.querySelectorAll('.ant-col');
      expect(cols).toHaveLength(2);
    });

    it('左侧列应该包含content', () => {
      const { container } = render(
        <TaskDetailLayout
          content={<div data-testid="content">Content</div>}
          sidebar={<div>Sidebar</div>}
        />
      );

      const cols = container.querySelectorAll('.ant-col');
      const firstCol = cols[0];
      expect(firstCol.querySelector('[data-testid="content"]')).toBeInTheDocument();
    });

    it('右侧列应该包含sidebar', () => {
      const { container } = render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={<div data-testid="sidebar">Sidebar</div>}
        />
      );

      const cols = container.querySelectorAll('.ant-col');
      const secondCol = cols[1];
      expect(secondCol.querySelector('[data-testid="sidebar"]')).toBeInTheDocument();
    });

    it('右侧列应该有info-sidebar类名', () => {
      const { container } = render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={<div>Sidebar</div>}
        />
      );

      const sidebarCol = container.querySelector('.info-sidebar');
      expect(sidebarCol).toBeInTheDocument();
    });
  });

  describe('响应式布局', () => {
    it('左侧列应该在小屏幕占满宽', () => {
      const { container } = render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={<div>Sidebar</div>}
        />
      );

      const cols = container.querySelectorAll('.ant-col');
      const firstCol = cols[0];

      // Check for responsive classes
      expect(firstCol).toHaveClass('ant-col-xs-24');
      expect(firstCol).toHaveClass('ant-col-sm-24');
      expect(firstCol).toHaveClass('ant-col-md-24');
    });

    it('左侧列应该在大屏幕占16/24宽度', () => {
      const { container } = render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={<div>Sidebar</div>}
        />
      );

      const cols = container.querySelectorAll('.ant-col');
      const firstCol = cols[0];

      expect(firstCol).toHaveClass('ant-col-lg-16');
      expect(firstCol).toHaveClass('ant-col-xl-16');
    });

    it('右侧列应该在小屏幕占满宽', () => {
      const { container } = render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={<div>Sidebar</div>}
        />
      );

      const cols = container.querySelectorAll('.ant-col');
      const secondCol = cols[1];

      expect(secondCol).toHaveClass('ant-col-xs-24');
      expect(secondCol).toHaveClass('ant-col-sm-24');
      expect(secondCol).toHaveClass('ant-col-md-24');
    });

    it('右侧列应该在大屏幕占8/24宽度', () => {
      const { container } = render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={<div>Sidebar</div>}
        />
      );

      const cols = container.querySelectorAll('.ant-col');
      const secondCol = cols[1];

      expect(secondCol).toHaveClass('ant-col-lg-8');
      expect(secondCol).toHaveClass('ant-col-xl-8');
    });
  });

  describe('内容渲染', () => {
    it('应该渲染复杂的React元素作为content', () => {
      const ComplexContent = () => (
        <div>
          <h1>Title</h1>
          <p>Paragraph</p>
          <button>Button</button>
        </div>
      );

      render(
        <TaskDetailLayout
          content={<ComplexContent />}
          sidebar={<div>Sidebar</div>}
        />
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Paragraph')).toBeInTheDocument();
      expect(screen.getByText('Button')).toBeInTheDocument();
    });

    it('应该渲染复杂的React元素作为sidebar', () => {
      const ComplexSidebar = () => (
        <div>
          <h2>Sidebar Title</h2>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      );

      render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={<ComplexSidebar />}
        />
      );

      expect(screen.getByText('Sidebar Title')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('应该支持null作为content', () => {
      render(
        <TaskDetailLayout
          content={null}
          sidebar={<div>Sidebar</div>}
        />
      );

      expect(screen.getByText('Sidebar')).toBeInTheDocument();
    });

    it('应该支持null作为sidebar', () => {
      render(
        <TaskDetailLayout
          content={<div>Content</div>}
          sidebar={null}
        />
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('DisplayName', () => {
    it('应该设置正确的displayName', () => {
      expect(TaskDetailLayout.displayName).toBe('TaskDetailLayout');
    });
  });

  describe('边界情况', () => {
    it('应该处理空字符串作为content', () => {
      render(
        <TaskDetailLayout
          content={''}
          sidebar={<div>Sidebar</div>}
        />
      );

      const { container } = render(
        <TaskDetailLayout
          content={''}
          sidebar={<div>Sidebar</div>}
        />
      );

      const cols = container.querySelectorAll('.ant-col');
      expect(cols).toHaveLength(2);
    });

    it('应该处理Fragment作为content', () => {
      render(
        <TaskDetailLayout
          content={
            <>
              <div>Part 1</div>
              <div>Part 2</div>
            </>
          }
          sidebar={<div>Sidebar</div>}
        />
      );

      expect(screen.getByText('Part 1')).toBeInTheDocument();
      expect(screen.getByText('Part 2')).toBeInTheDocument();
    });

    it('应该处理数组作为children', () => {
      render(
        <TaskDetailLayout
          content={[
            <div key="1">Item 1</div>,
            <div key="2">Item 2</div>
          ]}
          sidebar={<div>Sidebar</div>}
        />
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });
});
