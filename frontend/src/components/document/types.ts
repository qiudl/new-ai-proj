/**
 * 统一文档组件系统类型定义
 * 
 * 本文件包含重构后文档系统的所有类型定义
 * 请使用这些类型确保类型安全
 * 
 * @version 3.0
 * @since 2025-09-30
 */

import { CSSProperties, ReactNode } from 'react';
import { Document as UnifiedDocument } from '../../types/document';

// ============================================================================
// 核心组件属性类型
// ============================================================================

/**
 * UnifiedTaskDocumentArea 主组件属性
 */
export interface UnifiedTaskDocumentAreaProps {
  /** 项目ID */
  projectId: number;
  
  /** 任务ID */
  taskId: number;
  
  /** 当前选中的文档ID */
  currentDocumentId?: string;
  
  /** 选中的文档ID列表（多选） */
  selectedDocumentIds?: string[];
  
  /** 默认视图模式 */
  defaultViewMode?: 'edit' | 'preview' | 'manage' | 'stats';
  
  /** 组件高度 */
  height?: string | number;
  
  /** 是否显示工具栏 */
  showToolbar?: boolean;
  
  /** 是否显示文档列表 */
  showDocumentList?: boolean;
  
  /** 是否显示标题栏 */
  headerVisible?: boolean;
  
  /** 紧凑模式 */
  compactMode?: boolean;
  
  /** 只读模式 */
  readonly?: boolean;
  
  /** 包含子任务文档 */
  includeSubtaskDocuments?: boolean;
  
  // 全屏功能
  /** 全屏模式 */
  fullscreenMode?: boolean;
  
  /** 全屏触发方式 */
  fullscreenTrigger?: 'button' | 'key' | 'auto';
  
  /** ESC键退出全屏 */
  fullscreenExitOnEsc?: boolean;
  
  // 高级功能
  /** 启用评论功能 */
  enableComments?: boolean;
  
  /** 启用搜索功能 */
  enableSearch?: boolean;
  
  /** 启用分享功能 */
  enableShare?: boolean;
  
  /** 启用性能监控 */
  enablePerformanceMonitor?: boolean;
  
  /** 调试模式 */
  debug?: boolean;
  
  // 事件回调
  /** 文档选择回调 */
  onDocumentSelect?: (documentId: string) => void;
  
  /** 文档变化回调 */
  onDocumentChange?: (document: UnifiedDocument) => void;
  
  /** 保存文档回调 */
  onSaveDocument?: () => Promise<void>;
  
  /** 全屏切换回调 */
  onFullscreenToggle?: (isFullscreen: boolean) => void;
  
  /** 搜索结果回调 */
  onSearchResult?: (results: SearchResult[]) => void;
  
  /** 分享回调 */
  onShare?: (shareData: ShareData) => void;
  
  /** 创建分享链接回调 */
  onCreateShareLink?: (linkData: ShareLinkData) => void;
  
  /** 撤销分享链接回调 */
  onRevokeShareLink?: (linkId: string) => void;
  
  /** 错误回调 */
  onError?: (error: Error) => void;
  
  // 样式
  /** 自定义样式 */
  style?: CSSProperties;
  
  /** 自定义类名 */
  className?: string;
}

/**
 * DocumentAreaAdapter 适配器组件属性
 */
export interface DocumentAreaAdapterProps {
  /** 项目ID */
  projectId: number;
  
  /** 任务ID */
  taskId: number;
  
  /** 适配器模式 */
  mode?: 'inline' | 'modal' | 'fullscreen';
  
  /** 当前文档ID */
  currentDocumentId?: string;
  
  /** 选中的文档ID列表 */
  selectedDocumentIds?: string[];
  
  /** 紧凑模式 */
  compactMode?: boolean;
  
  /** 只读模式 */
  readonly?: boolean;
  
  // 事件回调
  /** 文档选择回调 */
  onDocumentSelect?: (documentId: string) => void;
  
  /** 文档变化回调 */
  onDocumentChange?: (document: UnifiedDocument) => void;
  
  /** 模式变化回调 */
  onModeChange?: (mode: string) => void;
  
  // 样式
  /** 自定义类名 */
  className?: string;
  
  /** 自定义样式 */
  style?: CSSProperties;
}

// ============================================================================
// 数据类型定义
// ============================================================================

/**
 * 搜索结果类型
 */
export interface SearchResult {
  /** 匹配的文档ID */
  documentId: string;
  
  /** 匹配的文档标题 */
  documentTitle: string;
  
  /** 匹配的行号 */
  lineNumber: number;
  
  /** 匹配的内容片段 */
  content: string;
  
  /** 高亮的查询词 */
  query: string;
  
  /** 匹配得分 */
  score: number;
}

/**
 * 分享数据类型
 */
export interface ShareData {
  /** 分享的文档ID */
  documentId: string;
  
  /** 分享给的用户列表 */
  recipients: string[];
  
  /** 分享权限 */
  permission: SharePermission;
  
  /** 分享消息 */
  message?: string;
}

/**
 * 分享权限类型
 */
export type SharePermission = 'view' | 'edit' | 'comment';

/**
 * 分享链接数据类型
 */
export interface ShareLinkData {
  /** 文档ID */
  documentId: string;
  
  /** 分享权限 */
  permission: SharePermission;
  
  /** 过期时间 */
  expiresAt?: Date;
  
  /** 分享链接 */
  shareUrl: string;
}

/**
 * 分享选项类型
 */
export interface ShareOption {
  /** 选项值 */
  value: SharePermission;
  
