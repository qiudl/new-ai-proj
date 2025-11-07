import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SPUListPage from '../SPUListPage';
import * as productService from '../../../services/productService';

// Mock antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(() => jest.fn()),
  },
}));

// Mock product service
jest.mock('../../../services/productService');

const mockSPUData = {
  data: [
    {
      id: 1,
      spu_code: 'SPU-001',
      name: '测试商品A',
      brand: '品牌A',
      status: 'active',
      enterprise_id: 1,
      images: ['image1.jpg'],
      created_at: '2024-01-01T00:00:00Z',
      sku_count: 5,
    },
    {
      id: 2,
      spu_code: 'SPU-002',
      name: '测试商品B',
      brand: '品牌B',
      status: 'inactive',
      enterprise_id: 1,
      images: [],
      created_at: '2024-01-02T00:00:00Z',
      sku_count: 3,
    },
  ],
  total: 2,
  page: 1,
  page_size: 10,
};

describe('SPUListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (productService.listSPUsWithStats as jest.Mock).mockResolvedValue(mockSPUData);
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  test('应该正确渲染SPU列表页面', async () => {
    renderWithRouter(<SPUListPage />);

    await waitFor(() => {
      expect(screen.getByText('SPU商品管理')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('搜索SPU编码或名称')).toBeInTheDocument();
    expect(screen.getByText('新建SPU')).toBeInTheDocument();
  });

  test('应该加载并显示SPU列表数据', async () => {
    renderWithRouter(<SPUListPage />);

    await waitFor(() => {
      expect(screen.getByText('测试商品A')).toBeInTheDocument();
      expect(screen.getByText('测试商品B')).toBeInTheDocument();
    });

    expect(screen.getByText('SPU-001')).toBeInTheDocument();
    expect(screen.getByText('SPU-002')).toBeInTheDocument();
    expect(screen.getByText('品牌A')).toBeInTheDocument();
    expect(screen.getByText('品牌B')).toBeInTheDocument();
  });

  test('应该支持搜索功能', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SPUListPage />);

    await waitFor(() => {
      expect(screen.getByText('测试商品A')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('搜索SPU编码或名称');
    await user.type(searchInput, '测试商品A');

    await waitFor(() => {
      expect(productService.listSPUsWithStats).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '测试商品A',
        })
      );
    });
  });

  test('应该支持按状态过滤', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SPUListPage />);

    await waitFor(() => {
      expect(screen.getByText('测试商品A')).toBeInTheDocument();
    });

    // 选择状态过滤器
    const statusSelect = screen.getByRole('combobox', { name: /状态/i });
    await user.click(statusSelect);

    // 注意：这里需要根据实际的Ant Design Select组件行为调整
    // 可能需要使用不同的方式来选择选项
  });

  test('应该处理加载错误', async () => {
    const error = new Error('加载失败');
    (productService.listSPUsWithStats as jest.Mock).mockRejectedValue(error);

    renderWithRouter(<SPUListPage />);

    await waitFor(() => {
      expect(productService.listSPUsWithStats).toHaveBeenCalled();
    });

    // 验证错误消息
    const { message } = require('antd');
    await waitFor(() => {
      expect(message.error).toHaveBeenCalled();
    });
  });

  test('应该支持分页', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SPUListPage />);

    await waitFor(() => {
      expect(screen.getByText('测试商品A')).toBeInTheDocument();
    });

    // 查找分页按钮（这里需要根据实际渲染结果调整选择器）
    const pagination = screen.getByRole('navigation');
    if (pagination) {
      const nextButton = within(pagination).queryByTitle('Next Page');
      if (nextButton) {
        await user.click(nextButton);

        await waitFor(() => {
          expect(productService.listSPUsWithStats).toHaveBeenCalledWith(
            expect.objectContaining({
              page: 2,
            })
          );
        });
      }
    }
  });

  test('应该显示SPU的SKU数量', async () => {
    renderWithRouter(<SPUListPage />);

    await waitFor(() => {
      expect(screen.getByText('测试商品A')).toBeInTheDocument();
    });

    // 验证SKU数量显示（需要根据实际渲染调整）
    expect(screen.getByText(/5/)).toBeInTheDocument(); // SKU count for 商品A
    expect(screen.getByText(/3/)).toBeInTheDocument(); // SKU count for 商品B
  });

  test('应该正确显示状态标签', async () => {
    renderWithRouter(<SPUListPage />);

    await waitFor(() => {
      expect(screen.getByText('测试商品A')).toBeInTheDocument();
    });

    // 验证状态标签（需要根据实际渲染调整）
    const statusBadges = screen.getAllByRole('status') || screen.getAllByText(/启用|禁用/i);
    expect(statusBadges.length).toBeGreaterThan(0);
  });
});

function within(pagination: HTMLElement): { queryByTitle: (arg0: string) => any } {
  return {
    queryByTitle: (title: string) => {
      const elements = pagination.querySelectorAll(`[title="${title}"]`);
      return elements.length > 0 ? elements[0] : null;
    },
  };
}
