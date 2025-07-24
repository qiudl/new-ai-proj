// FlexibleDataTable 组件统一导出文件

import type { FlexibleColumnConfig, ActionButton, BatchAction, SearchConfig, PaginationConfig } from './types';

// 导出主组件
export { FlexibleDataTable } from './FlexibleDataTable';

// 便捷配置生成器
export class FlexibleTableConfig {
  // 创建基础列配置
  static createColumn(config: Partial<FlexibleColumnConfig> & { key: string; title: string }): FlexibleColumnConfig {
    return {
      key: config.key,
      title: config.title,
      dataIndex: config.dataIndex || config.key,
      width: config.width || 120,
      visible: config.visible !== false,
      sortable: config.sortable || false,
      resizable: config.resizable !== false,
      draggable: config.draggable !== false,
      fixed: config.fixed,
      required: config.required || false,
      customField: config.customField || false,
      render: config.render,
      sorter: config.sorter,
      filters: config.filters,
      onFilter: config.onFilter,
      ellipsis: config.ellipsis,
      align: config.align || 'left',
      className: config.className,
      minWidth: config.minWidth,
      maxWidth: config.maxWidth,
    };
  }

  // 创建固定左侧列
  static createLeftFixedColumn(config: Partial<FlexibleColumnConfig> & { key: string; title: string }): FlexibleColumnConfig {
    return this.createColumn({
      ...config,
      fixed: 'left',
      draggable: false,
    });
  }

  // 创建固定右侧列
  static createRightFixedColumn(config: Partial<FlexibleColumnConfig> & { key: string; title: string }): FlexibleColumnConfig {
    return this.createColumn({
      ...config,
      fixed: 'right',
      draggable: false,
    });
  }

  // 创建操作按钮
  static createActionButton(config: ActionButton): ActionButton {
    return {
      key: config.key,
      title: config.title,
      icon: config.icon,
      type: config.type || 'text',
      danger: config.danger || false,
      disabled: config.disabled,
      visible: config.visible,
      onClick: config.onClick,
      loading: config.loading,
    };
  }

  // 创建批量操作
  static createBatchAction(config: BatchAction): BatchAction {
    return {
      key: config.key,
      title: config.title,
      icon: config.icon,
      danger: config.danger || false,
      disabled: config.disabled,
      visible: config.visible,
      onClick: config.onClick,
      confirm: config.confirm,
    };
  }

  // 创建搜索配置
  static createSearchConfig(config: Partial<SearchConfig> = {}): SearchConfig {
    return {
      placeholder: config.placeholder || '搜索...',
      searchFields: config.searchFields || [],
      onSearch: config.onSearch,
      allowClear: config.allowClear !== false,
      enterButton: config.enterButton !== false,
    };
  }

  // 创建分页配置
  static createPaginationConfig(config: Partial<PaginationConfig> = {}): PaginationConfig {
    return {
      current: config.current || 1,
      pageSize: config.pageSize || 20,
      total: config.total || 0,
      showSizeChanger: config.showSizeChanger !== false,
      showQuickJumper: config.showQuickJumper !== false,
      showTotal: config.showTotal || ((total, range) => `共 ${total} 条记录，显示 ${range[0]}-${range[1]} 条`),
      pageSizeOptions: config.pageSizeOptions || ['10', '20', '50', '100'],
      onChange: config.onChange,
      onShowSizeChange: config.onShowSizeChange,
    };
  }

  // 预设的常用列类型
  static columnPresets = {
    // ID 列
    id: (config: Partial<FlexibleColumnConfig> = {}): FlexibleColumnConfig => 
      this.createLeftFixedColumn({
        key: 'id',
        title: 'ID',
        dataIndex: 'id',
        width: 80,
        sortable: true,
        required: true,
        ...config,
      }),

    // 名称列
    name: (config: Partial<FlexibleColumnConfig> = {}): FlexibleColumnConfig => 
      this.createLeftFixedColumn({
        key: 'name',
        title: '名称',
        dataIndex: 'name',
        width: 200,
        sortable: true,
        ellipsis: true,
        required: true,
        ...config,
      }),

    // 状态列
    status: (config: Partial<FlexibleColumnConfig> = {}): FlexibleColumnConfig => 
      this.createColumn({
        key: 'status',
        title: '状态',
        dataIndex: 'status',
        width: 100,
        align: 'center',
        filters: [
          { text: '启用', value: 'active' },
          { text: '禁用', value: 'inactive' },
        ],
        ...config,
      }),

    // 时间列
    createdAt: (config: Partial<FlexibleColumnConfig> = {}): FlexibleColumnConfig => 
      this.createColumn({
        key: 'created_at',
        title: '创建时间',
        dataIndex: 'created_at',
        width: 160,
        sortable: true,
        ...config,
      }),

    updatedAt: (config: Partial<FlexibleColumnConfig> = {}): FlexibleColumnConfig => 
      this.createColumn({
        key: 'updated_at',
        title: '更新时间',
        dataIndex: 'updated_at',
        width: 160,
        sortable: true,
        ...config,
      }),
  };
}

// 导出类型定义
export type {
  FlexibleDataTableProps,
  FlexibleColumnConfig,
  ActionButton,
  BatchAction,
  SearchConfig,
  FilterConfig,
  PaginationConfig,
  ToolbarConfig,
  TableState,
  DragEndResult,
  ColumnSettingsState,
} from './types';

// 默认配置
export const defaultFlexibleTableConfig = {
  size: 'middle' as const,
  bordered: true,
  showHeader: true,
  tableLayout: 'fixed' as const,
  sticky: false,
  pagination: FlexibleTableConfig.createPaginationConfig(),
  search: FlexibleTableConfig.createSearchConfig(),
};