/**
 * 文档类型定义增强 - 支持display_id
 *
 * 此文件为现有文档接口添加display_id和doc_type_prefix支持
 *
 * @version 1.0.0
 * @since 2025-10-10
 */

/**
 * 文档基础信息接口扩展
 * 所有文档相关接口都应该继承或包含这些字段
 */
export interface DocumentWithDisplayID {
  /** 内部数字ID（保留用于兼容） */
  id: number | string;

  /** 格式化显示ID (如 DOC-10001, NOTE-20001, API-30001 等) */
  display_id?: string;

  /** 文档类型前缀 (DOC/NOTE/API/SPEC/FILE) */
  doc_type_prefix?: 'DOC' | 'NOTE' | 'API' | 'SPEC' | 'FILE';
}

/**
 * DocumentInfo 接口扩展
 * 如果在其他地方有DocumentInfo定义，应该包含这些字段
 */
export interface DocumentInfo extends DocumentWithDisplayID {
  title: string;
  type: string;
  size: number;
  updatedAt: string;
  author?: string;
  content?: string;
  tags?: string[];
  isLoading?: boolean;
}

/**
 * 获取文档显示ID的工具函数类型
 */
export type GetDocumentDisplayID = (doc: DocumentWithDisplayID) => string;

/**
 * 文档类型前缀描述映射
 */
export const DOC_TYPE_PREFIX_LABELS: Record<string, string> = {
  'DOC': '任务文档',
  'NOTE': '工作笔记',
  'API': 'API文档',
  'SPEC': '设计规格',
  'FILE': '通用文档'
};

/**
 * 文档类型前缀颜色映射（用于Tag显示）
 */
export const DOC_TYPE_PREFIX_COLORS: Record<string, string> = {
  'DOC': 'blue',
  'NOTE': 'purple',
  'API': 'green',
  'SPEC': 'orange',
  'FILE': 'default'
};