  /** 选项标签 */
  label: string;
  
  /** 选项描述 */
  description: string;
  
  /** 选项图标 */
  icon?: ReactNode;
}

/**
 * 文档评论类型
 */
export interface DocumentComment {
  /** 评论ID */
  id: string;
  
  /** 文档ID */
  documentId: string;
  
  /** 评论内容 */
  content: string;
  
  /** 评论者 */
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  
  /** 创建时间 */
  createdAt: Date;
  
  /** 更新时间 */
  updatedAt?: Date;
  
  /** 是否已解决 */
  resolved: boolean;
  
  /** 点赞数 */
  likes: number;
  
  /** 当前用户是否点赞 */
  isLiked: boolean;
  
  /** 回复列表 */
  replies?: DocumentComment[];
  
  /** 父评论ID */
  parentId?: string;
}

// ============================================================================
// 组件引用类型
// ============================================================================

/**
 * UnifiedTaskDocumentArea 组件引用
 */
export interface UnifiedTaskDocumentAreaRef {
  /** 保存当前文档 */
  saveDocument: () => Promise<void>;
  
  /** 获取当前文档 */
  getCurrentDocument: () => UnifiedDocument | null;
  
  /** 刷新文档列表 */
  refreshDocuments: () => Promise<void>;
  
  /** 切换全屏模式 */
  toggleFullscreen: () => void;
  
  /** 进入全屏模式 */
  enterFullscreen: () => void;
  
  /** 退出全屏模式 */
  exitFullscreen: () => void;
  
  /** 获取搜索结果 */
  getSearchResults: () => SearchResult[];
  
  /** 清除搜索 */
  clearSearch: () => void;
}

/**
 * DocumentAreaAdapter 组件引用
 */
export interface DocumentAreaAdapterRef {
  /** 保存文档 */
  saveDocument: () => Promise<void>;
  
  /** 获取当前文档 */
  getCurrentDocument: () => UnifiedDocument | null;
  
  /** 刷新文档 */
  refreshDocuments: () => Promise<void>;
  
  /** 改变模式 */
  changeMode: (newMode: string) => void;
}

// ============================================================================
// 预设配置类型
// ============================================================================

/**
 * 适配器预设配置
 */
export interface AdapterPresetConfig {
  /** 模式 */
  mode: 'inline' | 'modal' | 'fullscreen';
  
  /** 紧凑模式 */
  compactMode: boolean;
  
  /** 只读模式 */
  readonly: boolean;
}

/**
 * 预设配置映射
 */
export interface AdapterPresets {
  /** 任务详情页内嵌模式 */
  taskDetail: AdapterPresetConfig;
  
  /** 任务卡片紧凑模式 */
  taskCard: AdapterPresetConfig;
  
  /** 模态框预览模式 */
  modal: AdapterPresetConfig;
  
  /** 全屏编辑模式 */
  fullscreenEdit: AdapterPresetConfig;
  
  /** 只读预览模式 */
  preview: AdapterPresetConfig;
}

// ============================================================================
// 迁移相关类型
// ============================================================================

/**
 * 旧版 TaskDocumentEditor 属性
 * @deprecated 请使用 UnifiedTaskDocumentAreaProps
 */
export type LegacyTaskDocumentEditorProps = Pick<
  UnifiedTaskDocumentAreaProps,
  'projectId' | 'taskId' | 'onSaveDocument'
> & {
  /** @deprecated 使用 currentDocumentId */
  taskDocument?: any;
  
  /** @deprecated 使用 onSaveDocument */
  onSave?: () => Promise<void>;
};

/**
 * 旧版 DocumentViewer 属性
 * @deprecated 请使用 DocumentAreaAdapterProps
 */
export type LegacyDocumentViewerProps = Pick<
  DocumentAreaAdapterProps,
  'projectId' | 'taskId'
> & {
  /** @deprecated 使用 DocumentAreaAdapter mode="modal" */
  visible: boolean;
  
  /** @deprecated 使用 currentDocumentId */
  documentId: number;
  
  /** @deprecated 在父组件处理 */
  onClose: () => void;
};

/**
 * 旧版 MarkdownEditor 属性
 * @deprecated 请使用 UnifiedTaskDocumentAreaProps
 */
export type LegacyMarkdownEditorProps = {
  /** @deprecated 使用 UnifiedTaskDocumentArea 的文档管理 */
  value: string;
  
  /** @deprecated 使用 onDocumentChange */
  onChange: (value: string) => void;
  
  /** @deprecated 使用 style.height */
  height?: number;
  
  /** @deprecated 使用 readonly */
  readOnly?: boolean;
};

/**
 * 组件迁移映射
 */
export interface ComponentMigrationMapType {
  [key: string]: string;
}

/**
 * 迁移指南条目
 */
export interface MigrationGuideEntry {
  /** 替换组件 */
  replacement: string;
  
  /** 推荐配置 */
  config: Record<string, any>;
  
  /** 示例代码 */
  example: string;
}

/**
 * 迁移指南
 */
export interface MigrationGuide {
  [componentName: string]: MigrationGuideEntry;
}

// ============================================================================
// 工具类型
// ============================================================================

/**
 * 可选属性类型转换
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 必需属性类型转换
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * 组件属性省略特定字段
 */
export type ComponentPropsWithoutRef<T extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>> = 
  React.ComponentPropsWithoutRef<T>;

// ============================================================================
// ✅ FIXED - 移除冗余的重复导出声明 (TS2484)
// 所有类型已在上方定义处使用 export interface/type 导出
// ============================================================================