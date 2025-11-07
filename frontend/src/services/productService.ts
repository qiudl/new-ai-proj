/**
 * 商品管理服务
 * 提供 SPU、SKU、库存管理的 API 调用
 */

import api from './api';
import {
  SPU,
  SPUListItem,
  SPUDetail,
  SPUCreateRequest,
  SPUUpdateRequest,
  SPUFilter,
  SKU,
  SKUWithDetails,
  SKUCreateRequest,
  SKUBatchCreateRequest,
  SKUBatchUpdateRequest,
  SKUFilter,
  InventoryRecord,
  InventoryRecordResponse,
  InventoryTransaction,
  InventoryTransactionResponse,
  InventoryInRequest,
  InventoryOutRequest,
  InventoryAdjustRequest,
  InventoryLockRequest,
  InventoryUnlockRequest,
  InventoryFilter,
  TransactionFilter,
  PaginatedResponse,
} from '../types/product';

// ==================== SPU 服务 ====================

/**
 * 创建 SPU
 */
export const createSPU = async (data: SPUCreateRequest): Promise<SPU> => {
  const response = await api.post('/products/spus', data);
  return response.data;
};

/**
 * 获取 SPU 列表
 */
export const listSPUs = async (
  filter: SPUFilter = {}
): Promise<PaginatedResponse<SPUListItem>> => {
  const response = await api.get('/products/spus', { params: filter });
  return response.data;
};

/**
 * 获取 SPU 列表（含统计）
 */
export const listSPUsWithStats = async (
  filter: SPUFilter = {}
): Promise<PaginatedResponse<SPUListItem>> => {
  const response = await api.get('/products/spus/stats', { params: filter });
  return response.data;
};

/**
 * 获取 SPU 详情
 */
export const getSPU = async (id: number): Promise<SPU> => {
  const response = await api.get(`/products/spus/${id}`);
  return response.data;
};

/**
 * 获取 SPU 详情（含统计）
 */
export const getSPUDetail = async (id: number): Promise<SPUDetail> => {
  const response = await api.get(`/products/spus/${id}/detail`);
  return response.data;
};

/**
 * 更新 SPU
 */
export const updateSPU = async (
  id: number,
  data: SPUUpdateRequest
): Promise<SPU> => {
  const response = await api.put(`/products/spus/${id}`, data);
  return response.data;
};

/**
 * 删除 SPU
 */
export const deleteSPU = async (id: number): Promise<void> => {
  await api.delete(`/products/spus/${id}`);
};

/**
 * 获取 SPU 下的所有 SKU
 */
export const getSPUSKUs = async (spuId: number): Promise<SKU[]> => {
  const response = await api.get(`/products/spus/${spuId}/skus`);
  return response.data;
};

// ==================== SKU 服务 ====================

/**
 * 创建 SKU
 */
export const createSKU = async (data: SKUCreateRequest): Promise<SKU> => {
  const response = await api.post('/products/skus', data);
  return response.data;
};

/**
 * 批量创建 SKU
 */
export const batchCreateSKUs = async (
  data: SKUBatchCreateRequest
): Promise<{ message: string; count: number }> => {
  const response = await api.post('/products/skus/batch', data);
  return response.data;
};

/**
 * 批量更新 SKU
 */
export const batchUpdateSKUs = async (
  data: SKUBatchUpdateRequest
): Promise<{ message: string; count: number }> => {
  const response = await api.put('/products/skus/batch', data);
  return response.data;
};

/**
 * 获取 SKU 列表
 */
export const listSKUs = async (
  filter: SKUFilter = {}
): Promise<PaginatedResponse<SKU>> => {
  const response = await api.get('/products/skus', { params: filter });
  return response.data;
};

/**
 * 获取 SKU 列表（含详情）
 */
export const listSKUsWithDetails = async (
  filter: SKUFilter = {}
): Promise<PaginatedResponse<SKUWithDetails>> => {
  const response = await api.get('/products/skus/details', { params: filter });
  return response.data;
};

/**
 * 获取 SKU 详情
 */
export const getSKU = async (id: number): Promise<SKU> => {
  const response = await api.get(`/products/skus/${id}`);
  return response.data;
};

/**
 * 更新 SKU
 */
export const updateSKU = async (
  id: number,
  data: Partial<SKUCreateRequest>
): Promise<SKU> => {
  const response = await api.put(`/products/skus/${id}`, data);
  return response.data;
};

/**
 * 删除 SKU
 */
export const deleteSKU = async (id: number): Promise<void> => {
  await api.delete(`/products/skus/${id}`);
};

