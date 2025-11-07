/**
 * 商品管理API集成测试
 *
 * 测试真实的后端API端点，确保前后端接口契约一致
 */

import axios from 'axios';
import * as productService from '../productService';
import type {
  SPU,
  SKU,
  SPUCreateRequest,
  SKUCreateRequest,
  InventoryInRequest,
  InventoryOutRequest,
  InventoryAdjustRequest
} from '../../types/product';

// 使用真实的API URL（从环境变量或配置中获取）
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

describe('Product Management API Integration Tests', () => {
  let authToken: string;
  let createdSPUId: number;
  let createdSKUId: number;

  beforeAll(async () => {
    // 登录获取认证token
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
        username: 'admin',
        password: 'admin123'
      });
      authToken = loginResponse.data.token;

      // 设置axios默认header
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  });

  describe('SPU API Tests', () => {
    test('应该成功创建SPU', async () => {
      const spuData: SPUCreateRequest = {
        spu_code: `SPU-INT-TEST-${Date.now()}`,
        name: '集成测试商品',
        brand: '测试品牌',
        description: '这是一个集成测试商品',
        status: 'active'
      };

      const response = await productService.createSPU(spuData);

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.spu_code).toBe(spuData.spu_code);
      expect(response.name).toBe(spuData.name);
      expect(response.brand).toBe(spuData.brand);

      createdSPUId = response.id;
    });

    test('应该能够获取SPU列表', async () => {
      const response = await productService.listSPUsWithStats({
        page: 1,
        page_size: 10
      });

      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
      expect(response.total).toBeGreaterThan(0);
      expect(response.page).toBe(1);
      expect(response.page_size).toBe(10);
    });

    test('应该能够根据关键词搜索SPU', async () => {
      const response = await productService.listSPUsWithStats({
        search: '测试',
        page: 1,
        page_size: 10
      });

      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);

      // 验证搜索结果包含关键词
      if (response.data.length > 0) {
        const hasKeyword = response.data.some(spu =>
          spu.name.includes('测试') || spu.brand?.includes('测试')
        );
        expect(hasKeyword).toBe(true);
      }
    });

    test('应该能够获取SPU详情', async () => {
      if (!createdSPUId) {
        throw new Error('No SPU created for testing');
      }

      const response = await productService.getSPU(createdSPUId);

      expect(response).toBeDefined();
      expect(response.id).toBe(createdSPUId);
      expect(response.name).toBeDefined();
    });

    test('应该能够更新SPU', async () => {
      if (!createdSPUId) {
        throw new Error('No SPU created for testing');
      }

      const updatedData = {
        name: '更新后的商品名称',
        description: '更新后的描述'
      };

      const response = await productService.updateSPU(createdSPUId, updatedData);

      expect(response).toBeDefined();
      expect(response.name).toBe(updatedData.name);
      expect(response.description).toBe(updatedData.description);
    });

    test('应该能够按状态过滤SPU', async () => {
      const response = await productService.listSPUsWithStats({
        status: 'active',
        page: 1,
        page_size: 10
      });

      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);

      // 验证所有返回的SPU都是active状态
      response.data.forEach(spu => {
        expect(spu.status).toBe('active');
      });
    });
  });

  describe('SKU API Tests', () => {
    test('应该成功创建SKU', async () => {
      if (!createdSPUId) {
        throw new Error('No SPU created for testing');
      }

      const skuData: SKUCreateRequest = {
        sku_code: `SKU-INT-TEST-${Date.now()}`,
        spu_id: createdSPUId,
        name: '红色-L码',
        price: 199.99,
        stock_quantity: 100,
        alert_quantity: 10,
        attributes: {
          color: '红色',
          size: 'L'
        },
        status: 'active'
      };

      const response = await productService.createSKU(skuData);

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.sku_code).toBe(skuData.sku_code);
      expect(response.price).toBe(skuData.price);
      expect(response.attributes).toEqual(skuData.attributes);

      createdSKUId = response.id;
    });

    test('应该能够获取SKU列表（含详情）', async () => {
      const response = await productService.listSKUsWithDetails({
        page: 1,
        page_size: 10
      });

      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
      expect(response.total).toBeGreaterThan(0);

      // 验证SKU包含SPU信息
      if (response.data.length > 0) {
        const sku = response.data[0];
        expect(sku.spu_name).toBeDefined();
      }
    });

    test('应该能够批量创建SKU', async () => {
      if (!createdSPUId) {
        throw new Error('No SPU created for testing');
      }

      const timestamp = Date.now();
      const batchData = {
        spu_id: createdSPUId,
        skus: [
          {
            sku_code: `SKU-BATCH-1-${timestamp}`,
            spu_id: createdSPUId,
            name: '蓝色-M码',
            price: 189.99,
            stock_quantity: 50,
            attributes: { color: '蓝色', size: 'M' },
            status: 'active' as const
          },
          {
            sku_code: `SKU-BATCH-2-${timestamp}`,
            spu_id: createdSPUId,
            name: '绿色-S码',
            price: 179.99,
            stock_quantity: 30,
            attributes: { color: '绿色', size: 'S' },
            status: 'active' as const
          }
        ]
      };

      const response = await productService.batchCreateSKUs(batchData);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.created_count).toBe(2);
    });

    test('应该能够批量更新SKU', async () => {
      if (!createdSKUId) {
        throw new Error('No SKU created for testing');
      }

      const updateData = {
        updates: [
          {
            id: createdSKUId,
            price: 249.99,
            stock_quantity: 150
          }
        ]
      };

      const response = await productService.batchUpdateSKUs(updateData);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.updated_count).toBe(1);

      // 验证更新成功
      const updatedSKU = await productService.getSKU(createdSKUId);
      expect(updatedSKU.price).toBe(249.99);
      expect(updatedSKU.stock_quantity).toBe(150);
    });

    test('应该能够搜索SKU', async () => {
      const response = await productService.listSKUsWithDetails({
        keyword: 'SKU-INT-TEST',
        page: 1,
        page_size: 10
      });

      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);

      // 验证搜索结果
      if (response.data.length > 0) {
        const hasKeyword = response.data.some(sku =>
          sku.sku_code.includes('SKU-INT-TEST') || sku.name.includes('SKU-INT-TEST')
        );
        expect(hasKeyword).toBe(true);
      }
    });

    test('应该能够识别低库存SKU', async () => {
      const response = await productService.listSKUsWithDetails({
        low_stock: true,
        page: 1,
        page_size: 10
      });

      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);

      // 验证所有返回的SKU都是低库存
      response.data.forEach(sku => {
        expect(sku.is_low_stock).toBe(true);
      });
    });
  });

  describe('Inventory API Tests', () => {
    test('应该能够执行入库操作', async () => {
      if (!createdSKUId) {
        throw new Error('No SKU created for testing');
      }

      const inData: InventoryInRequest = {
        sku_id: createdSKUId,
        quantity: 100,
        reason: '测试入库',
        reference_type: 'manual'
      };

      const response = await productService.inventoryIn(inData);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
    });

    test('应该能够执行出库操作', async () => {
      if (!createdSKUId) {
        throw new Error('No SKU created for testing');
      }

      const outData: InventoryOutRequest = {
        sku_id: createdSKUId,
        quantity: 30,
        reason: '测试出库',
        reference_type: 'manual'
      };

      const response = await productService.inventoryOut(outData);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
    });

    test('应该能够执行库存盘点', async () => {
      if (!createdSKUId) {
        throw new Error('No SKU created for testing');
      }

      const adjustData: InventoryAdjustRequest = {
        sku_id: createdSKUId,
        new_quantity: 150,
        reason: '月度盘点'
      };

      const response = await productService.adjustInventory(adjustData);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
    });

    test('应该能够锁定库存', async () => {
      if (!createdSKUId) {
        throw new Error('No SKU created for testing');
      }

      const lockData = {
        sku_id: createdSKUId,
        quantity: 20,
        reason: '订单预留'
      };

      const response = await productService.lockInventory(lockData);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
    });

    test('应该能够解锁库存', async () => {
      if (!createdSKUId) {
        throw new Error('No SKU created for testing');
      }

      const unlockData = {
        sku_id: createdSKUId,
        quantity: 20,
        reason: '订单取消'
      };

      const response = await productService.unlockInventory(unlockData);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
    });

    test('应该能够获取库存记录列表', async () => {
      const response = await productService.listInventoryRecords({
        page: 1,
        page_size: 10
      });

      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
      expect(response.total).toBeGreaterThan(0);
    });

    test('应该能够获取指定SKU的库存信息', async () => {
      if (!createdSKUId) {
        throw new Error('No SKU created for testing');
      }

      const response = await productService.getSKUInventory(createdSKUId);

      expect(response).toBeDefined();
      expect(response.sku_id).toBe(createdSKUId);
      expect(response.available_quantity).toBeDefined();
      expect(response.locked_quantity).toBeDefined();
      expect(response.total_quantity).toBeDefined();
      expect(response.total_quantity).toBe(
        response.available_quantity + response.locked_quantity
      );
    });

    test('应该能够查看交易历史', async () => {
      if (!createdSKUId) {
        throw new Error('No SKU created for testing');
      }

      const response = await productService.getTransactionHistory({
        sku_id: createdSKUId,
        page: 1,
        page_size: 10
      });

      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);

      // 验证交易记录包含必要的字段
      if (response.data.length > 0) {
        const transaction = response.data[0];
        expect(transaction.id).toBeDefined();
        expect(transaction.transaction_type).toBeDefined();
        expect(transaction.quantity).toBeDefined();
        expect(transaction.before_quantity).toBeDefined();
        expect(transaction.after_quantity).toBeDefined();
        expect(transaction.created_at).toBeDefined();
      }
    });

    test('应该能够按交易类型筛选历史', async () => {
      const response = await productService.getTransactionHistory({
        transaction_type: 'in',
        page: 1,
        page_size: 10
      });

      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);

      // 验证所有记录都是入库类型
      response.data.forEach(transaction => {
        expect(transaction.transaction_type).toBe('in');
      });
    });

    test('应该能够按日期范围筛选交易历史', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7天前
      const endDate = new Date();

      const response = await productService.getTransactionHistory({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        page: 1,
        page_size: 10
      });

      expect(response).toBeDefined();
      expect(response.data).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling Tests', () => {
    test('应该拒绝出库数量超过可用库存', async () => {
      if (!createdSKUId) {
        throw new Error('No SKU created for testing');
      }

      // 先获取当前库存
      const inventory = await productService.getSKUInventory(createdSKUId);

      // 尝试出库超过可用库存的数量
      const outData: InventoryOutRequest = {
        sku_id: createdSKUId,
        quantity: inventory.available_quantity + 1000,
        reason: '测试超额出库'
      };

      await expect(productService.inventoryOut(outData)).rejects.toThrow();
    });

    test('应该拒绝重复的SPU编码', async () => {
      const duplicateCode = `SPU-DUPLICATE-${Date.now()}`;

      // 创建第一个SPU
      await productService.createSPU({
        spu_code: duplicateCode,
        name: '第一个SPU',
        status: 'active'
      });

      // 尝试创建相同编码的SPU
      await expect(
        productService.createSPU({
          spu_code: duplicateCode,
          name: '重复的SPU',
          status: 'active'
        })
      ).rejects.toThrow();
    });

    test('应该拒绝重复的SKU编码', async () => {
      if (!createdSPUId) {
        throw new Error('No SPU created for testing');
      }

      const duplicateCode = `SKU-DUPLICATE-${Date.now()}`;

      // 创建第一个SKU
      await productService.createSKU({
        sku_code: duplicateCode,
        spu_id: createdSPUId,
        name: '第一个SKU',
        price: 99.99,
        status: 'active'
      });

      // 尝试创建相同编码的SKU
      await expect(
        productService.createSKU({
          sku_code: duplicateCode,
          spu_id: createdSPUId,
          name: '重复的SKU',
          price: 99.99,
          status: 'active'
        })
      ).rejects.toThrow();
    });

    test('应该处理无效的SKU ID', async () => {
      const invalidSKUId = 999999;

      await expect(productService.getSKU(invalidSKUId)).rejects.toThrow();
    });

    test('应该处理无效的SPU ID', async () => {
      const invalidSPUId = 999999;

      await expect(productService.getSPU(invalidSPUId)).rejects.toThrow();
    });
  });

  afterAll(async () => {
    // 清理测试数据（可选）
    try {
      if (createdSKUId) {
        await productService.deleteSKU(createdSKUId);
      }
      if (createdSPUId) {
        await productService.deleteSPU(createdSPUId);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });
});
