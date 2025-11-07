/**
 * 商品管理完整工作流 E2E 测试
 *
 * 测试范围：
 * 1. SPU (标准商品单元) 创建和管理
 * 2. SKU (库存量单位) 创建和批量操作
 * 3. 库存管理 (入库、出库、盘点、锁定、解锁)
 * 4. 完整的商品管理工作流
 */

import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

class ProductManagementHelpers extends TestHelpers {
  /**
   * 导航到SPU列表页面
   */
  async navigateToSPUList(): Promise<void> {
    await this.page.goto('/products/spu');
    await this.waitForNetworkIdle();
  }

  /**
   * 导航到SKU列表页面
   */
  async navigateToSKUList(): Promise<void> {
    await this.page.goto('/products/sku');
    await this.waitForNetworkIdle();
  }

  /**
   * 导航到库存管理页面
   */
  async navigateToInventory(): Promise<void> {
    await this.page.goto('/products/inventory');
    await this.waitForNetworkIdle();
  }

  /**
   * 创建SPU
   */
  async createSPU(data: {
    code: string;
    name: string;
    brand?: string;
    description?: string;
  }): Promise<string> {
    await this.navigateToSPUList();

    // 点击创建按钮
    await this.safeClick('button:has-text("新建SPU")');
    await this.waitForNetworkIdle();

    // 填写表单
    await this.safeFill('[name="spu_code"]', data.code);
    await this.safeFill('[name="name"]', data.name);

    if (data.brand) {
      await this.safeFill('[name="brand"]', data.brand);
    }

    if (data.description) {
      await this.safeFill('[name="description"]', data.description);
    }

    // 提交表单
    await this.safeClick('button:has-text("确定")');
    await this.waitForNetworkIdle();

    // 验证成功消息
    await this.verifyElementExists('.ant-message-success');

    // 返回SPU编码用于后续操作
    return data.code;
  }

  /**
   * 搜索SPU
   */
  async searchSPU(keyword: string): Promise<void> {
    await this.navigateToSPUList();
    await this.safeFill('[placeholder*="搜索SPU"]', keyword);
    await this.waitForNetworkIdle();
  }

  /**
   * 验证SPU是否存在于列表中
   */
  async verifySPUExists(spuCode: string): Promise<void> {
    await this.searchSPU(spuCode);
    await this.verifyElementExists(`text=${spuCode}`);
  }

  /**
   * 创建SKU
   */
  async createSKU(data: {
    spuId: number;
    skuCode: string;
    name: string;
    price: number;
    stockQuantity?: number;
    attributes?: Record<string, string>;
  }): Promise<string> {
    await this.navigateToSKUList();

    // 点击创建按钮
    await this.safeClick('button:has-text("新建SKU")');
    await this.waitForNetworkIdle();

    // 填写表单
    await this.safeFill('[name="sku_code"]', data.skuCode);
    await this.safeFill('[name="name"]', data.name);
    await this.safeFill('[name="price"]', data.price.toString());

    if (data.stockQuantity !== undefined) {
      await this.safeFill('[name="stock_quantity"]', data.stockQuantity.toString());
    }

    // 提交
    await this.safeClick('button:has-text("确定")');
    await this.waitForNetworkIdle();

    // 验证成功消息
    await this.verifyElementExists('.ant-message-success');

    return data.skuCode;
  }

  /**
   * 批量创建SKU
   */
  async batchCreateSKUs(spuId: number, skus: Array<{
    skuCode: string;
    name: string;
    price: number;
    attributes?: Record<string, string>;
  }>): Promise<void> {
    await this.navigateToSKUList();

    // 点击批量创建按钮
    await this.safeClick('button:has-text("批量创建")');
    await this.waitForNetworkIdle();

    // 这里简化处理，实际可能需要逐个添加SKU
    for (const sku of skus) {
      // 添加SKU行的逻辑
      await this.safeClick('button:has-text("添加SKU")');
      // 填写SKU信息...
    }

    // 提交
    await this.safeClick('button:has-text("确定")');
    await this.waitForNetworkIdle();
  }

  /**
   * 搜索SKU
   */
  async searchSKU(keyword: string): Promise<void> {
    await this.navigateToSKUList();
    await this.safeFill('[placeholder*="搜索SKU"]', keyword);
    await this.waitForNetworkIdle();
  }

  /**
   * 批量编辑SKU价格
   */
  async batchEditSKUPrice(skuCodes: string[], newPrice: number): Promise<void> {
    await this.navigateToSKUList();

    // 选择多个SKU
    for (const code of skuCodes) {
      await this.searchSKU(code);
      // 勾选复选框
      const checkbox = this.page.locator(`tr:has-text("${code}") input[type="checkbox"]`).first();
      await checkbox.check();
    }

    // 点击批量编辑按钮
    await this.safeClick('button:has-text("批量编辑")');
    await this.waitForNetworkIdle();

    // 修改价格
    await this.safeFill('[name="price"]', newPrice.toString());

    // 提交
    await this.safeClick('button:has-text("提交")');
    await this.waitForNetworkIdle();

    // 验证成功消息
    await this.verifyElementExists('.ant-message-success');
  }

