import { BaseClient } from './base-client.js';
/**
 * Daily Focus Tasks Service
 * 管理今日主要任务的MCP服务
 */
export class DailyFocusService extends BaseClient {
    constructor(apiBase = 'http://localhost:8080/api/v1') {
        super(apiBase);
    }
    // ===========================================
    // 核心任务管理接口
    // ===========================================
    /**
     * 获取今日主要任务列表
     */
    async getDailyFocusTasks(params = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (params.date)
                queryParams.append('date', params.date);
            if (params.status)
                queryParams.append('status', params.status);
            if (params.priority)
                queryParams.append('priority', params.priority);
            if (params.include_suggestions !== undefined) {
                queryParams.append('include_suggestions', params.include_suggestions.toString());
            }
            const url = `/daily-focus-tasks${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const result = await this.makeRequest('GET', url);
            return {
                success: true,
                data: {
                    tasks: result.data?.tasks || [],
                    stats: result.data?.stats || {
                        total_count: 0,
                        completed_count: 0,
                        pending_count: 0,
                        completion_rate: 0,
                        priority_distribution: { critical: 0, high: 0, medium: 0, low: 0 }
                    },
                    suggestions: result.data?.suggestions || []
                },
                message: result.message || '获取今日主要任务成功'
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    /**
     * 添加任务到今日主要任务
     */
    async addDailyFocusTask(params) {
        try {
            const requestData = {
                task_id: params.task_id,
                priority: params.priority || 'medium',
                notes: params.notes,
                estimated_duration_minutes: params.estimated_duration_minutes,
                focus_date: params.focus_date
            };
            const result = await this.makeRequest('POST', '/daily-focus-tasks', requestData);
            return {
                success: true,
                data: result.data,
                message: result.message || '添加今日主要任务成功'
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    /**
     * 更新今日主要任务信息
     */
    async updateDailyFocusTask(id, updates) {
        try {
            const result = await this.makeRequest('PUT', `/daily-focus-tasks/${id}`, updates);
            return {
                success: true,
                data: result.data,
                message: result.message || '更新今日主要任务成功'
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    /**
     * 从今日主要任务中移除
     */
    async removeDailyFocusTask(id) {
        try {
            const result = await this.makeRequest('DELETE', `/daily-focus-tasks/${id}`);
            return {
                success: true,
                message: result.message || '移除今日主要任务成功'
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    // ===========================================
    // 状态管理接口
    // ===========================================
    /**
     * 标记任务完成
     */
    async completeDailyFocusTask(id) {
        try {
            const result = await this.makeRequest('PATCH', `/daily-focus-tasks/${id}/complete`);
            return {
                success: true,
                data: result.data,
                message: result.message || '标记任务完成成功'
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    /**
     * 批量调整任务顺序
     */
    async reorderDailyFocusTasks(reorderItems) {
        try {
            const requestData = { reorder_items: reorderItems };
            const result = await this.makeRequest('PATCH', '/daily-focus-tasks/reorder', requestData);
            return {
                success: true,
                message: result.message || '重排序成功'
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    /**
     * 获取统计信息
     */
    async getDailyFocusStats(params = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (params.date)
                queryParams.append('date', params.date);
            if (params.period)
                queryParams.append('period', params.period);
            const url = `/daily-focus-tasks/stats${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const result = await this.makeRequest('GET', url);
            return {
                success: true,
                data: result.data,
                message: result.message || '获取统计信息成功'
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    // ===========================================
    // 智能推荐接口
    // ===========================================
    /**
     * 获取智能推荐
     */
    async getTaskRecommendations(params = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (params.limit)
                queryParams.append('limit', params.limit.toString());
            if (params.date)
                queryParams.append('date', params.date);
            if (params.exclude_existing !== undefined) {
                queryParams.append('exclude_existing', params.exclude_existing.toString());
            }
            const url = `/daily-focus-tasks/suggestions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const result = await this.makeRequest('GET', url);
            return {
                success: true,
                data: {
                    suggestions: result.data?.suggestions || []
                },
                message: result.message || '获取智能推荐成功'
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    /**
     * 批量采用推荐
     */
    async acceptTaskRecommendations(params) {
        try {
            const requestData = {
                task_ids: params.task_ids,
                focus_date: params.focus_date,
                default_priority: params.default_priority || 'medium'
            };
            const result = await this.makeRequest('POST', '/daily-focus-tasks/accept-suggestions', requestData);
            return {
                success: true,
                data: result.data,
                message: result.message || '批量采用推荐成功'
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    // ===========================================
    // 批量操作接口
    // ===========================================
    /**
     * 批量添加任务
     */
    async batchAddDailyFocusTasks(params) {
        try {
            const requestData = {
                task_ids: params.task_ids,
                priority: params.priority || 'medium',
                notes: params.notes,
                focus_date: params.focus_date
            };
            const result = await this.makeRequest('POST', '/daily-focus-tasks/batch', requestData);
            return {
                success: true,
                data: result.data,
                message: result.message || '批量添加任务成功'
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    /**
     * 清理已完成任务
     */
    async clearCompletedTasks(params = {}) {
        try {
            // 先获取已完成任务列表
            const focusTasksResult = await this.getDailyFocusTasks({
                date: params.date,
                status: 'completed'
            });
            if (!focusTasksResult.success || !focusTasksResult.data?.tasks?.length) {
                return {
                    success: true,
                    data: { cleared_count: 0 },
                    message: '没有已完成的任务需要清理'
                };
            }
            if (!params.confirm) {
                return {
                    success: false,
                    error: '请确认清理操作（设置 confirm: true）'
                };
            }
            // 批量删除已完成任务
            const completedTasks = focusTasksResult.data.tasks;
            const deletePromises = completedTasks.map(task => this.removeDailyFocusTask(task.id));
            const deleteResults = await Promise.allSettled(deletePromises);
            const successCount = deleteResults.filter(result => result.status === 'fulfilled' && result.value.success).length;
            return {
                success: true,
                data: {
                    cleared_count: successCount,
                    total_completed: completedTasks.length
                },
                message: `成功清理 ${successCount} 个已完成任务`
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    // ===========================================
    // 高级功能接口
    // ===========================================
    /**
     * 延续未完成任务
     */
    async carryOverTasks(params) {
        try {
            const requestData = {
                from_date: params.from_date,
                to_date: params.to_date,
                task_ids: params.task_ids,
                update_priority: params.update_priority || false
            };
            const result = await this.makeRequest('POST', '/daily-focus-tasks/carry-over', requestData);
            return {
                success: true,
                data: result.data,
                message: result.message || '任务延续成功'
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    /**
     * 获取历史记录
     */
    async getDailyFocusHistory(params) {
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('start_date', params.start_date);
            queryParams.append('end_date', params.end_date);
            if (params.limit)
                queryParams.append('limit', params.limit.toString());
            if (params.include_stats !== undefined) {
                queryParams.append('include_stats', params.include_stats.toString());
            }
            const url = `/daily-focus-tasks/history?${queryParams.toString()}`;
            const result = await this.makeRequest('GET', url);
            return {
                success: true,
                data: result.data,
                message: result.message || '获取历史记录成功'
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    // ===========================================
    // 快捷操作接口
    // ===========================================
    /**
     * 快速添加当前正在进行的任务
     */
    async quickAddCurrentTask(params = {}) {
        try {
            // 首先获取当前正在进行的任务
            const response = await this.makeRequest('GET', '/tasks', {
                status: ['in_progress'],
                limit: 1
            });
            if (!response.success || !response.data?.tasks?.length) {
                return {
                    success: false,
                    error: '没有找到正在进行的任务'
                };
            }
            const currentTask = response.data.tasks[0];
            // 添加到今日主要任务
            return await this.addDailyFocusTask({
                task_id: currentTask.id,
                priority: params.priority || 'high',
                notes: params.notes
            });
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    /**
     * 聚焦任务并开始计时
     */
    async focusTaskWithTimer(params) {
        try {
            // 首先获取今日主要任务详情
            const focusTasksResult = await this.getDailyFocusTasks();
            if (!focusTasksResult.success) {
                return focusTasksResult;
            }
            const focusTask = focusTasksResult.data.tasks.find(task => task.id === params.daily_focus_task_id);
            if (!focusTask) {
                return {
                    success: false,
                    error: '找不到指定的今日主要任务'
                };
            }
            // 开始任务计时（假设有计时API）
            const timerResult = await this.makeRequest('POST', '/timers/start', {
                task_id: focusTask.task_id,
                description: params.timer_description || `聚焦任务: ${focusTask.task_title}`
            });
            return {
                success: true,
                data: {
                    focus_task: focusTask,
                    timer_result: timerResult.data
                },
                message: `开始聚焦任务: ${focusTask.task_title}`
            };
        }
        catch (error) {
            return this.handleError(error);
        }
    }
    // ===========================================
    // 实用工具方法
    // ===========================================
    /**
     * 验证今日主要任务请求参数
     */
    validateDailyFocusTaskRequest(params) {
        const errors = [];
        if (!params.task_id || typeof params.task_id !== 'number' || params.task_id <= 0) {
            errors.push('任务ID无效');
        }
        if (params.priority && !['critical', 'high', 'medium', 'low'].includes(params.priority)) {
            errors.push('优先级无效');
        }
        if (params.notes && typeof params.notes === 'string' && params.notes.length > 500) {
            errors.push('备注不能超过500字符');
        }
        if (params.estimated_duration_minutes &&
            (typeof params.estimated_duration_minutes !== 'number' || params.estimated_duration_minutes < 0)) {
            errors.push('预估时间必须为非负数');
        }
        return errors;
    }
    /**
     * 格式化今日主要任务数据
     */
    formatDailyFocusTask(task) {
        return {
            id: task.id,
            task_id: task.task_id,
            task_title: task.task_title,
            priority: task.priority,
            notes: task.notes,
            sort_order: task.sort_order,
            completed_at: task.completed_at,
            estimated_duration_minutes: task.estimated_duration_minutes,
            focus_date: task.focus_date,
            project_id: task.project_id,
            created_at: task.created_at,
            updated_at: task.updated_at
        };
    }
}
export default DailyFocusService;
