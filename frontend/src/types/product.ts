/**
 * 商品管理类型定义
 * SPU (Standard Product Unit) - 标准产品单元
 * SKU (Stock Keeping Unit) - 库存单元
 */

// ==================== SPU 相关类型 ====================

export interface SPU {
  id: number;
  spu_code: string;
  name: string;
  enterprise_id: number;
  category_id?: number;
  brand?: string;
  description?: string;
  main_image?: string;
  images: string[];
  specifications: Record<string, any>;
  status: 'draft' | 'active' | 'inactive';
  created_by?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface SPUListItem {
  id: number;
  spu_code: string;
  name: string;
  brand: string;
  main_image: string;
  status: string;
  sku_count: number;
  total_stock: number;
  created_at: string;
}

export interface SPUDetail extends SPU {
  sku_count: number;
  total_stock: number;
  skus?: SKU[];
}

export interface SPUCreateRequest {
  spu_code: string;
  name: string;
  enterprise_id: number;
  category_id?: number;
  brand?: string;
  description?: string;
  main_image?: string;
  images?: string[];
  specifications?: Record<string, any>;
  status?: 'draft' | 'active' | 'inactive';
}

export interface SPUUpdateRequest {
  spu_code?: string;
  name?: string;
  category_id?: number;
  brand?: string;
  description?: string;
  main_image?: string;
  images?: string[];
  specifications?: Record<string, any>;
  status?: 'draft' | 'active' | 'inactive';
}

export interface SPUFilter {
  status?: string;
  brand?: string;
  category_id?: number;
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// ==================== SKU 相关类型 ====================

export interface SKU {
  id: number;
  sku_code: string;
  spu_id: number;
  name: string;
  barcode?: string;
  attributes: Record<string, any>;
  price: number;
  cost_price?: number;
  market_price?: number;
  weight?: number;
  volume?: number;
  status: 'draft' | 'active' | 'inactive';
  is_default: boolean;
  stock_alert_threshold?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface SKUWithDetails extends SKU {
  spu?: SPU;
  available_quantity?: number;
  locked_quantity?: number;
  total_quantity?: number;
}

export interface SKUCreateRequest {
  sku_code: string;
  spu_id: number;
  name: string;
  barcode?: string;
  attributes?: Record<string, any>;
  price: number;
  cost_price?: number;
  market_price?: number;
  weight?: number;
  volume?: number;
  status?: 'draft' | 'active' | 'inactive';
  is_default?: boolean;
  stock_alert_threshold?: number;
}

export interface SKUBatchCreateRequest {
  spu_id: number;
  skus: SKUCreateRequest[];
}

export interface SKUBatchUpdateRequest {
  skus: Array<{
    id: number;
    price?: number;
    cost_price?: number;
    market_price?: number;
    status?: string;
    stock_alert_threshold?: number;
  }>;
}

export interface SKUFilter {
  spu_id?: number;
  status?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  low_stock?: boolean;
  page?: number;
  page_size?: number;
}

// ==================== 库存相关类型 ====================

export interface InventoryRecord {
  id: number;
  sku_id: number;
  warehouse_id?: number;
  available_quantity: number;
  locked_quantity: number;
  total_quantity: number;
  last_in_date?: string;
  last_out_date?: string;
  last_check_date?: string;
  updated_at: string;
}

export interface InventoryRecordResponse {
  sku_id: number;
  sku_code: string;
  sku_name: string;
  warehouse_id?: number;
  available_quantity: number;
  locked_quantity: number;
  total_quantity: number;
  last_in_date?: string;
  last_out_date?: string;
  last_check_date?: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: number;
  sku_id: number;
  warehouse_id?: number;
  transaction_type: 'in' | 'out' | 'adjust' | 'lock' | 'unlock';
  quantity: number;
  before_quantity: number;
  after_quantity: number;
  operator_id?: number;
  reason?: string;
  reference_id?: number;
  reference_type?: string;
  created_at: string;
}

export interface InventoryTransactionResponse {
  id: number;
  sku_id: number;
  sku_code: string;
  sku_name: string;
  transaction_type: string;
  quantity: number;
  before_quantity: number;
  after_quantity: number;
  operator_id?: number;
  operator_name?: string;
  reason?: string;
  reference_type?: string;
  reference_id?: number;
  created_at: string;
}

export interface InventoryInRequest {
  sku_id: number;
  quantity: number;
  warehouse_id?: number;
  reason?: string;
  reference_type?: string;
  reference_id?: number;
}

export interface InventoryOutRequest {
  sku_id: number;
  quantity: number;
  warehouse_id?: number;
  reason?: string;
  reference_type?: string;
  reference_id?: number;
}

export interface InventoryAdjustRequest {
  sku_id: number;
  warehouse_id?: number;
  new_quantity: number;
  reason: string;
}

export interface InventoryLockRequest {
  sku_id: number;
  quantity: number;
  warehouse_id?: number;
  reason?: string;
  reference_type?: string;
  reference_id?: number;
}

export interface InventoryUnlockRequest {
  sku_id: number;
  quantity: number;
  warehouse_id?: number;
  reason?: string;
  reference_type?: string;
  reference_id?: number;
}

export interface InventoryFilter {
  sku_id?: number;
  warehouse_id?: number;
  low_stock?: boolean;
  page?: number;
  page_size?: number;
}

export interface TransactionFilter {
  sku_id?: number;
  warehouse_id?: number;
  transaction_type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

// ==================== 产品属性相关 ====================

export interface ProductAttribute {
  id: number;
  name: string;
  display_name: string;
  input_type: 'select' | 'input' | 'color' | 'image';
  is_required: boolean;
  is_variant: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductAttributeValue {
  id: number;
  attribute_id: number;
  value: string;
  display_value: string;
  image_url?: string;
  color_code?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ==================== 通用响应类型 ====================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
