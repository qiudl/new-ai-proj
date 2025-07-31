import { ReactNode } from 'react';
import type { SorterResult } from 'antd/es/table/interface';
import type { TableProps } from 'antd';

// 列配置接口
export interface FlexibleColumnConfig {
  key: string;
  title: string;
  dataIndex: string | string[] | ((record: any) => any);
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  fixed?: 'left' | 'right';
  visible: boolean;
  sortable: boolean;
  resizable: boolean;
  draggable: boolean;
  required?: boolean; // 必须显示的列，无法隐藏
  customField?: boolean; // 自定义字段标识
  render?: (value: any, record: any, index: number) => ReactNode;
  sorter?: boolean | ((a: any, b: any) => number);
  filters?: Array<{ text: string; value: any }>;
  onFilter?: (value: any, record: any) => boolean;
  ellipsis?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

// 操作按钮配置
export interface ActionButton {
  key: string;
  title?: string;
  icon?: ReactNode;
  type?: 'default' | 'primary' | 'text' | 'link' | 'ghost' | 'dashed';
  danger?: boolean;
  disabled?: (record: any) => boolean;
  visible?: (record: any) => boolean;
  onClick: (record: any, index: number) => void;
  loading?: (record: any) => boolean;
}

// 批量操作配置
export interface BatchAction {
  key: string;
  title: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: (selectedKeys: React.Key[], selectedRows: any[]) => boolean;
  visible?: (selectedKeys: React.Key[], selectedRows: any[]) => boolean;
  onClick: (selectedKeys: React.Key[], selectedRows: any[]) => void;
  confirm?: {
    title: string;
    content?: string;
  };
}

// 搜索配置
export interface SearchConfig {
  placeholder?: string;
  searchFields?: string[]; // 搜索的字段名
  onSearch?: (value: string, searchFields: string[]) => void;
  allowClear?: boolean;
  enterButton?: boolean;
}

// 筛选配置
export interface FilterConfig {
  filters: Array<{
    key: string;
    title: string;
    type: 'select' | 'dateRange' | 'numberRange' | 'text';
    options?: Array<{ label: string; value: any }>;
    placeholder?: string;
    defaultValue?: any;
  }>;
  onFilter?: (filters: Record<string, any>) => void;
}

// 分页配置
export interface PaginationConfig {
  current?: number;
  pageSize?: number;
  total?: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number, range: [number, number]) => ReactNode;
  pageSizeOptions?: string[];
  onChange?: (page: number, pageSize: number) => void;
  onShowSizeChange?: (current: number, size: number) => void;
}

// 排序状态
interface SortState {
  field: string;
  order: 'ascend' | 'descend' | null;
}

// 表格主配置接口
export interface FlexibleDataTableProps {
  // 数据相关
  dataSource: any[];
  loading?: boolean;
  rowKey?: string | ((record: any) => string);
  
  // 列配置
  columns: FlexibleColumnConfig[];
  onColumnsChange?: (columns: FlexibleColumnConfig[]) => void;
  
  // 操作相关
  actions?: ActionButton[];
  batchActions?: BatchAction[];
  
  // 选择相关
  rowSelection?: {
    type?: 'checkbox' | 'radio';
    selectedRowKeys?: React.Key[];
    onChange?: (selectedRowKeys: React.Key[], selectedRows: any[]) => void;
    onSelect?: (record: any, selected: boolean, selectedRows: any[], nativeEvent: Event) => void;
    onSelectAll?: (selected: boolean, selectedRows: any[], changeRows: any[]) => void;
    getCheckboxProps?: (record: any) => any;
  };
  
  // 搜索和筛选
  searchConfig?: SearchConfig;
  filterConfig?: FilterConfig;
  
  // 分页
  paginationConfig?: PaginationConfig | false;
  
  // 排序
  sortConfig?: {
    defaultSort?: SortState;
    onSort?: (field: string, order: 'ascend' | 'descend' | null) => void;
  };
  
  // 样式和布局
  size?: 'small' | 'middle' | 'large';
  bordered?: boolean;
  showHeader?: boolean;
  scroll?: { x?: number | string; y?: number | string };
  sticky?: boolean | { offsetHeader?: number; offsetScroll?: number };
  
  // 个性化配置
  configStorage?: {
    key: string; // localStorage key
    saveColumns?: boolean;
    savePagination?: boolean;
    saveSort?: boolean;
  };
  
  // 导出功能
  exportConfig?: {
    enable: boolean;
    formats?: ('csv' | 'excel' | 'pdf')[];
    fileName?: string;
    onExport?: (format: string, data: any[]) => void;
  };
  
  // 扩展功能
  expandable?: {
    expandedRowRender?: (record: any, index: number, indent: number, expanded: boolean) => ReactNode;
    expandedRowKeys?: React.Key[];
    onExpand?: (expanded: boolean, record: any) => void;
    onExpandedRowsChange?: (expandedRows: readonly React.Key[]) => void;
  };
  
  // 事件回调
  onRow?: (record: any, index?: number) => any;
  onChange?: (pagination: any, filters: any, sorter: SorterResult<any> | SorterResult<any>[], extra: any) => void;
  
  // 其他 Ant Design Table 属性
  className?: string;
  style?: React.CSSProperties;
  title?: (currentPageData?: readonly any[]) => ReactNode;
  footer?: (currentPageData?: readonly any[]) => ReactNode;
  tableLayout?: 'auto' | 'fixed';
}

// 列拖拽排序的结果类型
export interface DragEndResult {
  source: {
    index: number;
    droppableId: string;
  };
  destination: {
    index: number;
    droppableId: string;
  } | null;
}

// 列设置面板的状态
export interface ColumnSettingsState {
  visible: boolean;
  searchTerm: string;
  selectedColumns: string[];
}

// 工具栏配置
export interface ToolbarConfig {
  showSearch?: boolean;
  showFilter?: boolean;
  showColumnSettings?: boolean;
  showRefresh?: boolean;
  showExport?: boolean;
  showBatchActions?: boolean;
  customButtons?: Array<{
    key: string;
    title: string;
    icon?: ReactNode;
    type?: 'default' | 'primary' | 'dashed' | 'text' | 'link';
    onClick: () => void;
  }>;
}

// 表格状态管理
export interface TableState {
  loading: boolean;
  selectedRowKeys: React.Key[];
  selectedRows: any[];
  searchValue: string;
  filters: Record<string, any>;
  sorter: SortState | null;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
}