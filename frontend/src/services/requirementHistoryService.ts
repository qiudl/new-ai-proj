/**
 * 需求历史记录服务
 * Requirement History Service
 */

import api from './api';

/**
 * 需求历史记录项
 */
export interface RequirementHistoryItem {
  id: number;
  requirement_id: number;
  user_id: number;
  username?: string;
  user_avatar?: string;
  user_type?: string;
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  comment?: string;
  created_at: string;
  action_display: string; // 人类可读的操作描述
}

/**
 * 需求历史列表响应
 */
export interface RequirementHistoryListResponse {
  data: RequirementHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * 需求历史统计
 */
export interface RequirementHistoryStats {
  total_actions: number;
  by_action: Record<string, number>;
  todays_actions: number;
  this_weeks_actions: number;
  most_active_users: Array<{
    user_id: number;
    username: string;
    action_count: number;
  }>;
  recent_status_changes: number;
  average_actions_per_requirement: number;
}

/**
 * 获取需求历史记录列表的参数
 */
export interface GetRequirementHistoryParams {
  page?: number;
  page_size?: number;
  action?: string[];
  user_id?: number;
  created_after?: string;
  created_before?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * 获取需求历史记录
 * @param requirementId 需求ID
 * @param params 查询参数
 */
export const getRequirementHistory = async (
  requirementId: number,
  params?: GetRequirementHistoryParams
): Promise<RequirementHistoryListResponse> => {
  const response = await api.get(`/requirements/${requirementId}/history`, {
    params,
  });

  // 兼容不同的响应格式
  if (response.data?.data) {
    return response.data.data;
  }

  // 如果直接是数据格式，包装成标准格式
  if (response.data && Array.isArray(response.data)) {
    return {
      data: response.data,
      total: response.data.length,
      page: params?.page || 1,
      page_size: params?.page_size || 100,
    };
  }

  // 默认返回空数据
  return {
    data: [],
    total: 0,
    page: params?.page || 1,
    page_size: params?.page_size || 100,
  };
};

/**
 * 获取需求历史统计
 * @param requirementId 需求ID
 */
export const getRequirementHistoryStats = async (
  requirementId: number
): Promise<RequirementHistoryStats> => {
  const response = await api.get(`/requirements/${requirementId}/history/stats`);

  // 兼容不同的响应格式
  if (response.data?.data) {
    return response.data.data;
  }

  // 如果直接是统计数据，返回
  if (response.data && typeof response.data === 'object') {
    return response.data;
  }

  // 默认返回空统计
  return {
    total_actions: 0,
    by_action: {},
    todays_actions: 0,
    this_weeks_actions: 0,
    most_active_users: [],
    recent_status_changes: 0,
    average_actions_per_requirement: 0,
  };
};

/**
 * 需求历史动作类型常量
 */
export const RequirementHistoryActions = {
  CREATED: 'created',
  UPDATED: 'updated',
  STATUS_CHANGED: 'status_changed',
  REVIEWED: 'reviewed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CONVERTED: 'converted',
  COMMENTED: 'commented',
  ASSIGNED: 'assigned',
  PRIORITY_CHANGED: 'priority_changed',
  DUE_DATE_CHANGED: 'due_date_changed',
  ARCHIVED: 'archived',
  RESTORED: 'restored',
  DELETED: 'deleted',
  TASK_LINKED: 'task_linked',
} as const;

/**
 * 获取操作类型的标签
 */
export const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    created: '创建',
    updated: '更新',
    status_changed: '状态变更',
    reviewed: '评审',
    approved: '批准',
    rejected: '拒绝',
    converted: '转为任务',
    commented: '评论',
    assigned: '分配',
    priority_changed: '优先级变更',
    due_date_changed: '截止日期变更',
    archived: '归档',
    restored: '恢复',
    deleted: '删除',
    task_linked: '关联任务',
  };
  return labels[action] || action;
};

/**
 * 获取操作类型的图标
 */
export const getActionIcon = (action: string): string => {
  const icons: Record<string, string> = {
    created: 'file-add',
    updated: 'edit',
    status_changed: 'sync',
    reviewed: 'eye',
    approved: 'check-circle',
    rejected: 'close-circle',
    converted: 'swap',
    commented: 'message',
    assigned: 'user',
    priority_changed: 'flag',
    due_date_changed: 'calendar',
    archived: 'inbox',
    restored: 'redo',
    deleted: 'delete',
    task_linked: 'link',
  };
  return icons[action] || 'file';
};

/**
 * 获取操作类型的颜色
 */
export const getActionColor = (action: string): string => {
  const colors: Record<string, string> = {
    created: '#52c41a',
    updated: '#1890ff',
    status_changed: '#722ed1',
    reviewed: '#13c2c2',
    approved: '#52c41a',
    rejected: '#f5222d',
    converted: '#fa8c16',
    commented: '#2f54eb',
    assigned: '#1890ff',
    priority_changed: '#faad14',
    due_date_changed: '#722ed1',
    archived: '#8c8c8c',
    restored: '#13c2c2',
    deleted: '#f5222d',
    task_linked: '#1890ff',
  };
  return colors[action] || '#595959';
};
