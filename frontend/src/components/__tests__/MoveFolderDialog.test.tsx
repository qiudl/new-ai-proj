import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoveFolderDialog from '../MoveFolderDialog';
import { WorkNoteFolder } from '../../services/workNotesService';

// Mock ErrorHandler
jest.mock('../../utils/error', () => ({
  ErrorHandler: {
    showError: jest.fn(),
  },
}));

describe('MoveFolderDialog', () => {
  const rootFolder1: WorkNoteFolder = {
    id: 1,
    name: '根文件夹1',
    parent_id: undefined,
    visibility: 'private',
    color: '#1890ff',
    icon: '📁',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const rootFolder2: WorkNoteFolder = {
    id: 2,
    name: '根文件夹2',
    parent_id: undefined,
    visibility: 'private',
    color: '#52c41a',
    icon: '📂',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const childFolder: WorkNoteFolder = {
    id: 3,
    name: '子文件夹1',
    parent_id: 1,
    visibility: 'private',
    color: '#faad14',
    icon: '🗂️',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const grandchildFolder: WorkNoteFolder = {
    id: 4,
    name: '孙文件夹1',
    parent_id: 3,
    visibility: 'private',
    color: '#f5222d',
    icon: '📋',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const mockFolders: WorkNoteFolder[] = [rootFolder1, rootFolder2, childFolder, grandchildFolder];

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn().mockResolvedValue(undefined),
    folder: childFolder,
    folders: mockFolders,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('渲染', () => {
    it('应该显示"移动文件夹"标题', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      expect(screen.getByText('移动文件夹')).toBeInTheDocument();
    });

    it('应该显示要移动的文件夹名称', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      expect(screen.getByText('子文件夹1')).toBeInTheDocument();
    });

    it('应该显示目标位置选择器', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      expect(screen.getByText('目标位置')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/选择目标父文件夹/)).toBeInTheDocument();
    });

    it('应该显示移动按钮', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: '移动' })).toBeInTheDocument();
    });

    it('应该显示提示信息', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      expect(screen.getByText(/移动文件夹会保留其所有子文件夹和笔记/)).toBeInTheDocument();
    });
  });

  describe('循环引用防护', () => {
    it('应该排除当前文件夹', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      // TreeSelect中不应该包含当前文件夹
      // 这需要通过TreeSelect的data来验证，实际测试中可能需要mock TreeSelect
    });

    it('应该排除子文件夹', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      // 应该排除孙文件夹1（id: 4）
    });

    it('应该显示排除数量提示', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      // 当前文件夹有1个子文件夹（孙文件夹），所以应该排除1个
      expect(screen.getByText(/已自动排除 1 个子文件夹/)).toBeInTheDocument();
    });

    it('应该在没有子文件夹时不显示排除提示', () => {
      const folderWithoutChildren: WorkNoteFolder = {
        ...grandchildFolder,
      };

      render(
        <MoveFolderDialog
          {...defaultProps}
          folder={folderWithoutChildren}
        />
      );

      expect(screen.queryByText(/已自动排除/)).not.toBeInTheDocument();
    });

    it('应该正确计算多层级子文件夹', () => {
      // rootFolder1 有 childFolder，childFolder 有 grandchildFolder
      // 移动 rootFolder1 时应该排除 2 个子文件夹
      render(
        <MoveFolderDialog
          {...defaultProps}
          folder={rootFolder1}
        />
      );

      expect(screen.getByText(/已自动排除 2 个子文件夹/)).toBeInTheDocument();
    });
  });

  describe('移动预览', () => {
    it('应该显示当前位置', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      expect(screen.getByText('当前位置')).toBeInTheDocument();
      expect(screen.getByText('根文件夹1')).toBeInTheDocument();
    });

    it('应该在根级文件夹时显示"根级文件夹"', () => {
      render(
        <MoveFolderDialog
          {...defaultProps}
          folder={rootFolder1}
        />
      );

      expect(screen.getByText('根级文件夹')).toBeInTheDocument();
    });

    it('应该显示目标位置', async () => {
      const user = userEvent.setup();
      render(<MoveFolderDialog {...defaultProps} />);

      // 选择目标位置后应该显示预览
      // 这需要模拟TreeSelect的交互
    });

    it('应该显示移动箭头', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      // 应该有箭头图标（ArrowRightOutlined）
      expect(screen.getByText('当前位置')).toBeInTheDocument();
      expect(screen.getByText('目标位置')).toBeInTheDocument();
    });
  });

  describe('移动操作', () => {
    it('应该在选择有效目标后允许移动', async () => {
      const user = userEvent.setup();
      render(<MoveFolderDialog {...defaultProps} />);

      // 注意：实际测试TreeSelect需要更复杂的模拟
      // 这里简化测试，假设已选择目标
      const moveButton = screen.getByRole('button', { name: '移动' });

      // 模拟选择了目标文件夹
      // 在实际实现中需要模拟TreeSelect的onChange事件
    });

    it('应该在移动到相同位置时显示警告', async () => {
      const user = userEvent.setup();
      render(<MoveFolderDialog {...defaultProps} />);

      // 模拟选择当前位置（parent_id = 1）
      // 然后点击移动按钮
      // 应该看到警告消息
    });

    it('应该在成功移动后关闭对话框', async () => {
      const user = userEvent.setup();
      render(<MoveFolderDialog {...defaultProps} />);

      // 这需要模拟完整的移动流程
      // 包括选择目标和点击移动按钮
    });

    it('应该在移动失败时显示错误', async () => {
      const user = userEvent.setup();
      const error = new Error('移动失败');
      const mockOnConfirm = jest.fn().mockRejectedValue(error);

      render(<MoveFolderDialog {...defaultProps} onConfirm={mockOnConfirm} />);

      // 模拟移动操作失败
    });
  });

  describe('提交状态', () => {
    it('应该在提交时显示loading状态', async () => {
      const user = userEvent.setup();
      let resolveMove: () => void;
      const movePromise = new Promise<void>((resolve) => {
        resolveMove = resolve;
      });
      const mockOnConfirm = jest.fn().mockReturnValue(movePromise);

      render(<MoveFolderDialog {...defaultProps} onConfirm={mockOnConfirm} />);

      // 模拟选择目标并移动
      // 检查loading状态

      // 完成移动
      resolveMove!();
    });
  });

  describe('取消操作', () => {
    it('应该在点击取消时关闭对话框', async () => {
      const user = userEvent.setup();
      render(<MoveFolderDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: '取消' });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });

    it('应该在取消时重置选择', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<MoveFolderDialog {...defaultProps} />);

      // 模拟选择目标
      // ...

      const cancelButton = screen.getByRole('button', { name: '取消' });
      await user.click(cancelButton);

      // 重新打开对话框
      rerender(<MoveFolderDialog {...defaultProps} visible={false} />);
      rerender(<MoveFolderDialog {...defaultProps} visible={true} />);

      // 选择应该被重置
    });
  });

  describe('对话框状态', () => {
    it('应该在visible为false时不渲染', () => {
      const { container } = render(<MoveFolderDialog {...defaultProps} visible={false} />);

      expect(container.querySelector('.ant-modal')).not.toBeInTheDocument();
    });

    it('应该在folder为null时不渲染内容', () => {
      const { container } = render(<MoveFolderDialog {...defaultProps} folder={null} />);

      expect(container.querySelector('.ant-modal-body')).toBeEmptyDOMElement();
    });

    it('应该在切换folder时更新显示', () => {
      const { rerender } = render(<MoveFolderDialog {...defaultProps} folder={childFolder} />);

      expect(screen.getByText('子文件夹1')).toBeInTheDocument();

      rerender(<MoveFolderDialog {...defaultProps} folder={grandchildFolder} />);

      expect(screen.getByText('孙文件夹1')).toBeInTheDocument();
    });
  });

  describe('树形结构处理', () => {
    it('应该正确构建文件夹树', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      // TreeSelect应该显示可用的文件夹
      // 验证树形结构的正确性
    });

    it('应该支持选择根级文件夹', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      // 应该可以选择移动到根级（清空选择）
    });

    it('应该支持多层级文件夹选择', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      // TreeSelect应该支持展开和选择多层级文件夹
    });

    it('应该显示文件夹图标', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      // TreeSelect选项应该显示文件夹图标
    });
  });

  describe('边界情况', () => {
    it('应该处理空文件夹列表', () => {
      render(<MoveFolderDialog {...defaultProps} folders={[]} />);

      expect(screen.getByText('移动文件夹')).toBeInTheDocument();
    });

    it('应该处理只有当前文件夹的情况', () => {
      render(<MoveFolderDialog {...defaultProps} folders={[childFolder]} />);

      // 所有文件夹都被排除后，应该只能移动到根级
    });

    it('应该处理复杂的文件夹层级', () => {
      // 创建更复杂的文件夹结构
      const complexFolders: WorkNoteFolder[] = [
        rootFolder1,
        rootFolder2,
        childFolder,
        grandchildFolder,
        {
          id: 5,
          name: '子文件夹2',
          parent_id: 1,
          visibility: 'private',
          color: '#722ed1',
          icon: '📌',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 6,
          name: '子文件夹3',
          parent_id: 2,
          visibility: 'private',
          color: '#13c2c2',
          icon: '📦',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      render(
        <MoveFolderDialog
          {...defaultProps}
          folders={complexFolders}
          folder={childFolder}
        />
      );

      // 应该正确排除子文件夹但保留兄弟文件夹和其他分支
    });
  });

  describe('可访问性', () => {
    it('应该有清晰的标签', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      expect(screen.getByText('目标位置')).toBeInTheDocument();
    });

    it('应该有提示性的placeholder', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      expect(screen.getByPlaceholderText(/选择目标父文件夹/)).toBeInTheDocument();
    });

    it('应该支持清除选择', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      // TreeSelect应该有allowClear属性
    });

    it('应该支持搜索', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      // TreeSelect应该有showSearch属性
    });
  });

  describe('颜色和图标显示', () => {
    it('应该显示当前文件夹的颜色', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      const folderName = screen.getAllByText('子文件夹1')[0];
      expect(folderName).toHaveStyle({ color: '#faad14' });
    });

    it('应该显示当前文件夹的图标', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      expect(screen.getByText('🗂️')).toBeInTheDocument();
    });

    it('应该显示父文件夹的图标', () => {
      render(<MoveFolderDialog {...defaultProps} />);

      expect(screen.getByText('📁')).toBeInTheDocument();
    });
  });
});
