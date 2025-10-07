import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IconPicker from '../IconPicker';

describe('IconPicker', () => {
  const icons = [
    { icon: '📁', name: '文件夹' },
    { icon: '📂', name: '打开文件夹' },
    { icon: '🗂️', name: '卡片盒' },
    { icon: '📋', name: '剪贴板' },
    { icon: '📊', name: '图表' },
    { icon: '💼', name: '公文包' },
    { icon: '🎯', name: '靶心' },
    { icon: '⭐', name: '星星' },
    { icon: '💡', name: '灯泡' },
    { icon: '🚀', name: '火箭' },
    { icon: '📝', name: '记事本' },
    { icon: '🔖', name: '书签' },
    { icon: '📌', name: '图钉' },
    { icon: '🏷️', name: '标签' },
    { icon: '📦', name: '包裹' },
    { icon: '🎨', name: '调色板' },
  ];

  describe('渲染', () => {
    it('应该渲染所有预设图标', () => {
      render(<IconPicker />);

      icons.forEach(({ name, icon }) => {
        const iconElement = screen.getByTitle(name);
        expect(iconElement).toBeInTheDocument();
        expect(iconElement).toHaveTextContent(icon);
      });
    });

    it('应该正确显示图标块样式', () => {
      render(<IconPicker />);

      const folderIcon = screen.getByTitle('文件夹');

      expect(folderIcon).toHaveStyle({
        fontSize: '24px',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        cursor: 'pointer',
      });
    });

    it('应该正确显示当前选中的图标', () => {
      render(<IconPicker value="⭐" />);

      const starIcon = screen.getByTitle('星星');
      const folderIcon = screen.getByTitle('文件夹');

      // 选中的图标应该有蓝色边框和背景
      expect(starIcon).toHaveStyle({
        border: '2px solid #1890ff',
        backgroundColor: '#e6f7ff',
      });

      // 未选中的图标应该有灰色边框和透明背景
      expect(folderIcon).toHaveStyle({
        border: '1px solid #d9d9d9',
        backgroundColor: 'transparent',
      });
    });

    it('应该在没有选中值时不高亮任何图标', () => {
      render(<IconPicker />);

      icons.forEach(({ name }) => {
        const iconElement = screen.getByTitle(name);
        expect(iconElement).toHaveStyle({
          border: '1px solid #d9d9d9',
          backgroundColor: 'transparent',
        });
      });
    });
  });

  describe('交互', () => {
    it('应该在点击图标时调用onChange', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();

      render(<IconPicker onChange={handleChange} />);

      const rocketIcon = screen.getByTitle('火箭');
      await user.click(rocketIcon);

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('🚀');
    });

    it('应该支持点击多个不同的图标', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();

      render(<IconPicker onChange={handleChange} />);

      // 点击文件夹
      await user.click(screen.getByTitle('文件夹'));
      expect(handleChange).toHaveBeenCalledWith('📁');

      // 点击星星
      await user.click(screen.getByTitle('星星'));
      expect(handleChange).toHaveBeenCalledWith('⭐');

      // 点击火箭
      await user.click(screen.getByTitle('火箭'));
      expect(handleChange).toHaveBeenCalledWith('🚀');

      expect(handleChange).toHaveBeenCalledTimes(3);
    });

    it('应该在没有onChange时不报错', async () => {
      const user = userEvent.setup();

      render(<IconPicker />);

      const folderIcon = screen.getByTitle('文件夹');

      // 应该不抛出错误
      await expect(user.click(folderIcon)).resolves.not.toThrow();
    });

    it('应该支持重复点击同一图标', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();

      render(<IconPicker onChange={handleChange} />);

      const starIcon = screen.getByTitle('星星');

      await user.click(starIcon);
      await user.click(starIcon);
      await user.click(starIcon);

      expect(handleChange).toHaveBeenCalledTimes(3);
      expect(handleChange).toHaveBeenCalledWith('⭐');
    });
  });

  describe('鼠标悬停效果', () => {
    it('应该在鼠标悬停时改变未选中图标的样式', () => {
      render(<IconPicker value="⭐" />);

      const folderIcon = screen.getByTitle('文件夹');

      // 悬停前
      expect(folderIcon).toHaveStyle({
        border: '1px solid #d9d9d9',
        backgroundColor: 'transparent',
      });

      // 悬停
      fireEvent.mouseEnter(folderIcon);
      expect(folderIcon).toHaveStyle({
        backgroundColor: '#f5f5f5',
        border: '1px solid #1890ff',
      });

      // 离开
      fireEvent.mouseLeave(folderIcon);
      expect(folderIcon).toHaveStyle({
        backgroundColor: 'transparent',
        border: '1px solid #d9d9d9',
      });
    });

    it('应该不改变选中图标的悬停效果', () => {
      render(<IconPicker value="📁" />);

      const folderIcon = screen.getByTitle('文件夹');

      // 悬停前
      const initialBorder = folderIcon.style.border;
      const initialBg = folderIcon.style.backgroundColor;

      // 悬停
      fireEvent.mouseEnter(folderIcon);
      expect(folderIcon.style.border).toBe(initialBorder);
      expect(folderIcon.style.backgroundColor).toBe(initialBg);

      // 离开
      fireEvent.mouseLeave(folderIcon);
      expect(folderIcon.style.border).toBe(initialBorder);
      expect(folderIcon.style.backgroundColor).toBe(initialBg);
    });

    it('应该支持快速移动鼠标', () => {
      render(<IconPicker />);

      const iconNames = ['文件夹', '星星', '火箭', '灯泡'];

      iconNames.forEach((iconName) => {
        const iconElement = screen.getByTitle(iconName);

        fireEvent.mouseEnter(iconElement);
        expect(iconElement).toHaveStyle({
          backgroundColor: '#f5f5f5',
          border: '1px solid #1890ff',
        });

        fireEvent.mouseLeave(iconElement);
        expect(iconElement).toHaveStyle({
          backgroundColor: 'transparent',
          border: '1px solid #d9d9d9',
        });
      });
    });
  });

  describe('受控组件', () => {
    it('应该作为受控组件工作', () => {
      const { rerender } = render(<IconPicker value="📁" />);

      // 初始状态
      expect(screen.getByTitle('文件夹')).toHaveStyle({
        border: '2px solid #1890ff',
        backgroundColor: '#e6f7ff',
      });

      // 更新value
      rerender(<IconPicker value="⭐" />);

      expect(screen.getByTitle('星星')).toHaveStyle({
        border: '2px solid #1890ff',
        backgroundColor: '#e6f7ff',
      });
      expect(screen.getByTitle('文件夹')).toHaveStyle({
        border: '1px solid #d9d9d9',
        backgroundColor: 'transparent',
      });
    });

    it('应该正确处理value变为undefined', () => {
      const { rerender } = render(<IconPicker value="📁" />);

      expect(screen.getByTitle('文件夹')).toHaveStyle({
        border: '2px solid #1890ff',
        backgroundColor: '#e6f7ff',
      });

      // 清除选择
      rerender(<IconPicker value={undefined} />);

      icons.forEach(({ name }) => {
        expect(screen.getByTitle(name)).toHaveStyle({
          border: '1px solid #d9d9d9',
          backgroundColor: 'transparent',
        });
      });
    });
  });

  describe('边界情况', () => {
    it('应该正确处理不在预设列表中的图标值', () => {
      render(<IconPicker value="🌟" />);

      // 所有图标块都不应该被选中
      icons.forEach(({ name }) => {
        expect(screen.getByTitle(name)).toHaveStyle({
          border: '1px solid #d9d9d9',
          backgroundColor: 'transparent',
        });
      });
    });

    it('应该正确处理空字符串值', () => {
      render(<IconPicker value="" />);

      icons.forEach(({ name }) => {
        expect(screen.getByTitle(name)).toHaveStyle({
          border: '1px solid #d9d9d9',
        });
      });
    });

    it('应该支持快速切换选择', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();

      render(<IconPicker onChange={handleChange} />);

      // 快速点击多个图标
      await user.click(screen.getByTitle('文件夹'));
      await user.click(screen.getByTitle('星星'));
      await user.click(screen.getByTitle('火箭'));
      await user.click(screen.getByTitle('灯泡'));

      expect(handleChange).toHaveBeenCalledTimes(4);
      expect(handleChange).toHaveBeenNthCalledWith(1, '📁');
      expect(handleChange).toHaveBeenNthCalledWith(2, '⭐');
      expect(handleChange).toHaveBeenNthCalledWith(3, '🚀');
      expect(handleChange).toHaveBeenNthCalledWith(4, '💡');
    });
  });

  describe('可访问性', () => {
    it('应该为每个图标块提供title属性', () => {
      render(<IconPicker />);

      icons.forEach(({ name }) => {
        const iconElement = screen.getByTitle(name);
        expect(iconElement).toHaveAttribute('title', name);
      });
    });

    it('应该显示鼠标指针样式', () => {
      render(<IconPicker />);

      icons.forEach(({ name }) => {
        const iconElement = screen.getByTitle(name);
        expect(iconElement).toHaveStyle({
          cursor: 'pointer',
        });
      });
    });

    it('应该正确显示所有图标内容', () => {
      render(<IconPicker />);

      icons.forEach(({ icon, name }) => {
        const iconElement = screen.getByTitle(name);
        expect(iconElement.textContent).toBe(icon);
      });
    });
  });
});
