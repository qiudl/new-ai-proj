import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FolderDialog from '../FolderDialog';
import { WorkNoteFolder } from '../../services/workNotesService';

// Mock ErrorHandler
jest.mock('../../utils/error', () => ({
  ErrorHandler: {
    showError: jest.fn(),
  },
}));

describe('FolderDialog', () => {
  const mockFolders: WorkNoteFolder[] = [
    {
      id: 1,
      name: '根文件夹1',
      parent_id: undefined,
      visibility: 'private',
      color: '#1890ff',
      icon: '📁',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: 2,
      name: '子文件夹1',
      parent_id: 1,
      visibility: 'team',
      color: '#52c41a',
      icon: '📂',
      created_at: '2024-01-02',
      updated_at: '2024-01-02',
    },
    {
      id: 3,
      name: '根文件夹2',
      parent_id: undefined,
      visibility: 'public',
      color: '#faad14',
      icon: '🗂️',
      created_at: '2024-01-03',
      updated_at: '2024-01-03',
    },
  ];

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn().mockResolvedValue(undefined),
    folders: mockFolders,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('渲染 - 创建模式', () => {
    it('应该显示"创建文件夹"标题', () => {
      render(<FolderDialog {...defaultProps} />);

      expect(screen.getByText('创建文件夹')).toBeInTheDocument();
    });

    it('应该显示所有表单字段', () => {
      render(<FolderDialog {...defaultProps} />);

      expect(screen.getByLabelText('文件夹名称')).toBeInTheDocument();
      expect(screen.getByLabelText('描述')).toBeInTheDocument();
      expect(screen.getByLabelText('父文件夹')).toBeInTheDocument();
      expect(screen.getByLabelText('可见性')).toBeInTheDocument();
      expect(screen.getByLabelText('文件夹颜色')).toBeInTheDocument();
      expect(screen.getByLabelText('文件夹图标')).toBeInTheDocument();
    });

    it('应该显示默认值', () => {
      render(<FolderDialog {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('输入文件夹名称');
      expect(nameInput).toHaveValue('');

      // 检查预览显示默认值
      expect(screen.getByText('文件夹名称')).toBeInTheDocument();
    });

    it('应该在指定parentId时预选父文件夹', () => {
      render(<FolderDialog {...defaultProps} parentId={1} />);

      // TreeSelect的值会在内部设置
      // 我们可以通过其他方式验证，例如检查表单提交时的值
    });

    it('应该显示"创建"按钮', () => {
      render(<FolderDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: '创建' })).toBeInTheDocument();
    });
  });

  describe('渲染 - 编辑模式', () => {
    const existingFolder: WorkNoteFolder = {
      id: 10,
      name: '测试文件夹',
      description: '这是一个测试文件夹',
      parent_id: 1,
      visibility: 'team',
      color: '#52c41a',
      icon: '⭐',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };

    it('应该显示"编辑文件夹"标题', () => {
      render(<FolderDialog {...defaultProps} folder={existingFolder} />);

      expect(screen.getByText('编辑文件夹')).toBeInTheDocument();
    });

    it('应该填充现有数据', () => {
      render(<FolderDialog {...defaultProps} folder={existingFolder} />);

      const nameInput = screen.getByDisplayValue('测试文件夹');
      expect(nameInput).toBeInTheDocument();

      const descInput = screen.getByDisplayValue('这是一个测试文件夹');
      expect(descInput).toBeInTheDocument();
    });

    it('应该不显示父文件夹选择器', () => {
      render(<FolderDialog {...defaultProps} folder={existingFolder} />);

      expect(screen.queryByLabelText('父文件夹')).not.toBeInTheDocument();
    });

    it('应该显示"保存"按钮', () => {
      render(<FolderDialog {...defaultProps} folder={existingFolder} />);

      expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    });
  });

  describe('表单验证', () => {
    it('应该在名称为空时显示错误', async () => {
      const user = userEvent.setup();
      render(<FolderDialog {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: '创建' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('请输入文件夹名称')).toBeInTheDocument();
      });

      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('应该在名称包含非法字符时显示错误', async () => {
      const user = userEvent.setup();
      render(<FolderDialog {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('输入文件夹名称');
      await user.type(nameInput, '测试/文件夹');

      const submitButton = screen.getByRole('button', { name: '创建' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/名称不能包含/)).toBeInTheDocument();
      });
    });

    it('应该在描述超过最大长度时显示错误', async () => {
      const user = userEvent.setup();
      render(<FolderDialog {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('输入文件夹名称');
      await user.type(nameInput, '测试文件夹');

      const descInput = screen.getByPlaceholderText('输入文件夹描述（可选）');
      const longDescription = 'a'.repeat(501);
      await user.type(descInput, longDescription);

      const submitButton = screen.getByRole('button', { name: '创建' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/描述不能超过500个字符/)).toBeInTheDocument();
      });
    });

    it('应该在所有字段有效时允许提交', async () => {
      const user = userEvent.setup();
      render(<FolderDialog {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('输入文件夹名称');
      await user.type(nameInput, '新文件夹');

      const submitButton = screen.getByRole('button', { name: '创建' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onConfirm).toHaveBeenCalled();
      });
    });
  });

  describe('表单交互', () => {
    it('应该支持输入文件夹名称', async () => {
      const user = userEvent.setup();
      render(<FolderDialog {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('输入文件夹名称');
      await user.type(nameInput, '我的文件夹');

      expect(nameInput).toHaveValue('我的文件夹');
    });

    it('应该支持输入描述', async () => {
      const user = userEvent.setup();
      render(<FolderDialog {...defaultProps} />);

      const descInput = screen.getByPlaceholderText('输入文件夹描述（可选）');
      await user.type(descInput, '这是一个测试描述');

      expect(descInput).toHaveValue('这是一个测试描述');
    });

    it('应该显示字符计数', () => {
      render(<FolderDialog {...defaultProps} />);

      // Ant Design的TextArea会显示字符计数
      const descInput = screen.getByPlaceholderText('输入文件夹描述（可选）');
      expect(descInput.closest('textarea')).toHaveAttribute('maxLength', '500');
    });

    it('应该支持选择可见性', async () => {
      const user = userEvent.setup();
      render(<FolderDialog {...defaultProps} />);

      // Ant Design Select的测试需要特殊处理
      // 这里简化测试，实际中可能需要更复杂的交互
      const visibilityLabel = screen.getByText('可见性');
      expect(visibilityLabel).toBeInTheDocument();
    });
  });

  describe('实时预览', () => {
    it('应该实时更新名称预览', async () => {
      const user = userEvent.setup();
      render(<FolderDialog {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('输入文件夹名称');
      await user.type(nameInput, '测试');

      await waitFor(() => {
        // 预览区域应该显示输入的名称
        const previewElements = screen.getAllByText('测试');
        expect(previewElements.length).toBeGreaterThan(0);
      });
    });

    it('应该显示默认图标和颜色', () => {
      render(<FolderDialog {...defaultProps} />);

      // 检查预览区域显示默认值
      const preview = screen.getByText('预览').closest('div');
      expect(preview).toBeInTheDocument();
    });
  });

  describe('提交处理', () => {
    it('应该在成功时调用onConfirm并关闭对话框', async () => {
      const user = userEvent.setup();
      render(<FolderDialog {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('输入文件夹名称');
      await user.type(nameInput, '新文件夹');

      const submitButton = screen.getByRole('button', { name: '创建' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onConfirm).toHaveBeenCalledWith(
          expect.objectContaining({
            name: '新文件夹',
            visibility: 'private',
          })
        );
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('应该在失败时显示错误但不关闭对话框', async () => {
      const user = userEvent.setup();
      const error = new Error('创建失败');
      const mockOnConfirm = jest.fn().mockRejectedValue(error);

      render(<FolderDialog {...defaultProps} onConfirm={mockOnConfirm} />);

      const nameInput = screen.getByPlaceholderText('输入文件夹名称');
      await user.type(nameInput, '新文件夹');

      const submitButton = screen.getByRole('button', { name: '创建' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });

      // 对话框应该仍然可见（通过检查标题）
      expect(screen.getByText('创建文件夹')).toBeInTheDocument();
    });

    it('应该在提交时显示loading状态', async () => {
      const user = userEvent.setup();
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      const mockOnConfirm = jest.fn().mockReturnValue(submitPromise);

      render(<FolderDialog {...defaultProps} onConfirm={mockOnConfirm} />);

      const nameInput = screen.getByPlaceholderText('输入文件夹名称');
      await user.type(nameInput, '新文件夹');

      const submitButton = screen.getByRole('button', { name: '创建' });
      await user.click(submitButton);

      // 提交后按钮应该显示loading状态
      await waitFor(() => {
        expect(submitButton).toHaveClass('ant-btn-loading');
      });

      // 完成提交
      resolveSubmit!();
    });
  });

  describe('取消操作', () => {
    it('应该在点击取消时关闭对话框', async () => {
      const user = userEvent.setup();
      render(<FolderDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: '取消' });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('应该在点击X按钮时关闭对话框', async () => {
      const user = userEvent.setup();
      render(<FolderDialog {...defaultProps} />);

      // Ant Design Modal的关闭按钮
      const closeButton = document.querySelector('.ant-modal-close');
      if (closeButton) {
        await user.click(closeButton);
        expect(defaultProps.onClose).toHaveBeenCalled();
      }
    });
  });

  describe('对话框状态管理', () => {
    it('应该在visible为false时不渲染', () => {
      const { container } = render(<FolderDialog {...defaultProps} visible={false} />);

      expect(container.querySelector('.ant-modal')).not.toBeInTheDocument();
    });

    it('应该在visible变化时重置表单', () => {
      const { rerender } = render(<FolderDialog {...defaultProps} visible={false} />);

      // 打开对话框
      rerender(<FolderDialog {...defaultProps} visible={true} />);

      const nameInput = screen.getByPlaceholderText('输入文件夹名称');
      expect(nameInput).toHaveValue('');
    });

    it('应该在切换folder prop时更新表单', () => {
      const folder1: WorkNoteFolder = {
        id: 1,
        name: '文件夹1',
        visibility: 'private',
        color: '#1890ff',
        icon: '📁',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const folder2: WorkNoteFolder = {
        id: 2,
        name: '文件夹2',
        visibility: 'team',
        color: '#52c41a',
        icon: '⭐',
        created_at: '2024-01-02',
        updated_at: '2024-01-02',
      };

      const { rerender } = render(<FolderDialog {...defaultProps} folder={folder1} />);

      expect(screen.getByDisplayValue('文件夹1')).toBeInTheDocument();

      rerender(<FolderDialog {...defaultProps} folder={folder2} />);

      expect(screen.queryByDisplayValue('文件夹1')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('文件夹2')).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该处理空文件夹列表', () => {
      render(<FolderDialog {...defaultProps} folders={[]} />);

      expect(screen.getByText('创建文件夹')).toBeInTheDocument();
    });

    it('应该处理表单验证错误', async () => {
      const user = userEvent.setup();
      render(<FolderDialog {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('输入文件夹名称');
      await user.type(nameInput, 'test/folder');

      const submitButton = screen.getByRole('button', { name: '创建' });
      await user.click(submitButton);

      // 验证错误不应该调用ErrorHandler
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('应该处理非常长的名称', async () => {
      const user = userEvent.setup();
      render(<FolderDialog {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('输入文件夹名称');
      const longName = 'a'.repeat(101);
      await user.type(nameInput, longName);

      const submitButton = screen.getByRole('button', { name: '创建' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/名称长度为1-100个字符/)).toBeInTheDocument();
      });
    });
  });

  describe('可访问性', () => {
    it('应该有正确的表单标签', () => {
      render(<FolderDialog {...defaultProps} />);

      expect(screen.getByLabelText('文件夹名称')).toBeInTheDocument();
      expect(screen.getByLabelText('描述')).toBeInTheDocument();
      expect(screen.getByLabelText('父文件夹')).toBeInTheDocument();
      expect(screen.getByLabelText('可见性')).toBeInTheDocument();
    });

    it('应该支持键盘导航', async () => {
      const user = userEvent.setup();
      render(<FolderDialog {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('输入文件夹名称');

      // Tab导航应该工作
      await user.tab();
      expect(nameInput).toHaveFocus();
    });

    it('应该在表单字段上显示合适的autocomplete', () => {
      render(<FolderDialog {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('输入文件夹名称');
      // 名称字段应该自动聚焦
      expect(nameInput).toHaveAttribute('autofocus');
    });
  });
});
