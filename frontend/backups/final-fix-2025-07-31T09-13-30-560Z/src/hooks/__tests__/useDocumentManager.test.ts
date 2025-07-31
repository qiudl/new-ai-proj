/**
 * useDocumentManager Hook 单元测试
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { message } from 'antd';
import useDocumentManager from '../useDocumentManager';
import * as documentService from '../../services/unifiedDocumentService';
import * as cacheHook from '../useCache';

// Mock 依赖
jest.mock('../../services/unifiedDocumentService');
jest.mock('../useCache');
jest.mock('antd', () => ({
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn()
  }
}));

const mockDocumentService = documentService as jest.Mocked<typeof documentService>;
const mockCacheHook = cacheHook as jest.Mocked<typeof cacheHook>;

describe('useDocumentManager', () => {
  const mockDocuments = [
    {
      id: 1,
      title: 'Test Document 1',
      type: 'markdown',
      status: 'draft',
      tags: ['test'],
      created_at: '2023-01-01',
      updated_at: '2023-01-02',
      owner_name: 'Test User'
    },
    {
      id: 2,
      title: 'Test Document 2',
      type: 'pdf',
      status: 'published',
      tags: ['important'],
      created_at: '2023-01-03',
      updated_at: '2023-01-04',
      owner_name: 'Test User 2'
    }
  ];

  const mockCacheReturn = {
    data: null,
    setData: jest.fn(),
    clearCache: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheHook.useCache.mockReturnValue(mockCacheReturn);
    mockDocumentService.default = {
      getDocuments: jest.fn(),
      getAllDocuments: jest.fn(),
      deleteDocument: jest.fn(),
      updateDocument: jest.fn(),
      createDocument: jest.fn()
    } as any;
  });

  describe('初始化测试', () => {
    it('应该正确初始化状态', () => {
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple',
          projectId: 1
        })
      );

      expect(result.current.documents).toEqual([]);
      expect(result.current.total).toBe(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.page).toBe(1);
      expect(result.current.searchText).toBe('');
      expect(result.current.selectedDocuments).toEqual([]);
      expect(result.current.isSelectMode).toBe(false);
    });

    it('应该使用自定义初始参数', () => {
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'advanced',
          folderId: 2,
          initialPageSize: 50
        })
      );

      expect(result.current.pageSize).toBe(50);
    });
  });

  describe('数据加载测试', () => {
    it('应该在简洁模式下加载文档', async () => {
      const mockResult = {
        documents: mockDocuments,
        total: 2
      };

      mockDocumentService.default.getAllDocuments.mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple',
          projectId: 1
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.documents).toEqual(mockDocuments);
      expect(result.current.total).toBe(2);
      expect(mockDocumentService.default.getAllDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 1,
          page: 1,
          limit: 20
        })
      );
    });

    it('应该在高级模式下加载文档', async () => {
      const mockResult = {
        documents: mockDocuments,
        total: 2
      };

      mockDocumentService.default.getDocuments.mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'advanced',
          folderId: 1
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.documents).toEqual(mockDocuments);
      expect(result.current.total).toBe(2);
      expect(mockDocumentService.default.getDocuments).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          folder_id: 1,
          page: 1,
          limit: 20
        })
      );
    });

    it('应该处理加载错误', async () => {
      const error = new Error('Failed to load documents');
      mockDocumentService.default.getAllDocuments.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load documents');
      expect(message.error).toHaveBeenCalledWith('Failed to load documents');
    });
  });

  describe('搜索功能测试', () => {
    it('应该防抖搜索', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      act(() => {
        result.current.debouncedSearch('test');
      });

      act(() => {
        result.current.debouncedSearch('test query');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current.searchText).toBe('test query');
      
      jest.useRealTimers();
    });

    it('应该在搜索时重置页码', async () => {
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      act(() => {
        result.current.updateState({ page: 3 });
      });

      expect(result.current.page).toBe(3);

      act(() => {
        result.current.debouncedSearch('search term');
      });

      // 搜索后应该重置到第一页
      await waitFor(() => {
        expect(result.current.page).toBe(1);
      });
    });
  });

  describe('状态管理测试', () => {
    it('应该更新状态', () => {
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      act(() => {
        result.current.updateState({
          filterStatus: 'published',
          sortBy: 'title'
        });
      });

      expect(result.current.filterStatus).toBe('published');
      expect(result.current.sortBy).toBe('title');
    });

    it('应该重置状态', () => {
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      act(() => {
        result.current.updateState({
          page: 3,
          searchText: 'test',
          selectedDocuments: [1, 2],
          isSelectMode: true
        });
      });

      act(() => {
        result.current.resetState();
      });

      expect(result.current.page).toBe(1);
      expect(result.current.searchText).toBe('');
      expect(result.current.selectedDocuments).toEqual([]);
      expect(result.current.isSelectMode).toBe(false);
    });
  });

  describe('文档操作测试', () => {
    it('应该删除文档', async () => {
      mockDocumentService.default.deleteDocument.mockResolvedValue(undefined);
      
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      // 设置初始文档
      act(() => {
        result.current.updateState({
          documents: mockDocuments,
          total: 2
        });
      });

      await act(async () => {
        await result.current.deleteDocument(1);
      });

      expect(mockDocumentService.default.deleteDocument).toHaveBeenCalledWith(1);
      expect(message.success).toHaveBeenCalledWith('文档删除成功');
      expect(result.current.documents).toHaveLength(1);
      expect(result.current.documents[0].id).toBe(2);
    });

    it('应该批量删除文档', async () => {
      mockDocumentService.default.deleteDocument.mockResolvedValue(undefined);
      
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      // 设置初始文档和选中状态
      act(() => {
        result.current.updateState({
          documents: mockDocuments,
          selectedDocuments: [1, 2],
          isSelectMode: true,
          total: 2
        });
      });

      await act(async () => {
        await result.current.batchDelete([1, 2]);
      });

      expect(mockDocumentService.default.deleteDocument).toHaveBeenCalledTimes(2);
      expect(message.success).toHaveBeenCalledWith('成功删除 2 个文档');
      expect(result.current.documents).toHaveLength(0);
      expect(result.current.selectedDocuments).toEqual([]);
      expect(result.current.isSelectMode).toBe(false);
    });

    it('应该处理删除错误', async () => {
      const error = new Error('Delete failed');
      mockDocumentService.default.deleteDocument.mockRejectedValue(error);
      
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      await act(async () => {
        await result.current.deleteDocument(1);
      });

      expect(message.error).toHaveBeenCalledWith('Delete failed');
    });
  });

  describe('选择模式测试', () => {
    it('应该切换选择模式', () => {
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      act(() => {
        result.current.toggleSelectMode();
      });

      expect(result.current.isSelectMode).toBe(true);
      expect(result.current.selectedDocuments).toEqual([]);

      act(() => {
        result.current.toggleSelectMode();
      });

      expect(result.current.isSelectMode).toBe(false);
    });

    it('应该切换文档选择', () => {
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      act(() => {
        result.current.toggleDocumentSelection(1);
      });

      expect(result.current.selectedDocuments).toEqual([1]);

      act(() => {
        result.current.toggleDocumentSelection(2);
      });

      expect(result.current.selectedDocuments).toEqual([1, 2]);

      act(() => {
        result.current.toggleDocumentSelection(1);
      });

      expect(result.current.selectedDocuments).toEqual([2]);
    });

    it('应该全选/取消全选', () => {
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      // 设置文档数据
      act(() => {
        result.current.updateState({
          documents: mockDocuments
        });
      });

      // 全选
      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedDocuments).toEqual([1, 2]);

      // 取消全选
      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedDocuments).toEqual([]);
    });
  });

  describe('缓存功能测试', () => {
    it('应该使用缓存数据', async () => {
      mockCacheReturn.data = mockDocuments;
      mockCacheHook.useCache.mockReturnValue(mockCacheReturn);

      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple',
          enableCache: true
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.documents).toEqual(mockDocuments);
      // 不应该调用API，因为使用了缓存
      expect(mockDocumentService.default.getAllDocuments).not.toHaveBeenCalled();
    });

    it('应该清除缓存', () => {
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple',
          enableCache: true
        })
      );

      act(() => {
        result.current.clearCache();
      });

      expect(mockCacheReturn.clearCache).toHaveBeenCalled();
    });
  });

  describe('分页功能测试', () => {
    it('应该提供正确的分页配置', () => {
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      act(() => {
        result.current.updateState({
          total: 100,
          page: 2,
          pageSize: 20
        });
      });

      expect(result.current.pagination).toEqual({
        current: 2,
        pageSize: 20,
        total: 100,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: expect.any(Function),
        onChange: expect.any(Function)
      });
    });

    it('应该处理分页变化', () => {
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      act(() => {
        result.current.pagination.onChange(3, 50);
      });

      expect(result.current.page).toBe(3);
      expect(result.current.pageSize).toBe(50);
    });
  });

  describe('计算属性测试', () => {
    it('应该正确计算 hasDocuments', () => {
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      expect(result.current.hasDocuments).toBe(false);

      act(() => {
        result.current.updateState({
          documents: mockDocuments
        });
      });

      expect(result.current.hasDocuments).toBe(true);
    });

    it('应该正确计算 hasSelection', () => {
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      expect(result.current.hasSelection).toBe(false);

      act(() => {
        result.current.updateState({
          selectedDocuments: [1]
        });
      });

      expect(result.current.hasSelection).toBe(true);
    });

    it('应该正确计算 isAllSelected', () => {
      const { result } = renderHook(() =>
        useDocumentManager({
          mode: 'simple'
        })
      );

      act(() => {
        result.current.updateState({
          documents: mockDocuments,
          selectedDocuments: [1, 2]
        });
      });

      expect(result.current.isAllSelected).toBe(true);

      act(() => {
        result.current.updateState({
          selectedDocuments: [1]
        });
      });

      expect(result.current.isAllSelected).toBe(false);
    });
  });

  describe('自动刷新测试', () => {
    it('应该支持自动刷新', async () => {
      jest.useFakeTimers();
      
      mockDocumentService.default.getAllDocuments.mockResolvedValue({
        documents: mockDocuments,
        total: 2
      });

      renderHook(() =>
        useDocumentManager({
          mode: 'simple',
          autoRefresh: true,
          refreshInterval: 5000
        })
      );

      // 快进5秒
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockDocumentService.default.getAllDocuments).toHaveBeenCalledTimes(2); // 初始加载 + 自动刷新
      
      jest.useRealTimers();
    });
  });
});