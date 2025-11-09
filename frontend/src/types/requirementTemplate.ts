/**
 * 需求模板类型定义
 * Requirement Template Types
 */

import { RequirementPriority } from './requirement';

/**
 * 模板类型
 */
export enum RequirementTemplateType {
  Feature = 'feature', // 功能需求
  BugFix = 'bug_fix', // 缺陷修复
  Performance = 'performance', // 性能优化
  Security = 'security', // 安全需求
  Documentation = 'documentation', // 文档需求
  Research = 'research', // 研究调研
  Refactoring = 'refactoring', // 重构需求
  Infrastructure = 'infrastructure', // 基础设施
  UserStory = 'user_story', // 用户故事
  Epic = 'epic', // 史诗需求
}

/**
 * 模板字段内容
 */
export interface RequirementTemplateFields {
  title?: string;
  description?: string;
  business_value?: string;
  expected_outcome?: string;
  acceptance_criteria?: string;
  priority?: RequirementPriority;
  category?: string;
}

/**
 * 需求模板定义
 */
export interface RequirementTemplate {
  id: string;
  type: RequirementTemplateType;
  name: string;
  description: string;
  icon: string; // Ant Design图标名称
  color: string; // 主题颜色
  fields: RequirementTemplateFields;
  tags?: string[];
  recommended_for?: string[]; // 推荐使用场景
}

/**
 * 模板分类
 */
export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  templates: RequirementTemplate[];
}
