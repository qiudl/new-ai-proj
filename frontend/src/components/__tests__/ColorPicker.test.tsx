import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorPicker from '../ColorPicker';

describe('ColorPicker', () => {
  const presetColors = [
    { color: '#1890ff', name: '蓝色' },
    { color: '#52c41a', name: '绿色' },
    { color: '#faad14', name: '橙色' },
    { color: '#f5222d', name: '红色' },
    { color: '#722ed1', name: '紫色' },
    { color: '#13c2c2', name: '青色' },
    { color: '#eb2f96', name: '粉色' },
    { color: '#fa8c16', name: '金色' },
    { color: '#8c8c8c', name: '灰色' },
    { color: '#595959', name: '深灰' },
  ];

  describe('渲染', () => {
    it('应该渲染所有预设颜色', () => {
      render(<ColorPicker />);

      // 检查所有颜色块是否渲染
      presetColors.forEach(({ name }) => {
        expect(screen.getByTitle(name)).toBeInTheDocument();
      });
    });

    it('应该正确显示颜色块样式', () => {
      render(<ColorPicker />);

      const blueColorBlock = screen.getByTitle('蓝色');

      expect(blueColorBlock).toHaveStyle({
        width: '32px',
        height: '32px',
        background: '#1890ff',
        borderRadius: '4px',
        cursor: 'pointer',
      });
    });

    it('应该正确显示当前选中的颜色', () => {
      render(<ColorPicker value="#52c41a" />);

      const greenColorBlock = screen.getByTitle('绿色');
      const blueColorBlock = screen.getByTitle('蓝色');

      // 选中的颜色应该有粗边框
      expect(greenColorBlock).toHaveStyle({
        border: '3px solid #000',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      });

      // 未选中的颜色应该有细边框
      expect(blueColorBlock).toHaveStyle({
        border: '1px solid #d9d9d9',
        boxShadow: 'none',
      });
    });

    it('应该在没有选中值时不高亮任何颜色', () => {
      render(<ColorPicker />);

      presetColors.forEach(({ name }) => {
        const colorBlock = screen.getByTitle(name);
        expect(colorBlock).toHaveStyle({
          border: '1px solid #d9d9d9',
          boxShadow: 'none',
        });
      });
    });
  });

  describe('交互', () => {
    it('应该在点击颜色块时调用onChange', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();

      render(<ColorPicker onChange={handleChange} />);

      const redColorBlock = screen.getByTitle('红色');
      await user.click(redColorBlock);

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('#f5222d');
    });

    it('应该支持点击多个不同的颜色', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();

      render(<ColorPicker onChange={handleChange} />);

      // 点击蓝色
      await user.click(screen.getByTitle('蓝色'));
      expect(handleChange).toHaveBeenCalledWith('#1890ff');

      // 点击绿色
      await user.click(screen.getByTitle('绿色'));
      expect(handleChange).toHaveBeenCalledWith('#52c41a');

      // 点击红色
      await user.click(screen.getByTitle('红色'));
      expect(handleChange).toHaveBeenCalledWith('#f5222d');

      expect(handleChange).toHaveBeenCalledTimes(3);
    });

    it('应该在没有onChange时不报错', async () => {
      const user = userEvent.setup();

      render(<ColorPicker />);

      const blueColorBlock = screen.getByTitle('蓝色');

      // 应该不抛出错误
      await expect(user.click(blueColorBlock)).resolves.not.toThrow();
    });

    it('应该支持重复点击同一颜色', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();

      render(<ColorPicker onChange={handleChange} />);

      const blueColorBlock = screen.getByTitle('蓝色');

      await user.click(blueColorBlock);
      await user.click(blueColorBlock);
      await user.click(blueColorBlock);

      expect(handleChange).toHaveBeenCalledTimes(3);
      expect(handleChange).toHaveBeenCalledWith('#1890ff');
    });
  });

  describe('鼠标悬停效果', () => {
    it('应该在鼠标悬停时改变未选中颜色的边框', () => {
      render(<ColorPicker value="#52c41a" />);

      const blueColorBlock = screen.getByTitle('蓝色');

      // 悬停前
      expect(blueColorBlock).toHaveStyle({
        border: '1px solid #d9d9d9',
      });

      // 悬停
      fireEvent.mouseEnter(blueColorBlock);
      expect(blueColorBlock).toHaveStyle({
        border: '2px solid #000',
      });

      // 离开
      fireEvent.mouseLeave(blueColorBlock);
      expect(blueColorBlock).toHaveStyle({
        border: '1px solid #d9d9d9',
      });
    });

    it('应该不改变选中颜色的悬停效果', () => {
      render(<ColorPicker value="#1890ff" />);

      const blueColorBlock = screen.getByTitle('蓝色');

      // 悬停前
      const initialBorder = blueColorBlock.style.border;

      // 悬停
      fireEvent.mouseEnter(blueColorBlock);
      expect(blueColorBlock.style.border).toBe(initialBorder);

      // 离开
      fireEvent.mouseLeave(blueColorBlock);
      expect(blueColorBlock.style.border).toBe(initialBorder);
    });

    it('应该支持快速移动鼠标', () => {
      render(<ColorPicker />);

      const colors = ['蓝色', '绿色', '橙色', '红色'];

      colors.forEach((colorName) => {
        const colorBlock = screen.getByTitle(colorName);

        fireEvent.mouseEnter(colorBlock);
        expect(colorBlock).toHaveStyle({
          border: '2px solid #000',
        });

        fireEvent.mouseLeave(colorBlock);
        expect(colorBlock).toHaveStyle({
          border: '1px solid #d9d9d9',
        });
      });
    });
  });

  describe('受控组件', () => {
    it('应该作为受控组件工作', () => {
      const { rerender } = render(<ColorPicker value="#1890ff" />);

      // 初始状态
      expect(screen.getByTitle('蓝色')).toHaveStyle({
        border: '3px solid #000',
      });

      // 更新value
      rerender(<ColorPicker value="#52c41a" />);

      expect(screen.getByTitle('绿色')).toHaveStyle({
        border: '3px solid #000',
      });
      expect(screen.getByTitle('蓝色')).toHaveStyle({
        border: '1px solid #d9d9d9',
      });
    });

    it('应该正确处理value变为undefined', () => {
      const { rerender } = render(<ColorPicker value="#1890ff" />);

      expect(screen.getByTitle('蓝色')).toHaveStyle({
        border: '3px solid #000',
      });

      // 清除选择
      rerender(<ColorPicker value={undefined} />);

      presetColors.forEach(({ name }) => {
        expect(screen.getByTitle(name)).toHaveStyle({
          border: '1px solid #d9d9d9',
          boxShadow: 'none',
        });
      });
    });
  });

  describe('边界情况', () => {
    it('应该正确处理不在预设列表中的颜色值', () => {
      render(<ColorPicker value="#ffffff" />);

      // 所有颜色块都不应该被选中
      presetColors.forEach(({ name }) => {
        expect(screen.getByTitle(name)).toHaveStyle({
          border: '1px solid #d9d9d9',
          boxShadow: 'none',
        });
      });
    });

    it('应该正确处理空字符串值', () => {
      render(<ColorPicker value="" />);

      presetColors.forEach(({ name }) => {
        expect(screen.getByTitle(name)).toHaveStyle({
          border: '1px solid #d9d9d9',
        });
      });
    });

    it('应该支持快速切换选择', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();

      render(<ColorPicker onChange={handleChange} />);

      // 快速点击多个颜色
      await user.click(screen.getByTitle('蓝色'));
      await user.click(screen.getByTitle('绿色'));
      await user.click(screen.getByTitle('红色'));
      await user.click(screen.getByTitle('紫色'));

      expect(handleChange).toHaveBeenCalledTimes(4);
      expect(handleChange).toHaveBeenNthCalledWith(1, '#1890ff');
      expect(handleChange).toHaveBeenNthCalledWith(2, '#52c41a');
      expect(handleChange).toHaveBeenNthCalledWith(3, '#f5222d');
      expect(handleChange).toHaveBeenNthCalledWith(4, '#722ed1');
    });
  });

  describe('可访问性', () => {
    it('应该为每个颜色块提供title属性', () => {
      render(<ColorPicker />);

      presetColors.forEach(({ name }) => {
        const colorBlock = screen.getByTitle(name);
        expect(colorBlock).toHaveAttribute('title', name);
      });
    });

    it('应该显示鼠标指针样式', () => {
      render(<ColorPicker />);

      presetColors.forEach(({ name }) => {
        const colorBlock = screen.getByTitle(name);
        expect(colorBlock).toHaveStyle({
          cursor: 'pointer',
        });
      });
    });
  });
});