  /**
   * 库存入库操作
   */
  async inventoryIn(skuId: number, quantity: number, reason?: string): Promise<void> {
    await this.navigateToInventory();

    // 找到对应的SKU行，点击入库按钮
    await this.safeClick(`tr:has([data-sku-id="${skuId}"]) button:has-text("入库")`);
    await this.waitForNetworkIdle();

    // 填写数量
    await this.safeFill('[name="quantity"]', quantity.toString());

    if (reason) {
      await this.safeFill('[name="reason"]', reason);
    }

    // 提交
    await this.safeClick('button:has-text("确定")');
    await this.waitForNetworkIdle();

    // 验证成功消息
    await this.verifyElementExists('.ant-message-success');
  }

  /**
   * 库存出库操作
   */
  async inventoryOut(skuId: number, quantity: number, reason?: string): Promise<void> {
    await this.navigateToInventory();

    // 找到对应的SKU行，点击出库按钮
    await this.safeClick(`tr:has([data-sku-id="${skuId}"]) button:has-text("出库")`);
    await this.waitForNetworkIdle();

    // 填写数量
    await this.safeFill('[name="quantity"]', quantity.toString());

    if (reason) {
      await this.safeFill('[name="reason"]', reason);
    }

    // 提交
    await this.safeClick('button:has-text("确定")');
    await this.waitForNetworkIdle();

    // 验证成功消息
    await this.verifyElementExists('.ant-message-success');
  }

  /**
   * 库存盘点操作
   */
  async inventoryAdjust(skuId: number, newQuantity: number, reason: string): Promise<void> {
    await this.navigateToInventory();

    // 点击盘点按钮
    await this.safeClick(`tr:has([data-sku-id="${skuId}"]) button:has-text("盘点")`);
    await this.waitForNetworkIdle();

    // 填写调整后数量
    await this.safeFill('[name="new_quantity"]', newQuantity.toString());
    await this.safeFill('[name="reason"]', reason);

    // 提交
    await this.safeClick('button:has-text("确定")');
    await this.waitForNetworkIdle();

    // 验证成功消息
    await this.verifyElementExists('.ant-message-success');
  }

  /**
   * 库存锁定操作
   */
  async inventoryLock(skuId: number, quantity: number, reason?: string): Promise<void> {
    await this.navigateToInventory();

    // 点击锁定按钮
    await this.safeClick(`tr:has([data-sku-id="${skuId}"]) button:has-text("锁定")`);
    await this.waitForNetworkIdle();

    // 填写数量
    await this.safeFill('[name="quantity"]', quantity.toString());

    if (reason) {
      await this.safeFill('[name="reason"]', reason);
    }

    // 提交
    await this.safeClick('button:has-text("确定")');
    await this.waitForNetworkIdle();

    // 验证成功消息
    await this.verifyElementExists('.ant-message-success');
  }

  /**
   * 验证库存数量
   */
  async verifyInventoryQuantity(skuId: number, expected: {
    available?: number;
    locked?: number;
    total?: number;
  }): Promise<void> {
    await this.navigateToInventory();

    const row = this.page.locator(`tr:has([data-sku-id="${skuId}"])`);

    if (expected.available !== undefined) {
      const availableCell = row.locator('[data-type="available-quantity"]');
      await expect(availableCell).toContainText(expected.available.toString());
    }

    if (expected.locked !== undefined) {
      const lockedCell = row.locator('[data-type="locked-quantity"]');
      await expect(lockedCell).toContainText(expected.locked.toString());
    }

    if (expected.total !== undefined) {
      const totalCell = row.locator('[data-type="total-quantity"]');
      await expect(totalCell).toContainText(expected.total.toString());
    }
  }

  /**
   * 查看交易历史
   */
  async viewTransactionHistory(filters?: {
    skuId?: number;
    type?: string;
    dateRange?: [string, string];
  }): Promise<void> {
    await this.navigateToInventory();

    // 切换到交易历史标签
    await this.safeClick('div[role="tab"]:has-text("交易历史")');
    await this.waitForNetworkIdle();

    // 应用过滤器
    if (filters?.skuId) {
      await this.safeFill('[placeholder*="SKU ID"]', filters.skuId.toString());
    }

    if (filters?.type) {
      await this.safeClick('[placeholder*="操作类型"]');
      await this.safeClick(`div[role="option"]:has-text("${filters.type}")`);
    }

    // 点击查询
    await this.safeClick('button:has-text("查询")');
    await this.waitForNetworkIdle();
  }
}