// ==================== 库存服务 ====================

/**
 * 入库
 */
export const inventoryIn = async (
  data: InventoryInRequest
): Promise<{ message: string }> => {
  const response = await api.post('/inventory/in', data);
  return response.data;
};

/**
 * 出库
 */
export const inventoryOut = async (
  data: InventoryOutRequest
): Promise<{ message: string }> => {
  const response = await api.post('/inventory/out', data);
  return response.data;
};

/**
 * 调整库存（盘点）
 */
export const adjustInventory = async (
  data: InventoryAdjustRequest
): Promise<{ message: string }> => {
  const response = await api.post('/inventory/adjust', data);
  return response.data;
};

/**
 * 锁定库存
 */
export const lockInventory = async (
  data: InventoryLockRequest
): Promise<{ message: string }> => {
  const response = await api.post('/inventory/lock', data);
  return response.data;
};

/**
 * 解锁库存
 */
export const unlockInventory = async (
  data: InventoryUnlockRequest
): Promise<{ message: string }> => {
  const response = await api.post('/inventory/unlock', data);
  return response.data;
};

/**
 * 获取库存记录列表
 */
export const listInventoryRecords = async (
  filter: InventoryFilter = {}
): Promise<PaginatedResponse<InventoryRecordResponse>> => {
  const response = await api.get('/inventory/records', { params: filter });
  return response.data;
};

/**
 * 获取指定 SKU 的库存信息
 */
export const getSKUInventory = async (
  skuId: number,
  warehouseId?: number
): Promise<InventoryRecordResponse> => {
  const params = warehouseId ? { warehouse_id: warehouseId } : {};
  const response = await api.get(`/inventory/skus/${skuId}`, { params });
  return response.data;
};

/**
 * 获取库存变动历史
 */
export const getTransactionHistory = async (
  filter: TransactionFilter = {}
): Promise<PaginatedResponse<InventoryTransactionResponse>> => {
  const response = await api.get('/inventory/transactions', { params: filter });
  return response.data;
};

/**
 * 获取单条库存变动记录
 */
export const getTransaction = async (
  id: number
): Promise<InventoryTransactionResponse> => {
  const response = await api.get(`/inventory/transactions/${id}`);
  return response.data;
};

// ==================== 工具函数 ====================

/**
 * 格式化价格显示
 */
export const formatPrice = (price: number): string => {
  return `¥${price.toFixed(2)}`;
};

/**
 * 格式化库存数量显示
 */
export const formatStock = (quantity: number): string => {
  return quantity.toLocaleString();
};

/**
 * 判断是否低库存
 */
export const isLowStock = (
  availableQuantity: number,
  threshold?: number
): boolean => {
  if (!threshold) return false;
  return availableQuantity <= threshold;
};

/**
 * 获取 SPU 状态文本
 */
export const getSPUStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    active: '上架',
    inactive: '下架',
  };
  return statusMap[status] || status;
};

/**
 * 获取 SPU 状态颜色
 */
export const getSPUStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    draft: 'default',
    active: 'success',
    inactive: 'error',
  };
  return colorMap[status] || 'default';
};

/**
 * 获取交易类型文本
 */
export const getTransactionTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    in: '入库',
    out: '出库',
    adjust: '调整',
    lock: '锁定',
    unlock: '解锁',
    return: '退货',
  };
  return typeMap[type] || type;
};

/**
 * 获取交易类型颜色
 */
export const getTransactionTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    in: 'success',
    out: 'error',
    adjust: 'warning',
    lock: 'processing',
    unlock: 'default',
    return: 'warning',
  };
  return colorMap[type] || 'default';
};

export default {
  // SPU
  createSPU,
  listSPUs,
  listSPUsWithStats,
  getSPU,
  getSPUDetail,
  updateSPU,
  deleteSPU,
  getSPUSKUs,
  // SKU
  createSKU,
  batchCreateSKUs,
  batchUpdateSKUs,
  listSKUs,
  listSKUsWithDetails,
  getSKU,
  updateSKU,
  deleteSKU,
  // Inventory
  inventoryIn,
  inventoryOut,
  adjustInventory,
  lockInventory,
  unlockInventory,
  listInventoryRecords,
  getSKUInventory,
  getTransactionHistory,
  getTransaction,
  // Utils
  formatPrice,
  formatStock,
  isLowStock,
  getSPUStatusText,
  getSPUStatusColor,
  getTransactionTypeText,
  getTransactionTypeColor,
};
