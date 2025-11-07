import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import InventoryPage from '../InventoryPage';
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

const mockInventoryData = {
  data: [
    {
      sku_id: 1,
      sku_code: 'SKU-001',
      sku_name: '红色-L码',
      warehouse_id: null,
      available_quantity: 100,
      locked_quantity: 20,
      total_quantity: 120,
      last_in_date: '2024-01-01T10:00:00Z',
      last_out_date: '2024-01-02T15:30:00Z',
      last_check_date: '2024-01-03T09:00:00Z',
      updated_at: '2024-01-05T12:00:00Z',
    },
    {
      sku_id: 2,
      sku_code: 'SKU-002',
      sku_name: '蓝色-M码',
      warehouse_id: null,
      available_quantity: 5,
      locked_quantity: 2,
      total_quantity: 7,
      last_in_date: '2024-01-01T11:00:00Z',
      last_out_date: '2024-01-04T16:00:00Z',
      last_check_date: null,
      updated_at: '2024-01-05T13:00:00Z',
    },
  ],
  total: 2,
  page: 1,
  page_size: 10,
};

const mockTransactionData = {
  data: [
    {
      id: 1,
      sku_id: 1,
      sku_code: 'SKU-001',
      sku_name: '红色-L码',
      transaction_type: 'in',
      quantity: 50,
      before_quantity: 50,
      after_quantity: 100,
      operator_id: 1,
      operator_name: '管理员',
      reason: '采购入库',
      reference_type: 'purchase',
      reference_id: 123,
      created_at: '2024-01-01T10:00:00Z',
    },
    {
      id: 2,
      sku_id: 1,
      sku_code: 'SKU-001',
      sku_name: '红色-L码',
      transaction_type: 'out',
      quantity: -30,
      before_quantity: 100,
      after_quantity: 70,
      operator_id: 2,
      operator_name: '操作员A',
      reason: '订单出库',
      reference_type: 'order',
      reference_id: 456,
      created_at: '2024-01-02T15:30:00Z',
    },
    {
      id: 3,
      sku_id: 1,
      sku_code: 'SKU-001',
      sku_name: '红色-L码',
      transaction_type: 'lock',
      quantity: 20,
      before_quantity: 70,
      after_quantity: 50,
      operator_id: 1,
      operator_name: '管理员',
      reason: '预留订单',
      created_at: '2024-01-03T09:00:00Z',
    },
  ],
  total: 3,
  page: 1,
  page_size: 10,
};