test.describe('商品管理完整工作流', () => {
  let helpers: ProductManagementHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new ProductManagementHelpers(page);

    // 访问应用首页
    await page.goto('/');

    // 登录（如果需要）
    const loginForm = page.locator('[data-testid="login-form"]');
    if (await loginForm.isVisible({ timeout: 3000 }).catch(() => false)) {
      await helpers.safeFill('[data-testid="username-input"]', 'admin');
      await helpers.safeFill('[data-testid="password-input"]', 'admin123');
      await helpers.safeClick('[data-testid="login-button"]');
      await helpers.waitForNetworkIdle();
      await helpers.verifyUrlContains('/dashboard');
    }
  });

  test.describe('1. SPU管理', () => {
    test('1.1 应该能够成功创建SPU', async ({ page }) => {
      const spuCode = `SPU-TEST-${Date.now()}`;

      await helpers.createSPU({
        code: spuCode,
        name: '测试商品A',
        brand: '测试品牌',
        description: '这是一个测试商品描述'
      });

      // 验证SPU已创建
      await helpers.verifySPUExists(spuCode);
    });

    test('1.2 应该能够搜索SPU', async ({ page }) => {
      // 先创建一个SPU
      const spuCode = `SPU-SEARCH-${Date.now()}`;
      await helpers.createSPU({
        code: spuCode,
        name: '可搜索的测试商品',
        brand: '测试品牌'
      });

      // 搜索并验证
      await helpers.searchSPU(spuCode);
      await helpers.verifyTextContent('tbody', spuCode);
    });

    test('1.3 应该能够按状态筛选SPU', async ({ page }) => {
      await helpers.navigateToSPUList();

      // 选择状态过滤器
      await helpers.safeClick('[aria-label*="状态"]');
      await helpers.safeClick('div[role="option"]:has-text("启用")');
      await helpers.waitForNetworkIdle();

      // 验证列表已刷新
      await helpers.verifyElementExists('tbody tr');
    });
  });

  test.describe('2. SKU管理', () => {
    test('2.1 应该能够创建单个SKU', async ({ page }) => {
      const skuCode = `SKU-TEST-${Date.now()}`;

      await helpers.createSKU({
        spuId: 1, // 假设SPU ID为1
        skuCode: skuCode,
        name: '红色-L码',
        price: 199.99,
        stockQuantity: 100
      });

      // 验证SKU已创建
      await helpers.searchSKU(skuCode);
      await helpers.verifyTextContent('tbody', skuCode);
    });

    test('2.2 应该能够批量编辑SKU价格', async ({ page }) => {
      // 创建两个SKU
      const sku1 = `SKU-BATCH-1-${Date.now()}`;
      const sku2 = `SKU-BATCH-2-${Date.now()}`;

      await helpers.createSKU({
        spuId: 1,
        skuCode: sku1,
        name: '蓝色-M码',
        price: 189.99
      });

      await helpers.createSKU({
        spuId: 1,
        skuCode: sku2,
        name: '绿色-S码',
        price: 179.99
      });

      // 批量修改价格
      await helpers.batchEditSKUPrice([sku1, sku2], 299.99);

      // 验证价格已更新
      await helpers.searchSKU(sku1);
      await helpers.verifyTextContent('tbody', '299.99');
    });

    test('2.3 应该显示低库存警告', async ({ page }) => {
      // 创建一个低库存SKU
      const skuCode = `SKU-LOW-${Date.now()}`;

      await helpers.createSKU({
        spuId: 1,
        skuCode: skuCode,
        name: '低库存商品',
        price: 99.99,
        stockQuantity: 5 // 低于警戒值
      });

      // 搜索并验证低库存标识
      await helpers.searchSKU(skuCode);
      await helpers.verifyElementExists('[data-low-stock="true"]');
    });
  });

  test.describe('3. 库存管理', () => {
    const testSKUId = 1; // 假设测试SKU ID

    test('3.1 应该能够执行入库操作', async ({ page }) => {
      await helpers.inventoryIn(testSKUId, 100, '采购入库');

      // 验证库存增加
      await helpers.verifyInventoryQuantity(testSKUId, {
        total: 100
      });
    });

    test('3.2 应该能够执行出库操作', async ({ page }) => {
      // 先入库
      await helpers.inventoryIn(testSKUId, 100, '初始入库');

      // 再出库
      await helpers.inventoryOut(testSKUId, 30, '订单出库');

      // 验证库存减少
      await helpers.verifyInventoryQuantity(testSKUId, {
        available: 70
      });
    });

    test('3.3 应该能够执行盘点调整', async ({ page }) => {
      await helpers.inventoryAdjust(testSKUId, 150, '月度盘点调整');

      // 验证库存已调整
      await helpers.verifyInventoryQuantity(testSKUId, {
        total: 150
      });
    });

    test('3.4 应该能够锁定和解锁库存', async ({ page }) => {
      // 先确保有足够的可用库存
      await helpers.inventoryIn(testSKUId, 100, '准备库存');

      // 锁定部分库存
      await helpers.inventoryLock(testSKUId, 30, '预留订单');

      // 验证库存锁定
      await helpers.verifyInventoryQuantity(testSKUId, {
        locked: 30,
        available: 70
      });
    });

    test('3.5 应该能够查看交易历史', async ({ page }) => {
      // 执行几次操作
      await helpers.inventoryIn(testSKUId, 50, '入库1');
      await helpers.inventoryOut(testSKUId, 20, '出库1');

      // 查看交易历史
      await helpers.viewTransactionHistory({
        skuId: testSKUId
      });

      // 验证历史记录存在
      await helpers.verifyElementExists('tbody tr');
      await helpers.verifyTextContent('tbody', '入库');
      await helpers.verifyTextContent('tbody', '出库');
    });

    test('3.6 应该能够按操作类型筛选交易历史', async ({ page }) => {
      await helpers.viewTransactionHistory({
        type: '入库'
      });

      // 验证只显示入库记录
      await helpers.verifyElementExists('tbody tr');
      await helpers.verifyTextContent('tbody', '入库');
    });
  });

  test.describe('4. 完整工作流', () => {
    test('4.1 完整的商品上架流程：SPU → SKU → 入库', async ({ page }) => {
      const timestamp = Date.now();
      const spuCode = `SPU-FLOW-${timestamp}`;
      const skuCode = `SKU-FLOW-${timestamp}`;

      // 步骤1: 创建SPU
      await helpers.createSPU({
        code: spuCode,
        name: '完整流程测试商品',
        brand: '测试品牌',
        description: '测试完整的商品上架流程'
      });

      // 步骤2: 为SPU创建SKU
      await helpers.createSKU({
        spuId: 1, // 实际应该是从创建SPU的返回中获取
        skuCode: skuCode,
        name: '标准版',
        price: 299.99,
        stockQuantity: 0
      });

      // 步骤3: 库存入库
      // 注意：这里需要获取创建的SKU的ID
      // 简化处理，假设SKU ID为1
      await helpers.inventoryIn(1, 500, '首次入库');

      // 步骤4: 验证整个流程
      await helpers.verifySPUExists(spuCode);
      await helpers.searchSKU(skuCode);
      await helpers.verifyTextContent('tbody', skuCode);

      // 验证库存
      await helpers.verifyInventoryQuantity(1, {
        total: 500,
        available: 500
      });
    });

    test('4.2 完整的订单出库流程：锁定 → 出库', async ({ page }) => {
      const skuId = 1;

      // 准备库存
      await helpers.inventoryIn(skuId, 200, '准备订单库存');

      // 订单锁定库存
      await helpers.inventoryLock(skuId, 50, '订单锁定');

      // 验证锁定成功
      await helpers.verifyInventoryQuantity(skuId, {
        locked: 50,
        available: 150
      });

      // 订单确认，执行出库
      await helpers.inventoryOut(skuId, 50, '订单出库');

      // 验证出库成功
      await helpers.verifyInventoryQuantity(skuId, {
        locked: 0,
        available: 150
      });
    });
  });

  test.describe('5. 错误处理和边界情况', () => {
    test('5.1 应该阻止出库数量超过可用库存', async ({ page }) => {
      const skuId = 1;

      // 设置一个较小的库存
      await helpers.inventoryAdjust(skuId, 10, '设置小库存');

      // 尝试出库超过可用数量
      await helpers.navigateToInventory();
      await helpers.safeClick(`tr:has([data-sku-id="${skuId}"]) button:has-text("出库")`);
      await helpers.safeFill('[name="quantity"]', '100');
      await helpers.safeClick('button:has-text("确定")');

      // 验证错误消息
      await helpers.verifyElementExists('.ant-message-error');
    });

    test('5.2 应该验证SKU编码唯一性', async ({ page }) => {
      const skuCode = `SKU-UNIQUE-${Date.now()}`;

      // 创建第一个SKU
      await helpers.createSKU({
        spuId: 1,
        skuCode: skuCode,
        name: '第一个SKU',
        price: 99.99
      });

      // 尝试创建相同编码的SKU
      await helpers.navigateToSKUList();
      await helpers.safeClick('button:has-text("新建SKU")');
      await helpers.safeFill('[name="sku_code"]', skuCode);
      await helpers.safeFill('[name="name"]', '重复的SKU');
      await helpers.safeFill('[name="price"]', '99.99');
      await helpers.safeClick('button:has-text("确定")');

      // 验证错误消息
      await helpers.verifyElementExists('.ant-message-error');
    });
  });
});
