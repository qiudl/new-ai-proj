// Local type shims for Ant Design
// Map legacy zh_CN import path to the official one to avoid unknown type issues
declare module 'antd/lib/locale/zh_CN' {
  import zhCN from 'antd/locale/zh_CN';
  export default zhCN;
}

// Relax some AntD prop typings used across the codebase for rapid migration
// Note: for TagProps, AntD uses a type alias in v5 so module augmentation won't merge.
// Prefer to remove invalid props in code. We still keep a permissive declaration here for DX.
declare module 'antd/es/tag' {
  export interface TagProps {
    size?: string; // non-standard, tolerated for migration only
  }
}

declare module 'antd/es/badge' {
  export interface BadgeProps {
    status?: any; // allow computed preset status strings
  }
}

declare module 'antd/es/card' {
  export interface CardProps {
    size?: 'small' | 'middle' | 'large' | undefined;
    variant?: any;
  }
}

declare module 'antd/es/table' {
  // Provide ColumnsType and relax columns typing to ease migration
  export type ColumnsType<T = any> = any;
  export interface TableProps<T = any> {
    columns?: any;
    rowSelection?: any;
  }
}
