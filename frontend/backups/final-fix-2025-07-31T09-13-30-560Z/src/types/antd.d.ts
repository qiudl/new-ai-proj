// Type declarations for Ant Design modules
declare module 'antd/locale/zh_CN' {
  const zhCN: any;
  export default zhCN;
}

declare module 'antd/es/table' {
  export * from 'antd/es/table';
  export { default } from 'antd/es/table';
}

declare module 'antd/es/table' {
  import { ComponentType } from 'react';
  
  export interface ColumnsType<T = any> extends Array<ColumnType<T>> {}
  
  export interface ColumnType<T = any> {
    title?: React.ReactNode;
    dataIndex?: string | string[];
    key?: string;
    render?: (value: any, record: T, index: number) => React.ReactNode;
    width?: number | string;
    ellipsis?: boolean;
    sorter?: boolean | ((a: T, b: T) => number);
    defaultSortOrder?: 'ascend' | 'descend';
    filters?: Array<{ text: string; value: any }>;
    onFilter?: (value: string | number | boolean, record: T) => boolean;
    [key: string]: any;
  }
  
  export interface TableProps<T = any> {
    columns?: ColumnsType<T>;
    dataSource?: T[];
    rowKey?: string | ((record: T) => string);
    loading?: boolean;
    pagination?: any;
    scroll?: { x?: number; y?: number };
    [key: string]: any;
  }
  
  declare const Table: ComponentType<TableProps>;
  export default Table;
}