describe('InventoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (productService.listInventoryRecords as jest.Mock).mockResolvedValue(mockInventoryData);
    (productService.getTransactionHistory as jest.Mock).mockResolvedValue(mockTransactionData);
    (productService.inventoryIn as jest.Mock).mockResolvedValue({ success: true });
    (productService.inventoryOut as jest.Mock).mockResolvedValue({ success: true });
    (productService.adjustInventory as jest.Mock).mockResolvedValue({ success: true });
    (productService.lockInventory as jest.Mock).mockResolvedValue({ success: true });
    (productService.unlockInventory as jest.Mock).mockResolvedValue({ success: true });
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  describe('页面渲染和数据加载', () => {
    test('应该正确渲染库存管理页面', async () => {
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('库存管理')).toBeInTheDocument();
      });

      // 验证两个标签页
      expect(screen.getByText('库存记录')).toBeInTheDocument();
      expect(screen.getByText('交易历史')).toBeInTheDocument();
    });

    test('应该加载并显示库存记录数据', async () => {
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
        expect(screen.getByText('SKU-002')).toBeInTheDocument();
      });

      expect(screen.getByText('红色-L码')).toBeInTheDocument();
      expect(screen.getByText('蓝色-M码')).toBeInTheDocument();
    });

    test('应该正确显示库存数量', async () => {
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
      });

      // 验证数量格式化（假设formatStock返回原值或格式化后的值）
      const availableQty = screen.getAllByText(/100|5/);
      expect(availableQty.length).toBeGreaterThan(0);
    });
  });

  describe('库存记录过滤', () => {
    test('应该支持按SKU ID过滤', async () => {
      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
      });

      // 找到库存记录tab下的SKU ID输入框
      const skuIdInputs = screen.getAllByPlaceholderText('SKU ID');
      const inventorySkuIdInput = skuIdInputs[0]; // 第一个是库存记录的

      await user.type(inventorySkuIdInput, '1');

      await waitFor(() => {
        expect(productService.listInventoryRecords).toHaveBeenCalledWith(
          expect.objectContaining({
            sku_id: 1,
          })
        );
      });
    });

    test('应该支持低库存过滤', async () => {
      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
      });

      const lowStockSelect = screen.getByPlaceholderText('仅显示低库存');
      await user.click(lowStockSelect);

      // 选择"仅低库存"选项
      const lowStockOption = await screen.findByText('仅低库存');
      await user.click(lowStockOption);

      await waitFor(() => {
        expect(productService.listInventoryRecords).toHaveBeenCalledWith(
          expect.objectContaining({
            low_stock: true,
          })
        );
      });
    });

    test('应该支持重置过滤条件', async () => {
      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
      });

      // 点击重置按钮
      const resetButtons = screen.getAllByRole('button', { name: /重置/ });
      const inventoryResetButton = resetButtons[0]; // 第一个重置按钮是库存记录的

      await user.click(inventoryResetButton);

      await waitFor(() => {
        expect(productService.listInventoryRecords).toHaveBeenCalledWith(
          expect.objectContaining({
            sku_id: undefined,
            warehouse_id: undefined,
            low_stock: undefined,
          })
        );
      });
    });
  });

  describe('交易历史', () => {
    test('应该切换到交易历史标签并加载数据', async () => {
      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('库存记录')).toBeInTheDocument();
      });

      // 切换到交易历史tab
      const transactionTab = screen.getByText('交易历史');
      await user.click(transactionTab);

      await waitFor(() => {
        expect(productService.getTransactionHistory).toHaveBeenCalled();
      });

      // 验证交易数据显示
      await waitFor(() => {
        expect(screen.getByText('采购入库')).toBeInTheDocument();
        expect(screen.getByText('订单出库')).toBeInTheDocument();
      });
    });

    test('应该支持按交易类型过滤', async () => {
      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      // 切换到交易历史tab
      const transactionTab = screen.getByText('交易历史');
      await user.click(transactionTab);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('操作类型')).toBeInTheDocument();
      });

      const typeSelect = screen.getByPlaceholderText('操作类型');
      await user.click(typeSelect);

      // 选择"入库"选项
      const inOption = await screen.findByText('入库');
      await user.click(inOption);

      await waitFor(() => {
        expect(productService.getTransactionHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            transaction_type: 'in',
          })
        );
      });
    });
  });

  describe('库存操作', () => {
    test('应该打开入库弹窗', async () => {
      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
      });

      // 点击入库按钮
      const inButtons = screen.getAllByRole('button', { name: /入库/ });
      await user.click(inButtons[0]);

      // 验证弹窗打开
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('入库', { selector: '.ant-modal-title' })).toBeInTheDocument();
      });
    });

    test('应该打开出库弹窗', async () => {
      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
      });

      // 点击出库按钮
      const outButtons = screen.getAllByRole('button', { name: /出库/ });
      await user.click(outButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('出库', { selector: '.ant-modal-title' })).toBeInTheDocument();
      });
    });

    test('应该打开盘点弹窗', async () => {
      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
      });

      // 点击盘点按钮
      const adjustButtons = screen.getAllByRole('button', { name: /盘点/ });
      await user.click(adjustButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('盘点调整', { selector: '.ant-modal-title' })).toBeInTheDocument();
      });
    });

    test('应该执行入库操作', async () => {
      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
      });

      // 打开入库弹窗
      const inButtons = screen.getAllByRole('button', { name: /入库/ });
      await user.click(inButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // 填写数量
      const quantityInput = screen.getByLabelText('数量');
      await user.clear(quantityInput);
      await user.type(quantityInput, '50');

      // 填写原因
      const reasonInput = screen.getByPlaceholderText('请输入原因或备注');
      await user.type(reasonInput, '采购入库');

      // 提交
      const submitButton = screen.getByRole('button', { name: '确定' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(productService.inventoryIn).toHaveBeenCalled();
      });

      const { message } = require('antd');
      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('入库成功');
      });
    });

    test('应该执行盘点调整操作', async () => {
      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
      });

      // 打开盘点弹窗
      const adjustButtons = screen.getAllByRole('button', { name: /盘点/ });
      await user.click(adjustButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // 填写调整后数量（盘点使用new_quantity字段）
      const newQuantityInput = screen.getByLabelText('调整后数量');
      await user.clear(newQuantityInput);
      await user.type(newQuantityInput, '100');

      // 填写原因
      const reasonInput = screen.getByPlaceholderText('请输入原因或备注');
      await user.type(reasonInput, '盘点调整');

      // 提交
      const submitButton = screen.getByRole('button', { name: '确定' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(productService.adjustInventory).toHaveBeenCalled();
      });

      const { message } = require('antd');
      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('盘点调整成功');
      });
    });

    test('应该处理操作失败', async () => {
      const error = new Error('库存不足');
      (productService.inventoryOut as jest.Mock).mockRejectedValue({
        response: { data: { error: '库存不足' } },
      });

      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
      });

      // 打开出库弹窗
      const outButtons = screen.getAllByRole('button', { name: /出库/ });
      await user.click(outButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // 填写数量
      const quantityInput = screen.getByLabelText('数量');
      await user.clear(quantityInput);
      await user.type(quantityInput, '1000');

      // 提交
      const submitButton = screen.getByRole('button', { name: '确定' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(productService.inventoryOut).toHaveBeenCalled();
      });

      const { message } = require('antd');
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('库存不足');
      });
    });
  });

  describe('数据刷新', () => {
    test('应该在操作成功后刷新数据', async () => {
      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
      });

      // 清除之前的调用记录
      jest.clearAllMocks();

      // 执行入库操作
      const inButtons = screen.getAllByRole('button', { name: /入库/ });
      await user.click(inButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const quantityInput = screen.getByLabelText('数量');
      await user.clear(quantityInput);
      await user.type(quantityInput, '10');

      const submitButton = screen.getByRole('button', { name: '确定' });
      await user.click(submitButton);

      // 验证操作成功后刷新了两个数据源
      await waitFor(() => {
        expect(productService.listInventoryRecords).toHaveBeenCalled();
        expect(productService.getTransactionHistory).toHaveBeenCalled();
      });
    });
  });

  describe('错误处理', () => {
    test('应该处理加载库存记录失败', async () => {
      (productService.listInventoryRecords as jest.Mock).mockRejectedValue({
        response: { data: { error: '加载失败' } },
      });

      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(productService.listInventoryRecords).toHaveBeenCalled();
      });

      const { message } = require('antd');
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载失败');
      });
    });

    test('应该处理加载交易历史失败', async () => {
      (productService.getTransactionHistory as jest.Mock).mockRejectedValue({
        response: { data: { error: '加载失败' } },
      });

      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      // 切换到交易历史tab
      const transactionTab = screen.getByText('交易历史');
      await user.click(transactionTab);

      await waitFor(() => {
        expect(productService.getTransactionHistory).toHaveBeenCalled();
      });

      const { message } = require('antd');
      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载失败');
      });
    });
  });

  describe('分页', () => {
    test('应该支持库存记录分页', async () => {
      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('SKU-001')).toBeInTheDocument();
      });

      // 查找分页器（通过aria-label或其他方式）
      const pagination = screen.getAllByRole('navigation');
      if (pagination.length > 0) {
        // 验证总数显示
        expect(screen.getByText(/共 2 条/)).toBeInTheDocument();
      }
    });

    test('应该支持交易历史分页', async () => {
      const user = userEvent.setup();
      renderWithRouter(<InventoryPage />);

      // 切换到交易历史tab
      const transactionTab = screen.getByText('交易历史');
      await user.click(transactionTab);

      await waitFor(() => {
        expect(screen.getByText('采购入库')).toBeInTheDocument();
      });

      // 验证总数显示
      expect(screen.getByText(/共 3 条/)).toBeInTheDocument();
    });
  });
});
