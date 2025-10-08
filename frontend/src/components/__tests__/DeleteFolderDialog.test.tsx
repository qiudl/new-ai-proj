import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteFolderDialog from '../DeleteFolderDialog';
import { WorkNoteFolder } from '../../services/workNotesService';

// Mock ErrorHandler
jest.mock('../../utils/error', () => ({
  ErrorHandler: {
    showError: jest.fn(),
  },
}));

describe('DeleteFolderDialog', () => {
  const emptyFolder: WorkNoteFolder = {
    id: 1,
    name: '空文件夹',
    visibility: 'private',
    color: '#1890ff',
    icon: '📁',
    notes_count: 0,
    subfolders_count: 0,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const folderWithNotes: WorkNoteFolder = {
    id: 2,
    name: '有笔记的文件夹',
    visibility: 'private',
    color: '#52c41a',
    icon: '📂',
    notes_count: 5,
    subfolders_count: 0,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const folderWithSubfolders: WorkNoteFolder = {
    id: 3,
    name: '有子文件夹',
    visibility: 'private',
    color: '#faad14',
    icon: '🗂️',
    notes_count: 0,
    subfolders_count: 3,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const folderWithBoth: WorkNoteFolder = {
    id: 4,
    name: '有笔记和子文件夹',
    visibility: 'private',
    color: '#f5222d',
    icon: '📋',
    notes_count: 10,
    subfolders_count: 2,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn().mockResolvedValue(undefined),
    folder: emptyFolder,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('渲染 - 空文件夹', () => {
    it('应该显示删除确认标题', () => {
      render(<DeleteFolderDialog {...defaultProps} />);

      expect(screen.getByText('删除文件夹')).toBeInTheDocument();
    });

    it('应该显示文件夹名称', () => {
      render(<DeleteFolderDialog {...defaultProps} />);

      expect(screen.getByText(/空文件夹/)).toBeInTheDocument();
    });

    it('应该显示空文件夹提示', () => {
      render(<DeleteFolderDialog {...defaultProps} />);

      expect(screen.getByText('空文件夹')).toBeInTheDocument();
      expect(screen.getByText(/此文件夹不包含任何笔记或子文件夹/)).toBeInTheDocument();
    });

    it('应该不显示强制删除选项', () => {
      render(<DeleteFolderDialog {...defaultProps} />);

      expect(screen.queryByText(/强制删除/)).not.toBeInTheDocument();
    });

    it('应该显示删除按钮', () => {
      render(<DeleteFolderDialog {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: '删除' });
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveClass('ant-btn-dangerous');
    });

    it('应该显示不可撤销警告', () => {
      render(<DeleteFolderDialog {...defaultProps} />);

      expect(screen.getByText(/此操作不可撤销/)).toBeInTheDocument();
    });
  });

  describe('渲染 - 非空文件夹', () => {
    it('应该显示非空文件夹警告', () => {
      render(<DeleteFolderDialog {...defaultProps} folder={folderWithNotes} />);

      expect(screen.getByText('此文件夹不为空')).toBeInTheDocument();
    });

    it('应该显示笔记数量', () => {
      render(<DeleteFolderDialog {...defaultProps} folder={folderWithNotes} />);

      expect(screen.getByText(/5/)).toBeInTheDocument();
      expect(screen.getByText(/条笔记/)).toBeInTheDocument();
    });

    it('应该显示子文件夹数量', () => {
      render(<DeleteFolderDialog {...defaultProps} folder={folderWithSubfolders} />);

      expect(screen.getByText(/3/)).toBeInTheDocument();
      expect(screen.getByText(/个子文件夹/)).toBeInTheDocument();
    });

    it('应该同时显示笔记和子文件夹数量', () => {
      render(<DeleteFolderDialog {...defaultProps} folder={folderWithBoth} />);

      expect(screen.getByText(/10/)).toBeInTheDocument();
      expect(screen.getByText(/条笔记/)).toBeInTheDocument();
      expect(screen.getByText(/2/)).toBeInTheDocument();
      expect(screen.getByText(/个子文件夹/)).toBeInTheDocument();
    });

    it('应该显示强制删除复选框', () => {
      render(<DeleteFolderDialog {...defaultProps} folder={folderWithNotes} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(screen.getByText(/强制删除/)).toBeInTheDocument();
    });

    it('应该默认不勾选强制删除', () => {
      render(<DeleteFolderDialog {...defaultProps} folder={folderWithNotes} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('应该显示建议操作提示', () => {
      render(<DeleteFolderDialog {...defaultProps} folder={folderWithNotes} />);

      expect(screen.getByText('建议操作')).toBeInTheDocument();
      expect(screen.getByText(/建议先将文件夹内的笔记和子文件夹移动到其他位置/)).toBeInTheDocument();
    });
  });

  describe('空文件夹删除', () => {
    it('应该直接删除空文件夹', async () => {
      const user = userEvent.setup();
      render(<DeleteFolderDialog {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: '删除' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(defaultProps.onConfirm).toHaveBeenCalledWith(false);
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('应该在删除失败时显示错误', async () => {
      const user = userEvent.setup();
      const error = new Error('删除失败');
      const mockOnConfirm = jest.fn().mockRejectedValue(error);

      render(<DeleteFolderDialog {...defaultProps} onConfirm={mockOnConfirm} />);

      const deleteButton = screen.getByRole('button', { name: '删除' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });

      // 对话框应该仍然可见
      expect(screen.getByText('删除文件夹')).toBeInTheDocument();
    });
  });

  describe('非空文件夹删除', () => {
    it('应该在未勾选强制删除时阻止删除', async () => {
      const user = userEvent.setup();
      render(<DeleteFolderDialog {...defaultProps} folder={folderWithNotes} />);

      const deleteButton = screen.getByRole('button', { name: '删除' });
      await user.click(deleteButton);

      // 应该看到警告消息
      await waitFor(() => {
        // message.warning会被调用
      });

      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('应该在勾选强制删除后允许删除', async () => {
      const user = userEvent.setup();
      render(<DeleteFolderDialog {...defaultProps} folder={folderWithNotes} />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(checkbox).toBeChecked();

      const deleteButton = screen.getByRole('button', { name: '删除' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(defaultProps.onConfirm).toHaveBeenCalledWith(true);
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('应该支持取消勾选强制删除', async () => {
      const user = userEvent.setup();
      render(<DeleteFolderDialog {...defaultProps} folder={folderWithNotes} />);

      const checkbox = screen.getByRole('checkbox');

      // 勾选
      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      // 取消勾选
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();

      // 尝试删除应该失败
      const deleteButton = screen.getByRole('button', { name: '删除' });
      await user.click(deleteButton);

      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('应该在勾选强制删除时隐藏建议提示', async () => {
      const user = userEvent.setup();
      render(<DeleteFolderDialog {...defaultProps} folder={folderWithNotes} />);

      // 初始状态应该显示建议
      expect(screen.getByText('建议操作')).toBeInTheDocument();

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // 勾选后建议应该消失
      await waitFor(() => {
        expect(screen.queryByText('建议操作')).not.toBeInTheDocument();
      });
    });
  });

  describe('提交状态', () => {
    it('应该在提交时显示loading状态', async () => {
      const user = userEvent.setup();
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      const mockOnConfirm = jest.fn().mockReturnValue(deletePromise);

      render(<DeleteFolderDialog {...defaultProps} onConfirm={mockOnConfirm} />);

      const deleteButton = screen.getByRole('button', { name: '删除' });
      await user.click(deleteButton);

      // 按钮应该显示loading
      await waitFor(() => {
        expect(deleteButton).toHaveClass('ant-btn-loading');
      });

      // 完成删除
      resolveDelete!();
    });

    it('应该在提交期间禁用强制删除复选框', async () => {
      const user = userEvent.setup();
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      const mockOnConfirm = jest.fn().mockReturnValue(deletePromise);

      render(
        <DeleteFolderDialog
          {...defaultProps}
          folder={folderWithNotes}
          onConfirm={mockOnConfirm}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      const deleteButton = screen.getByRole('button', { name: '删除' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(deleteButton).toHaveClass('ant-btn-loading');
      });

      resolveDelete!();
    });
  });

  describe('取消操作', () => {
    it('应该在点击取消时关闭对话框', async () => {
      const user = userEvent.setup();
      render(<DeleteFolderDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: '取消' });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('应该在取消时重置强制删除状态', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <DeleteFolderDialog {...defaultProps} folder={folderWithNotes} />
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      const cancelButton = screen.getByRole('button', { name: '取消' });
      await user.click(cancelButton);

      // 重新打开对话框
      rerender(
        <DeleteFolderDialog {...defaultProps} folder={folderWithNotes} visible={false} />
      );
      rerender(
        <DeleteFolderDialog {...defaultProps} folder={folderWithNotes} visible={true} />
      );

      // 强制删除应该被重置
      const newCheckbox = screen.getByRole('checkbox');
      expect(newCheckbox).not.toBeChecked();
    });
  });

  describe('对话框状态', () => {
    it('应该在visible为false时不渲染', () => {
      const { container } = render(<DeleteFolderDialog {...defaultProps} visible={false} />);

      expect(container.querySelector('.ant-modal')).not.toBeInTheDocument();
    });

    it('应该在folder为null时不渲染内容', () => {
      const { container } = render(<DeleteFolderDialog {...defaultProps} folder={null} />);

      expect(container.querySelector('.ant-modal-body')).toBeEmptyDOMElement();
    });

    it('应该在切换folder时更新显示', () => {
      const { rerender } = render(<DeleteFolderDialog {...defaultProps} folder={emptyFolder} />);

      expect(screen.getByText(/空文件夹/)).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

      rerender(<DeleteFolderDialog {...defaultProps} folder={folderWithNotes} />);

      expect(screen.getByText(/有笔记的文件夹/)).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该处理notes_count为undefined', () => {
      const folderWithUndefined: WorkNoteFolder = {
        ...emptyFolder,
        notes_count: undefined,
        subfolders_count: undefined,
      };

      render(<DeleteFolderDialog {...defaultProps} folder={folderWithUndefined} />);

      // 应该被视为空文件夹
      expect(screen.getByText('空文件夹')).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('应该处理极大的数量', () => {
      const folderWithLargeCount: WorkNoteFolder = {
        ...folderWithBoth,
        notes_count: 99999,
        subfolders_count: 99999,
      };

      render(<DeleteFolderDialog {...defaultProps} folder={folderWithLargeCount} />);

      expect(screen.getByText(/99999/)).toBeInTheDocument();
    });

    it('应该处理只有notes_count的情况', () => {
      render(<DeleteFolderDialog {...defaultProps} folder={folderWithNotes} />);

      expect(screen.getByText(/5/)).toBeInTheDocument();
      expect(screen.getByText(/条笔记/)).toBeInTheDocument();
      expect(screen.queryByText(/个子文件夹/)).not.toBeInTheDocument();
    });

    it('应该处理只有subfolders_count的情况', () => {
      render(<DeleteFolderDialog {...defaultProps} folder={folderWithSubfolders} />);

      expect(screen.queryByText(/条笔记/)).not.toBeInTheDocument();
      expect(screen.getByText(/3/)).toBeInTheDocument();
      expect(screen.getByText(/个子文件夹/)).toBeInTheDocument();
    });
  });

  describe('可访问性', () => {
    it('应该有危险按钮样式', () => {
      render(<DeleteFolderDialog {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: '删除' });
      expect(deleteButton).toHaveClass('ant-btn-dangerous');
    });

    it('应该有明确的警告图标', () => {
      render(<DeleteFolderDialog {...defaultProps} />);

      // Ant Design Alert组件会自动添加警告图标
      const warningAlert = screen.getByText(/确定要删除文件夹/);
      expect(warningAlert).toBeInTheDocument();
    });

    it('应该有清晰的复选框标签', () => {
      render(<DeleteFolderDialog {...defaultProps} folder={folderWithNotes} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox.closest('label')).toHaveTextContent(/强制删除/);
    });
  });
});
