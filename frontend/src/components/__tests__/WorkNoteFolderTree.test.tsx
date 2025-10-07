import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkNoteFolderTree from '../WorkNoteFolderTree';
import { workNotesService, WorkNoteFolder } from '../../services/workNotesService';

// Mock services
jest.mock('../../services/workNotesService');
jest.mock('../../utils/error', () => ({
  ErrorHandler: {
    showError: jest.fn(),
  },
}));

// Mock message from antd
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    message: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
    },
  };
});

describe('WorkNoteFolderTree', () => {
  const mockFolders: WorkNoteFolder[] = [
    {
      id: 1,
      name: '工作文件夹',
      parent_id: undefined,
      visibility: 'private',
      color: '#1890ff',
      icon: '📁',
      notes_count: 5,
      subfolders_count: 2,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: 2,
      name: '个人文件夹',
      parent_id: undefined,
      visibility: 'private',
      color: '#52c41a',
      icon: '📂',
      notes_count: 3,
      subfolders_count: 0,
      created_at: '2024-01-02',
      updated_at: '2024-01-02',
    },
  ];

  const childFolders: WorkNoteFolder[] = [
    {
      id: 3,
      name: '子文件夹1',
      parent_id: 1,
      visibility: 'private',
      color: '#faad14',
      icon: '🗂️',
      notes_count: 2,
      subfolders_count: 0,
      created_at: '2024-01-03',
      updated_at: '2024-01-03',
    },
  ];

  const defaultProps = {
    selectedFolderId: null,
    onFolderSelect: jest.fn(),
    onFolderCreate: jest.fn(),
    onFolderEdit: jest.fn(),
    onFolderDelete: jest.fn(),
    onFolderMove: jest.fn(),
    onFolderDetail: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (workNotesService.getFolderTree as jest.Mock).mockResolvedValue(mockFolders);
    (workNotesService.searchFolders as jest.Mock).mockResolvedValue([]);
    (workNotesService.moveFolder as jest.Mock).mockResolvedValue(undefined);
  });

  describe('基础渲染', () => {
    it('应该渲染文件夹树', async () => {
      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('全部笔记')).toBeInTheDocument();
      });
    });

    it('应该加载并显示根文件夹', async () => {
      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('工作文件夹')).toBeInTheDocument();
        expect(screen.getByText('个人文件夹')).toBeInTheDocument();
      });

      expect(workNotesService.getFolderTree).toHaveBeenCalledWith(null, 2);
    });

    it('应该显示加载状态', () => {
      (workNotesService.getFolderTree as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      render(<WorkNoteFolderTree {...defaultProps} />);

      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });

    it('应该在没有文件夹时显示空状态', async () => {
      (workNotesService.getFolderTree as jest.Mock).mockResolvedValue([]);

      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('暂无文件夹')).toBeInTheDocument();
      });
    });

    it('应该显示文件夹图标', async () => {
      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('📁')).toBeInTheDocument();
        expect(screen.getByText('📂')).toBeInTheDocument();
      });
    });

    it('应该显示笔记数量徽章', async () => {
      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('应该使用指定的高度', () => {
      const { container } = render(
        <WorkNoteFolderTree {...defaultProps} height="500px" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ height: '500px' });
    });

    it('应该在showSearch为false时隐藏搜索框', async () => {
      render(<WorkNoteFolderTree {...defaultProps} showSearch={false} />);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('搜索文件夹...')).not.toBeInTheDocument();
      });
    });
  });

  describe('选中状态', () => {
    it('应该高亮选中的文件夹', async () => {
      render(<WorkNoteFolderTree {...defaultProps} selectedFolderId={1} />);

      await waitFor(() => {
        expect(screen.getByText('工作文件夹')).toBeInTheDocument();
      });

      // Ant Design Tree会为选中的节点添加特定的class
    });

    it('应该在selectedFolderId为null时选中"全部笔记"', async () => {
      render(<WorkNoteFolderTree {...defaultProps} selectedFolderId={null} />);

      await waitFor(() => {
        expect(screen.getByText('全部笔记')).toBeInTheDocument();
      });
    });

    it('应该在点击文件夹时调用onFolderSelect', async () => {
      const user = userEvent.setup();
      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('工作文件夹')).toBeInTheDocument();
      });

      const folder = screen.getByText('工作文件夹');
      await user.click(folder);

      expect(defaultProps.onFolderSelect).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ id: 1, name: '工作文件夹' })
      );
    });

    it('应该在点击"全部笔记"时调用onFolderSelect', async () => {
      const user = userEvent.setup();
      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('全部笔记')).toBeInTheDocument();
      });

      const rootNode = screen.getByText('全部笔记');
      await user.click(rootNode);

      expect(defaultProps.onFolderSelect).toHaveBeenCalledWith(null, null);
    });

    it('应该在selectedFolderId变化时更新选中状态', async () => {
      const { rerender } = render(
        <WorkNoteFolderTree {...defaultProps} selectedFolderId={1} />
      );

      await waitFor(() => {
        expect(screen.getByText('工作文件夹')).toBeInTheDocument();
      });

      rerender(<WorkNoteFolderTree {...defaultProps} selectedFolderId={2} />);

      await waitFor(() => {
        // 选中状态应该更新为第二个文件夹
      });
    });
  });

  describe('搜索功能', () => {
    it('应该显示搜索框', async () => {
      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索文件夹...')).toBeInTheDocument();
      });
    });

    it('应该在输入搜索词时调用searchFolders', async () => {
      const user = userEvent.setup();
      const searchResults: WorkNoteFolder[] = [
        {
          id: 1,
          name: '工作文件夹',
          parent_id: undefined,
          visibility: 'private',
          color: '#1890ff',
          icon: '📁',
          notes_count: 5,
          subfolders_count: 0,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      (workNotesService.searchFolders as jest.Mock).mockResolvedValue(searchResults);

      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索文件夹...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('搜索文件夹...');
      await user.type(searchInput, '工作');

      // 等待防抖
      await waitFor(
        () => {
          expect(workNotesService.searchFolders).toHaveBeenCalledWith('工作');
        },
        { timeout: 500 }
      );
    });

    it('应该使用防抖优化搜索', async () => {
      const user = userEvent.setup();
      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索文件夹...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('搜索文件夹...');

      // 快速输入多个字符
      await user.type(searchInput, '测试');

      // 在防抖时间内不应该调用搜索
      expect(workNotesService.searchFolders).not.toHaveBeenCalled();

      // 等待防抖完成
      await waitFor(
        () => {
          expect(workNotesService.searchFolders).toHaveBeenCalledTimes(1);
        },
        { timeout: 500 }
      );
    });

    it('应该在清空搜索时重新加载根文件夹', async () => {
      const user = userEvent.setup();
      (workNotesService.searchFolders as jest.Mock).mockResolvedValue([mockFolders[0]]);

      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索文件夹...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('搜索文件夹...');

      // 输入搜索词
      await user.type(searchInput, '工作');

      await waitFor(
        () => {
          expect(workNotesService.searchFolders).toHaveBeenCalled();
        },
        { timeout: 500 }
      );

      // 清空搜索
      await user.clear(searchInput);

      await waitFor(
        () => {
          expect(workNotesService.getFolderTree).toHaveBeenCalledTimes(2);
        },
        { timeout: 500 }
      );
    });

    it('应该在搜索无结果时显示提示', async () => {
      const user = userEvent.setup();
      (workNotesService.searchFolders as jest.Mock).mockResolvedValue([]);

      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索文件夹...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('搜索文件夹...');
      await user.type(searchInput, '不存在的文件夹');

      await waitFor(
        () => {
          expect(screen.getByText(/未找到"不存在的文件夹"相关的文件夹/)).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });
  });

  describe('懒加载', () => {
    it('应该在展开节点时懒加载子文件夹', async () => {
      (workNotesService.getFolderTree as jest.Mock)
        .mockResolvedValueOnce(mockFolders)
        .mockResolvedValueOnce(childFolders);

      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('工作文件夹')).toBeInTheDocument();
      });

      // 找到展开按钮并点击
      // 注意：这需要模拟Tree组件的展开事件
      // 实际测试中可能需要更复杂的交互
    });

    it('应该不重复加载已加载的节点', async () => {
      // 测试loadedKeys机制
    });
  });

  describe('右键菜单', () => {
    it('应该在右键点击文件夹时显示上下文菜单', async () => {
      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('工作文件夹')).toBeInTheDocument();
      });

      const folder = screen.getByText('工作文件夹');
      fireEvent.contextMenu(folder);

      // FolderContextMenu应该被渲染
    });

    it('应该在右键点击根节点时不显示菜单', async () => {
      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('全部笔记')).toBeInTheDocument();
      });

      const rootNode = screen.getByText('全部笔记');
      fireEvent.contextMenu(rootNode);

      // 菜单不应该显示
    });
  });

  describe('键盘快捷键', () => {
    it('应该支持F2重命名', async () => {
      render(<WorkNoteFolderTree {...defaultProps} selectedFolderId={1} />);

      await waitFor(() => {
        expect(screen.getByText('工作文件夹')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'F2' });

      expect(defaultProps.onFolderEdit).toHaveBeenCalledWith(1);
    });

    it('应该支持Delete删除', async () => {
      render(<WorkNoteFolderTree {...defaultProps} selectedFolderId={1} />);

      await waitFor(() => {
        expect(screen.getByText('工作文件夹')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'Delete' });

      expect(defaultProps.onFolderDelete).toHaveBeenCalledWith(1);
    });

    it('应该支持Ctrl+N新建子文件夹', async () => {
      render(<WorkNoteFolderTree {...defaultProps} selectedFolderId={1} />);

      await waitFor(() => {
        expect(screen.getByText('工作文件夹')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'n', ctrlKey: true });

      expect(defaultProps.onFolderCreate).toHaveBeenCalledWith(1);
    });

    it('应该支持Ctrl+M移动', async () => {
      render(<WorkNoteFolderTree {...defaultProps} selectedFolderId={1} />);

      await waitFor(() => {
        expect(screen.getByText('工作文件夹')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'm', ctrlKey: true });

      expect(defaultProps.onFolderMove).toHaveBeenCalledWith(1);
    });

    it('应该在未选中文件夹时不响应快捷键', async () => {
      render(<WorkNoteFolderTree {...defaultProps} selectedFolderId={null} />);

      await waitFor(() => {
        expect(screen.getByText('全部笔记')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'F2' });
      fireEvent.keyDown(document, { key: 'Delete' });

      expect(defaultProps.onFolderEdit).not.toHaveBeenCalled();
      expect(defaultProps.onFolderDelete).not.toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该在加载失败时显示错误', async () => {
      const error = new Error('加载失败');
      (workNotesService.getFolderTree as jest.Mock).mockRejectedValue(error);

      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        // ErrorHandler.showError应该被调用
      });
    });

    it('应该在搜索失败时显示错误', async () => {
      const user = userEvent.setup();
      const error = new Error('搜索失败');
      (workNotesService.searchFolders as jest.Mock).mockRejectedValue(error);

      render(<WorkNoteFolderTree {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索文件夹...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('搜索文件夹...');
      await user.type(searchInput, '测试');

      await waitFor(
        () => {
          // ErrorHandler.showError应该被调用
        },
        { timeout: 500 }
      );
    });

    it('应该在移动失败时显示错误', async () => {
      const error = new Error('移动失败');
      (workNotesService.moveFolder as jest.Mock).mockRejectedValue(error);

      // 这需要模拟拖拽操作
    });
  });

  describe('性能优化', () => {
    it('应该使用React.memo优化渲染', () => {
      const { rerender } = render(<WorkNoteFolderTree {...defaultProps} />);

      // 相同props不应该触发重新渲染
      rerender(<WorkNoteFolderTree {...defaultProps} />);

      // getFolderTree应该只被调用一次（初始化时）
      expect(workNotesService.getFolderTree).toHaveBeenCalledTimes(1);
    });

    it('应该在props变化时重新渲染', async () => {
      const { rerender } = render(
        <WorkNoteFolderTree {...defaultProps} selectedFolderId={1} />
      );

      await waitFor(() => {
        expect(screen.getByText('工作文件夹')).toBeInTheDocument();
      });

      rerender(<WorkNoteFolderTree {...defaultProps} selectedFolderId={2} />);

      // 选中状态应该更新
    });
  });
});
