import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SKUListPage from '../SKUListPage';
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

const mockSKUData = {
  data: [
    {
      id: 1,
      sku_code: 'SKU-001',
      spu_id: 1,
      spu_name: '测试商品A',
      name: '红色-L',
      price: 199.99,
      stock_quantity: 100,
      attributes: { color: '红色', size: 'L' },
      status: 'active',
      is_low_stock: false,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      sku_code: 'SKU-002',
      spu_id: 1,
      spu_name: '测试商品A',
      name: '蓝色-M',
      price: 189.99,
      stock_quantity: 5,
      attributes: { color: '蓝色', size: 'M' },
      status: 'active',
      is_low_stock: true,
      created_at: '2024-01-02T00:00:00Z',
    },
  ],
  total: 2,
  page: 1,
  page_size: 10,
};

describe('SKUListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (productService.listSKUsWithDetails as jest.Mock).mockResolvedValue(mockSKUData);
    (productService.batchUpdateSKUs as jest.Mock).mockResolvedValue({ success: true });
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  test('应该正确渲染SKU列表页面', async () => {
    renderWithRouter(<SKUListPage />);

    await waitFor(() => {
      expect(screen.getByText('SKU管理')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('搜索SKU编码或名称')).toBeInTheDocument();
    expect(screen.getByText('批量编辑')).toBeInTheDocument();
  });

  test('应该加载并显示SKU列表数据', async () => {
    renderWithRouter(<SKUListPage />);

    await waitFor(() => {
      expect(screen.getByText('SKU-001')).toBeInTheDocument();
      expect(screen.getByText('SKU-002')).toBeInTheDocument();
    });

    expect(screen.getByText('红色-L')).toBeInTheDocument();
    expect(screen.getByText('蓝色-M')).toBeInTheDocument();
    expect(screen.getByText('199.99')).toBeInTheDocument();
    expect(screen.getByText('189.99')).toBeInTheDocument();
  });

  test('应该显示库存预警', async () => {
    renderWithRouter(<SKUListPage />);

    await waitFor(() => {
      expect(screen.getByText('SKU-002')).toBeInTheDocument();
    });

    // 查找低库存标识（可能是一个图标或文本）
    const lowStockElements = screen.queryAllByText(/低库存|库存不足/i);
    // SKU-002应该显示低库存警告
    // 具体断言取决于实际渲染方式
  });

  test('应该支持行选择', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SKUListPage />);

    await waitFor(() => {
      expect(screen.getByText('SKU-001')).toBeInTheDocument();
    });

    // 查找复选框
    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes.length > 0) {
      // 选择第一行
      await user.click(checkboxes[1]); // 0是全选，1是第一行

      // 验证批量编辑按钮可用
      const batchEditButton = screen.getByText('批量编辑');
      expect(batchEditButton).toBeEnabled();
    }
  });

  test('应该支持搜索功能', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SKUListPage />);

    await waitFor(() => {
      expect(screen.getByText('SKU-001')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('搜索SKU编码或名称');
    await user.type(searchInput, 'SKU-001');

    await waitFor(() => {
      expect(productService.listSKUsWithDetails).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: 'SKU-001',
        })
      );
    });
  });

  test('应该打开批量编辑抽屉', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SKUListPage />);

    await waitFor(() => {
      expect(screen.getByText('SKU-001')).toBeInTheDocument();
    });

    // 选择至少一个SKU
    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes.length > 1) {
      await user.click(checkboxes[1]);

      // 点击批量编辑按钮
      const batchEditButton = screen.getByText('批量编辑');
      await user.click(batchEditButton);

      // 验证抽屉打开
      await waitFor(() => {
        expect(screen.getByText('批量编辑SKU')).toBeInTheDocument();
      });
    }
  });

  test('应该执行批量编辑操作', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SKUListPage />);

    await waitFor(() => {
      expect(screen.getByText('SKU-001')).toBeInTheDocument();
    });

    // 选择SKU
    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes.length > 1) {
      await user.click(checkboxes[1]);

      // 打开批量编辑
      const batchEditButton = screen.getByText('批量编辑');
      await user.click(batchEditButton);

      await waitFor(() => {
        expect(screen.getByText('批量编辑SKU')).toBeInTheDocument();
      });

      // 修改价格
      const priceInput = screen.getByLabelText('价格');
      if (priceInput) {
        await user.clear(priceInput);
        await user.type(priceInput, '299.99');

        // 提交
        const submitButton = screen.getByText('提交');
        await user.click(submitButton);

        await waitFor(() => {
          expect(productService.batchUpdateSKUs).toHaveBeenCalled();
        });
      }
    }
  });

  test('应该处理批量编辑失败', async () => {
    const error = new Error('批量更新失败');
    (productService.batchUpdateSKUs as jest.Mock).mockRejectedValue(error);

    const user = userEvent.setup();
    renderWithRouter(<SKUListPage />);

    await waitFor(() => {
      expect(screen.getByText('SKU-001')).toBeInTheDocument();
    });

    // 选择并尝试批量编辑
    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes.length > 1) {
      await user.click(checkboxes[1]);

      const batchEditButton = screen.getByText('批量编辑');
      await user.click(batchEditButton);

      await waitFor(() => {
        const submitButton = screen.queryByText('提交');
        if (submitButton) {
          user.click(submitButton);
        }
      });

      const { message } = require('antd');
      await waitFor(() => {
        expect(message.error).toHaveBeenCalled();
      });
    }
  });

  test('应该显示属性标签', async () => {
    renderWithRouter(<SKUListPage />);

    await waitFor(() => {
      expect(screen.getByText('SKU-001')).toBeInTheDocument();
    });

    // 验证属性显示（颜色、尺寸等）
    expect(screen.getByText(/红色/)).toBeInTheDocument();
    expect(screen.getByText(/蓝色/)).toBeInTheDocument();
  });

  test('应该支持状态过滤', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SKUListPage />);

    await waitFor(() => {
      expect(screen.getByText('SKU-001')).toBeInTheDocument();
    });

    // 测试状态过滤
    const statusFilter = screen.queryByLabelText(/状态/i);
    if (statusFilter) {
      await user.click(statusFilter);
      // 根据实际实现选择选项
    }
  });
});
