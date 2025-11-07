/**
 * 组件迁移映射表
 * 用于自动化工具和开发者参考
 * 
 * @deprecated 这些组件将在下个版本中移除，请迁移到新的统一组件
 */

// 废弃警告
if (process.env.NODE_ENV === 'development') {
  console.warn(`
    📦 组件迁移提醒：
    部分文档组件已废弃，建议迁移到新的统一组件：
    
    TaskDocumentEditor → UnifiedTaskDocumentArea
    DocumentViewer → DocumentAreaAdapter  
    MarkdownEditor → UnifiedTaskDocumentArea
    
    查看迁移指南: /components/_archived_v2_document_components/ARCHIVE_MANIFEST.md
  `);
}

export const ComponentMigrationMap = {
  // 废弃的组件 -> 新组件
  'TaskDocumentEditor': 'UnifiedTaskDocumentArea',
  'DocumentViewer': 'DocumentAreaAdapter',
  'MarkdownEditor': 'UnifiedTaskDocumentArea', 
  'TaskDocumentManager': 'UnifiedTaskDocumentArea',
  'FullscreenDocumentModal': 'EnhancedDocumentModal',
  
  // 服务迁移
  'taskDocumentService': 'unifiedDocumentService',
  'documentService': 'unifiedDocumentService'
};

// 向后兼容的重新导出（带警告）
// ✅ FIXED - UnifiedTaskDocumentArea is a default export, not a named export (TS2724)
import UnifiedTaskDocumentArea from './UnifiedTaskDocumentArea';
// ✅ FIXED - Comment out non-existent DocumentAreaAdapter import (TS2307)
// import { DocumentAreaAdapter } from './enhanced/DocumentAreaAdapter';

/**
 * @deprecated 请使用 UnifiedTaskDocumentArea
 * 这个导出将在下个版本中移除
 */
export const TaskDocumentEditor = UnifiedTaskDocumentArea;

/**
 * @deprecated 请使用 DocumentAreaAdapter
 * 这个导出将在下个版本中移除
 * ✅ FIXED - Comment out non-existent DocumentAreaAdapter reference (TS2304)
 */
// export const DocumentViewer = DocumentAreaAdapter;

/**
 * @deprecated 请使用 UnifiedTaskDocumentArea with compactMode
 * 这个导出将在下个版本中移除
 */
export const MarkdownEditor = UnifiedTaskDocumentArea;

// 迁移指南
export const MIGRATION_GUIDE = {
  'TaskDocumentEditor': {
    replacement: 'UnifiedTaskDocumentArea',
    config: { defaultViewMode: 'edit', showToolbar: true },
    example: `
      // 旧代码
      <TaskDocumentEditor taskId={1} projectId={1} />
      
      // 新代码
      <UnifiedTaskDocumentArea 
        taskId={1} 
        projectId={1} 
        defaultViewMode="edit"
        showToolbar={true}
      />
    `
  },
  
  'DocumentViewer': {
    replacement: 'DocumentAreaAdapter',
    config: { mode: 'modal', readonly: true },
    example: `
      // 旧代码
      <DocumentViewer visible={true} documentId={1} />
      
      // 新代码
      <DocumentAreaAdapter
        projectId={1}
        taskId={1}
        mode="modal"
        currentDocumentId="1"
        readonly={true}
      />
    `
  },
  
  'MarkdownEditor': {
    replacement: 'UnifiedTaskDocumentArea',
    config: { defaultViewMode: 'edit', compactMode: true },
    example: `
      // 旧代码
      <MarkdownEditor value={content} onChange={handleChange} />
      
      // 新代码
      <UnifiedTaskDocumentArea 
        defaultViewMode="edit"
        compactMode={true}
        onDocumentChange={handleChange}
      />
    `
  }
};

export default ComponentMigrationMap;