// MCP任务状态映射配置
// 用于将MCP的扩展状态映射到后端实际支持的状态
export const TASK_STATUS_MAPPING = {
    // MCP状态 -> 后端实际状态
    'draft': 'todo', // 草稿 -> 待办
    'planning': 'todo', // 规划中 -> 待办
    'todo': 'todo', // 待办 -> 待办
    'pending': 'todo', // 待处理 -> 待办
    'in_progress': 'in_progress', // 进行中 -> 进行中
    'testing': 'in_progress', // 测试中 -> 进行中  
    'completed': 'completed', // 已完成 -> 已完成
    'done': 'completed', // 完成 -> 已完成
    'cancelled': 'cancelled', // 已取消 -> 已取消
    'on_hold': 'todo', // 暂停 -> 待办
    'suspended': 'todo', // 挂起 -> 待办
    'blocked': 'todo', // 阻塞 -> 待办
    'archived': 'completed' // 已归档 -> 已完成
};
// 反向映射：后端状态 -> 可用的MCP状态列表
export const BACKEND_STATUS_OPTIONS = {
    'todo': ['draft', 'planning', 'todo', 'pending', 'on_hold', 'suspended', 'blocked'],
    'in_progress': ['in_progress', 'testing'],
    'completed': ['completed', 'done', 'archived'],
    'cancelled': ['cancelled']
};
// 状态验证和映射函数
export function mapMCPStatusToBackend(mcpStatus) {
    const normalized = mcpStatus.toLowerCase().trim();
    return TASK_STATUS_MAPPING[normalized] || 'todo';
}
// 检查状态是否有效
export function isValidMCPStatus(status) {
    return status.toLowerCase().trim() in TASK_STATUS_MAPPING;
}
// 获取后端状态的所有MCP状态选项
export function getMCPStatusOptions(backendStatus) {
    return BACKEND_STATUS_OPTIONS[backendStatus] || ['todo'];
}
// 状态优先级（用于排序）
export const STATUS_PRIORITY = {
    'draft': 0,
    'planning': 1,
    'todo': 2,
    'pending': 2,
    'on_hold': 3,
    'suspended': 3,
    'blocked': 3,
    'in_progress': 4,
    'testing': 5,
    'completed': 6,
    'done': 6,
    'archived': 7,
    'cancelled': 8
};
// 获取状态的显示名称
export const STATUS_DISPLAY_NAMES = {
    'draft': '草稿',
    'planning': '规划中',
    'todo': '待办',
    'pending': '待处理',
    'in_progress': '进行中',
    'testing': '测试中',
    'completed': '已完成',
    'done': '完成',
    'cancelled': '已取消',
    'on_hold': '暂停',
    'suspended': '挂起',
    'blocked': '阻塞',
    'archived': '已归档'
};
// 状态颜色配置（用于UI显示）
export const STATUS_COLORS = {
    'draft': '#8c8c8c',
    'planning': '#722ed1',
    'todo': '#1890ff',
    'pending': '#1890ff',
    'in_progress': '#faad14',
    'testing': '#fa8c16',
    'completed': '#52c41a',
    'done': '#52c41a',
    'cancelled': '#f5222d',
    'on_hold': '#595959',
    'suspended': '#595959',
    'blocked': '#cf1322',
    'archived': '#8c8c8c'
};
