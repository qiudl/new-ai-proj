/**
 * Enhanced Components - 增强组件库
 * 
 * 这个模块包含了针对文档预览和代码展示的增强组件
 */

export { default as EnhancedCodeBlock } from './EnhancedCodeBlock';
export { default as EnhancedMarkdownRenderer } from './EnhancedMarkdownRenderer';
export { default as EnhancedFullscreenDocumentModal } from './EnhancedFullscreenDocumentModal';
export { default as EnhancedFullscreenDocumentPreview } from './EnhancedFullscreenDocumentPreview';
export { default as EnhancedDocumentContent } from './EnhancedDocumentContent';
// ✅ FIXED - Comment out non-existent DocumentAreaAdapter export (TS2307)
// export { default as DocumentAreaAdapter } from './DocumentAreaAdapter';
export { default as DocumentCommentSystem } from './DocumentCommentSystem';
export { default as DocumentSearchPanel } from './DocumentSearchPanel';
export { default as DocumentShareModal } from './DocumentShareModal';
// export { default as VirtualizedDocumentRenderer } from './VirtualizedDocumentRenderer';
export { default as PerformanceMonitor } from './PerformanceMonitor';

// 类型导出
export type { EnhancedCodeBlockProps } from './EnhancedCodeBlock';
export type { EnhancedMarkdownRendererProps } from './EnhancedMarkdownRenderer';
export type { EnhancedFullscreenDocumentModalProps, DocumentData } from './EnhancedFullscreenDocumentModal';
export type { EnhancedFullscreenDocumentPreviewProps } from './EnhancedFullscreenDocumentPreview';
export type { EnhancedDocumentContentProps } from './EnhancedDocumentContent';
// ✅ FIXED - Comment out non-existent DocumentAreaAdapter type exports (TS2307)
// export type { DocumentAreaAdapterProps, DocumentAreaAdapterRef } from './DocumentAreaAdapter';
export type { DocumentCommentSystemProps, Comment } from './DocumentCommentSystem';
export type { DocumentSearchPanelProps, SearchResult, SearchOptions } from './DocumentSearchPanel';
export type { DocumentShareModalProps, SharePermission, ShareRecipient, ShareLink } from './DocumentShareModal';
// export type { VirtualizedDocumentRendererProps } from './VirtualizedDocumentRenderer';
export type { PerformanceMonitorProps, PerformanceMetrics } from './PerformanceMonitor';