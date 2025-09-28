/**
 * 重构后的核心组件导出
 * 
 * 这些组件经过以下优化：
 * 1. 性能优化 - 使用 memo, useMemo, useCallback
 * 2. 状态管理 - 更好的状态结构和管理
 * 3. 错误处理 - 增强的错误处理和用户反馈
 * 4. 类型安全 - 改进的 TypeScript 类型定义
 * 5. 用户体验 - 更好的交互和视觉反馈
 * 6. 可维护性 - 更清晰的代码结构和文档
 */

// 任务信息相关组件
export { default as TaskInfoEditor } from './TaskInfoEditor.refactored';

// 文档管理相关组件  
export { default as TaskDocumentWidget } from './TaskDocumentWidget.refactored';
export { default as EnhancedDocumentInterface } from './EnhancedDocumentInterface';

// 组件类型导出
export type { default as TaskInfoEditorProps } from './TaskInfoEditor.refactored';
export type { default as TaskDocumentWidgetProps } from './TaskDocumentWidget.refactored';
export type { default as EnhancedDocumentInterfaceProps } from './EnhancedDocumentInterface';

/**
 * 使用指南：
 * 
 * 1. TaskInfoEditor - 任务描述编辑器
 *    - 支持 Markdown 编辑
 *    - 自动保存提示
 *    - 快捷键支持
 *    - 只读模式
 * 
 * 2. TaskDocumentWidget - 任务文档组件
 *    - 文档列表展示
 *    - 文件上传功能
 *    - 批量操作支持
 *    - 权限控制
 * 
 * 3. EnhancedDocumentInterface - 增强文档界面
 *    - 统一文档管理
 *    - 高级筛选搜索
 *    - 批量操作
 *    - 实时统计
 * 
 * 迁移说明：
 * - 这些组件可以逐步替换现有组件
 * - 保持向后兼容的 API 接口
 * - 新功能通过可选属性提供
 */