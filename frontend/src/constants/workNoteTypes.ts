export const WORK_NOTE_TYPES = {
  general: { value: 'general', label: '通用笔记', icon: '📝', color: '#1890ff' },
  meeting: { value: 'meeting', label: '会议笔记', icon: '🤝', color: '#52c41a' },
  idea: { value: 'idea', label: '想法记录', icon: '💡', color: '#faad14' },
  log: { value: 'log', label: '工作日志', icon: '📋', color: '#722ed1' },
  reference: { value: 'reference', label: '参考资料', icon: '📚', color: '#13c2c2' },
  template: { value: 'template', label: '笔记模板', icon: '📄', color: '#eb2f96' },
} as const;

export const WORK_NOTE_PRIORITIES = {
  low: { value: 'low', label: '低优先级', color: '#bfbfbf' },
  medium: { value: 'medium', label: '中等优先级', color: '#1890ff' },
  high: { value: 'high', label: '高优先级', color: '#faad14' },
  urgent: { value: 'urgent', label: '紧急', color: '#ff4d4f' },
} as const;

export const getWorkNoteTypeConfig = (type: string) => {
  return WORK_NOTE_TYPES[type as keyof typeof WORK_NOTE_TYPES] || WORK_NOTE_TYPES.general;
};

export const getWorkNotePriorityConfig = (priority: string) => {
  return WORK_NOTE_PRIORITIES[priority as keyof typeof WORK_NOTE_PRIORITIES] || WORK_NOTE_PRIORITIES.medium;
};

// 类型导出
export type WorkNoteTypeKey = keyof typeof WORK_NOTE_TYPES;
export type WorkNotePriorityKey = keyof typeof WORK_NOTE_PRIORITIES;