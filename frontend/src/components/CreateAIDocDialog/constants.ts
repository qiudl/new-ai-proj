import { DocumentTemplate, DocumentTemplateType } from './types';

/**
 * 文档模板配置
 */
export const DOCUMENT_TEMPLATES: Record<DocumentTemplateType, DocumentTemplate> = {
  technical_design: {
    type: 'technical_design',
    name: '技术设计文档',
    description: '系统架构、技术选型、数据模型、API设计等',
    icon: '📐',
  },
  bug_report: {
    type: 'bug_report',
    name: 'Bug报告',
    description: '问题描述、复现步骤、预期结果、实际结果等',
    icon: '🐛',
  },
  feature_spec: {
    type: 'feature_spec',
    name: '功能规格说明',
    description: '功能需求、业务流程、交互设计、验收标准等',
    icon: '📋',
  },
  user_story: {
    type: 'user_story',
    name: '用户故事',
    description: '用户角色、需求场景、验收条件等',
    icon: '👤',
  },
  test_plan: {
    type: 'test_plan',
    name: '测试计划',
    description: '测试范围、测试用例、测试策略等',
    icon: '🧪',
  },
  api_documentation: {
    type: 'api_documentation',
    name: 'API文档',
    description: '接口定义、请求参数、响应格式、示例代码等',
    icon: '🔌',
  },
  project_plan: {
    type: 'project_plan',
    name: '项目计划',
    description: '项目目标、里程碑、时间表、资源分配等',
    icon: '📅',
  },
  meeting_notes: {
    type: 'meeting_notes',
    name: '会议纪要',
    description: '会议议程、讨论要点、决策事项、行动计划等',
    icon: '📝',
  },
};

/**
 * 步骤配置
 */
export const STEP_CONFIG = {
  1: {
    title: '选择AI模型',
    description: '选择AI模型和文档模板',
  },
  2: {
    title: '预览文档',
    description: 'AI正在生成文档，请稍候...',
  },
  3: {
    title: '编辑文档',
    description: '编辑和完善文档内容',
  },
};

/**
 * 对话框尺寸配置
 */
export const DIALOG_CONFIG = {
  width: 1000,
  minHeight: 600,
};

/**
 * API超时配置 (毫秒)
 */
export const API_TIMEOUT = {
  generate: 120000,  // AI生成超时: 2分钟
  save: 30000,       // 保存超时: 30秒
};
