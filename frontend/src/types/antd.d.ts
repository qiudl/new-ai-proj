// Local type shims for Ant Design
// Map legacy zh_CN import path to the official one to avoid unknown type issues
declare module 'antd/lib/locale/zh_CN' {
  import zhCN from 'antd/locale/zh_CN';
  export default zhCN;
}

// Relax some AntD prop typings used across the codebase for rapid migration
declare module 'antd/es/tag' {
  export interface TagProps {
    // Allow a non-standard size prop used in various components
    size?: string;
  }
}

declare module 'antd/es/badge' {
  export interface BadgeProps {
    // Allow computed or custom statuses
    status?: any;
  }
}

declare module 'antd/es/card' {
  export interface CardProps {
    // Accept string union mapping to AntD CardSize
    size?: 'small' | 'middle' | 'large' | undefined;
    variant?: any;
  }
}

declare module 'antd/es/table' {
  // Allow passing "unknown" or custom-shaped columns during migration
  export interface TableProps<T = any> {
    columns?: any;
  }
}
