import { TaskService } from './task-service.js';
import { DocumentService } from './document-service.js';
import { WorkNoteService } from './work-note-service.js';
import { TimerService } from './timer-service.js';
import { ProjectService } from './project-service.js';
import { DailyFocusService } from './daily-focus-service.js';

/**
 * 统一的MCP任务服务器类
 * 整合了任务管理、文档管理、工作笔记、计时器、项目管理和Daily Focus Tasks功能
 */
export class TaskMCPServer {
    private taskService: TaskService;
    private documentService: DocumentService;
    private workNoteService: WorkNoteService;
    private timerService: TimerService;
    private projectService: ProjectService;
    private dailyFocusService: DailyFocusService;

    constructor(apiBase: string = 'http://localhost:8080/api/v1') {
        // 初始化各个服务
        this.taskService = new TaskService(apiBase);
        this.documentService = new DocumentService(apiBase);
        this.workNoteService = new WorkNoteService(apiBase);
        this.timerService = new TimerService(apiBase);
        this.projectService = new ProjectService(apiBase);
        this.dailyFocusService = new DailyFocusService(apiBase);
    }

    // ===========================================
    // 任务管理相关方法
    // ===========================================
    async findTaskById(id: number) {
        return this.taskService.findTaskById(id);
    }

    async createTask(title: string, projectId: number = 1, options: any = {}) {
        return this.taskService.createTask(title, projectId, options);
    }

    async startTask(id: number) {
        return this.taskService.startTask(id);
    }

    async completeTask(id: number) {
        return this.taskService.completeTask(id);
    }

    async pauseTask(id: number) {
        return this.taskService.pauseTask(id);
    }

    async updateTaskTitle(id: number, newTitle: string) {
        return this.taskService.updateTaskTitle(id, newTitle);
    }

    async updateTaskDescription(id: number, newDescription: string) {
        return this.taskService.updateTaskDescription(id, newDescription);
    }

    async listTasks(params: any) {
        return this.taskService.listTasks(params);
    }

    async createSubTask(parentId: number, taskData: any) {
        return this.taskService.createSubTask(parentId, taskData);
    }

    async createSiblingTask(siblingId: number, title: string, options: any = {}) {
        return this.taskService.createSiblingTask(siblingId, title, options);
    }

    async findTaskByName(titlePattern: string) {
        return this.taskService.findTaskByName(titlePattern);
    }

    async findTask(params: any) {
        return this.taskService.findTask(params);
    }

    async deleteTask(id: number, force: boolean = false) {
        return this.taskService.deleteTask(id, force);
    }

    async updateTask(id: number, updates: any) {
        return this.taskService.updateTask(id, updates);
    }

    async moveTask(id: number, targetProjectId: number) {
        return this.taskService.moveTask(id, targetProjectId);
    }

    async getTaskChildren(parentId: number) {
        return this.taskService.getTaskChildren(parentId);
    }

    async getDetailedTaskInfo(taskId: number) {
        return this.taskService.getDetailedTaskInfo(taskId);
    }

    async getTaskTimeline(taskId: number, projectId: number = 1, limit: number = 20, offset: number = 0) {
        return this.taskService.getTaskTimeline(taskId, projectId, limit, offset);
    }

    // ===========================================
    // 文档管理相关方法
    // ===========================================
    async createOrUpdateTaskDocument(taskId: number, content: string, projectId: number = 1) {
        return this.documentService.createOrUpdateTaskDocument(taskId, content, projectId);
    }

    async createAndAttachTaskDocument(taskId: number, content: string, projectId: number = 1, title?: string) {
        return this.documentService.createAndAttachTaskDocument(taskId, content, projectId, title);
    }

    async createAndAttachWorkNote(taskId: number, content: string, title?: string) {
        return this.documentService.createAndAttachWorkNote(taskId, content, title);
    }

    async getTaskDocument(taskId: number) {
        return this.documentService.getTaskDocument(taskId);
    }

    async hasTaskDocument(taskId: number) {
        return this.documentService.hasTaskDocument(taskId);
    }

    async deleteTaskDocument(taskId: number) {
        return this.documentService.deleteTaskDocument(taskId);
    }

    /**
     * 更新任务文档（完全更新）
     * @param taskId 任务ID
     * @param updates 更新内容（如content, title等）
     */
    async updateTaskDocument(taskId: number, updates: any) {
        return this.documentService.updateTaskDocument(taskId, updates);
    }

    /**
     * 部分更新任务文档
     * @param taskId 任务ID
     * @param updates 部分更新内容
     */
    async patchTaskDocument(taskId: number, updates: any) {
        return this.documentService.patchTaskDocument(taskId, updates);
    }

    async createBatchDocuments(documents: any[]) {
        return this.documentService.createBatchDocuments(documents);
    }

    async generateDocumentFromTemplate(templateType: string, context: any, autoCreate: boolean = false) {
        return this.documentService.generateDocumentFromTemplate(templateType, context, autoCreate);
    }

    async autoFillTaskContext(taskIds: number[], templateType: string, includeSubtasks: boolean = true, includeDocuments: boolean = true, includeTimeLogs: boolean = true, dateRange?: any) {
        return this.documentService.autoFillTaskContext(taskIds, templateType, includeSubtasks, includeDocuments, includeTimeLogs, dateRange);
    }

    async createTaskDocs(options: any) {
        return this.documentService.createTaskDocs(options);
    }

    // ===========================================
    // 工作笔记相关方法
    // ===========================================
    async createWorkNote(title: string, content: string, options: any = {}) {
        return this.workNoteService.createWorkNote(title, content, options);
    }

    async listWorkNotes(options: any = {}) {
        return this.workNoteService.listWorkNotes(options);
    }

    async searchWorkNotes(query: string, options: any = {}) {
        return this.workNoteService.searchWorkNotes(query, options);
    }

    async getWorkNote(id: number) {
        return this.workNoteService.getWorkNote(id);
    }

    async updateWorkNote(id: number, updates: any) {
        return this.workNoteService.updateWorkNote(id, updates);
    }

    async deleteWorkNote(id: number) {
        return this.workNoteService.deleteWorkNote(id);
    }

    // ===========================================
    // Daily Focus Tasks相关方法
    // ===========================================
    async getDailyFocusTasks(params: any = {}) {
        return this.dailyFocusService.getDailyFocusTasks(params);
    }

    async addDailyFocusTask(params: any) {
        return this.dailyFocusService.addDailyFocusTask(params);
    }

    async updateDailyFocusTask(id: number, updates: any) {
        return this.dailyFocusService.updateDailyFocusTask(id, updates);
    }

    async removeDailyFocusTask(id: number) {
        return this.dailyFocusService.removeDailyFocusTask(id);
    }

    async completeDailyFocusTask(id: number) {
        return this.dailyFocusService.completeDailyFocusTask(id);
    }

    async reorderDailyFocusTasks(reorderItems: Array<{ id: number; sort_order: number }>) {
        return this.dailyFocusService.reorderDailyFocusTasks(reorderItems);
    }

    async getDailyFocusStats(params: any = {}) {
        return this.dailyFocusService.getDailyFocusStats(params);
    }

    async getTaskRecommendations(params: any = {}) {
        return this.dailyFocusService.getTaskRecommendations(params);
    }

    async acceptTaskRecommendations(params: any) {
        return this.dailyFocusService.acceptTaskRecommendations(params);
    }

    async batchAddDailyFocusTasks(params: any) {
        return this.dailyFocusService.batchAddDailyFocusTasks(params);
    }

    async clearCompletedTasks(params: any = {}) {
        return this.dailyFocusService.clearCompletedTasks(params);
    }

    async carryOverTasks(params: any) {
        return this.dailyFocusService.carryOverTasks(params);
    }

    async getDailyFocusHistory(params: any) {
        return this.dailyFocusService.getDailyFocusHistory(params);
    }

    async quickAddCurrentTask(params: any = {}) {
        return this.dailyFocusService.quickAddCurrentTask(params);
    }

    async focusTaskWithTimer(params: any) {
        return this.dailyFocusService.focusTaskWithTimer(params);
    }

    // ===========================================
    // 计时器相关方法
    // ===========================================
    async startTimer(taskId: number, description?: string) {
        return this.timerService.startTimer(taskId, description);
    }

    async stopTimer(taskId?: number) {
        return this.timerService.stopTimer(taskId);
    }

    async getCurrentTimer() {
        return this.timerService.getCurrentTimer();
    }

    async getDailyWorkReport(projectId: number = 1) {
        return this.timerService.getDailyWorkReport(projectId);
    }

    // ===========================================
    // 项目管理相关方法
    // ===========================================
    async listProjects() {
        return this.projectService.listProjects();
    }

    async createProject(name: string, description?: string) {
        return this.projectService.createProject(name, description);
    }

    async getProject(projectId: number) {
        return this.projectService.getProject(projectId);
    }

    async updateProject(projectId: number, updates: any) {
        return this.projectService.updateProject(projectId, updates);
    }

    async deleteProject(projectId: number, force: boolean = false) {
        return this.projectService.deleteProject(projectId, force);
    }

    // ===========================================
    // 开发环境相关方法
    // ===========================================
    async devQuickLogin(username?: string) {
        try {
            // 直接使用BaseClient的统一登录方法
            const result = await this.taskService.devQuickLogin(username || 'admin');
            if (result.success && result.token) {
                // 更新所有服务的认证令牌
                const token = result.token;
                this.setAuthToken(token);
                console.error('[AUTH] Dev quick login: token set in all services via unified context');

                // 保留完整的响应数据（包括tokenState）
                return {
                    success: true,
                    data: result.data, // 保留完整的context和tokenState
                    token: token,
                    username: result.data?.context?.username || username || 'admin',
                    message: '开发环境快速登录成功，已通过统一上下文更新 Authorization 令牌'
                };
            } else {
                return result;
            }
        } catch (error: any) {
            return {
                success: false,
                error: `开发环境登录失败: ${error.message || error}`
            };
        }
    }

    // ===========================================
    // 便利方法和实用功能
    // ===========================================
    // 设置认证令牌（同步到所有服务）
    setAuthToken(token: string) {
        this.taskService.setAuthToken(token);
        this.documentService.setAuthToken(token);
        this.workNoteService.setAuthToken(token);
        this.timerService.setAuthToken(token);
        this.projectService.setAuthToken(token);
        this.dailyFocusService.setAuthToken(token);
    }

    // Token监控方法（委托给taskService）
    getTokenRefreshStats() {
        return this.taskService.getTokenRefreshStats();
    }

    checkTokenHealth() {
        return this.taskService.checkTokenHealth();
    }

    getRecentTokenEvents(limit: number = 10) {
        return this.taskService.getRecentTokenEvents(limit);
    }

    // 设置API基础URL（同步到所有服务）
    setApiBase(apiBase: string) {
        this.taskService.setApiBase(apiBase);
        this.documentService.setApiBase(apiBase);
        this.workNoteService.setApiBase(apiBase);
        this.timerService.setApiBase(apiBase);
        this.projectService.setApiBase(apiBase);
        this.dailyFocusService.setApiBase(apiBase);
    }

    // 获取权限管理器（从任务服务）
    getPermissionManager() {
        return this.taskService.getPermissionManager();
    }

    // 获取各个服务实例（用于高级操作）
    getTaskService() {
        return this.taskService;
    }

    getDocumentService() {
        return this.documentService;
    }

    getWorkNoteService() {
        return this.workNoteService;
    }

    getTimerService() {
        return this.timerService;
    }

    getProjectService() {
        return this.projectService;
    }

    getDailyFocusService() {
        return this.dailyFocusService;
    }

    // 新增：列出所有活跃计时器
    async getActiveTimers() {
        return this.timerService.getActiveTimers();
    }

    // 批量操作：启动任务并开始计时
    async startTaskWithTimer(taskId: number, timerDescription?: string) {
        try {
            // 1. 启动任务
            const startResult = await this.startTask(taskId);
            if (!startResult.success) {
                return startResult;
            }

            // 2. 开始计时
            const timerResult = await this.startTimer(taskId, timerDescription);
            if (!timerResult.success) {
                return timerResult;
            }

            return {
                success: true,
                task_id: taskId,
                task_result: startResult,
                timer_result: timerResult,
                message: `🚀 任务 ${taskId} 已启动并开始计时`
            };
        } catch (error: any) {
            return {
                success: false,
                error: `启动任务和计时失败: ${error.message || error}`
            };
        }
    }

    // 批量操作：完成任务并停止计时
    async completeTaskAndStopTimer(taskId: number) {
        try {
            // 1. 停止计时
            const timerResult = await this.stopTimer(taskId);

            // 2. 完成任务
            const completeResult = await this.completeTask(taskId);
            if (!completeResult.success) {
                return completeResult;
            }

            return {
                success: true,
                task_id: taskId,
                complete_result: completeResult,
                timer_result: timerResult,
                message: `🎉 任务 ${taskId} 已完成并停止计时`
            };
        } catch (error: any) {
            return {
                success: false,
                error: `完成任务和停止计时失败: ${error.message || error}`
            };
        }
    }

    // 智能切换任务：完成当前进行中的任务，切换到新任务（不存在则创建）
    /**
     * 智能任务匹配评分
     * @param task 任务对象
     * @param searchTitle 搜索标题
     * @param dailyFocusTaskIds Daily Focus任务ID集合
     * @returns 评分 (0-100)
     */
    private calculateTaskScore(task: any, searchTitle: string, dailyFocusTaskIds: Set<number>): number {
        let score = 0;
        const title = (task.title || '').toLowerCase();
        const search = searchTitle.toLowerCase();

        // 1. 标题匹配度 (0-40分)
        if (title === search) {
            score += 40; // 完全匹配
        } else if (title.includes(search)) {
            score += 30; // 包含关键词
        } else {
            // 模糊匹配：计算相似度
            const similarity = this.calculateStringSimilarity(title, search);
            score += Math.floor(similarity * 25); // 最多25分
        }

        // 2. 任务状态 (0-25分)
        const statusScores: Record<string, number> = {
            'todo': 25,
            'in_progress': 20,
            'planning': 15,
            'draft': 10,
            'on_hold': 5,
            'blocked': 3,
            'suspended': 2,
            'completed': 0,
            'cancelled': 0,
            'archived': 0
        };
        score += statusScores[task.status] || 0;

        // 3. 优先级 (0-15分)
        const priorityScores: Record<string, number> = {
            'high': 15,
            'medium': 10,
            'low': 5
        };
        score += priorityScores[task.priority] || 5;

        // 4. 最近更新 (0-10分) - 最近7天内更新的加分
        if (task.updated_at) {
            try {
                const updatedTime = new Date(task.updated_at).getTime();
                const now = Date.now();
                const daysDiff = (now - updatedTime) / (1000 * 60 * 60 * 24);
                if (daysDiff <= 1) score += 10;      // 1天内
                else if (daysDiff <= 3) score += 7;   // 3天内
                else if (daysDiff <= 7) score += 4;   // 7天内
                else if (daysDiff <= 30) score += 2;  // 30天内
            } catch { }
        }

        // 5. Daily Focus任务 (0-10分)
        if (dailyFocusTaskIds.has(task.id)) {
            score += 10;
        }

        return score;
    }

    /**
     * 计算字符串相似度 (简单的编辑距离算法)
     */
    private calculateStringSimilarity(str1: string, str2: string): number {
        const len1 = str1.length;
        const len2 = str2.length;

        if (len1 === 0) return len2 === 0 ? 1 : 0;
        if (len2 === 0) return 0;

        const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,      // 删除
                    matrix[i][j - 1] + 1,      // 插入
                    matrix[i - 1][j - 1] + cost // 替换
                );
            }
        }

        const maxLen = Math.max(len1, len2);
        return 1 - matrix[len1][len2] / maxLen;
    }

    /**
     * 智能切换任务（多维度匹配）
     */
    async switchToTask(newTaskTitle: string, projectId: number = 1) {
        try {
            // 1) 完成当前进行中的任务
            const inProgress = await this.listTasks({ status: ['in_progress'], projectId });
            if (inProgress.success && inProgress.data?.tasks?.length) {
                for (const t of inProgress.data.tasks) {
                    try {
                        await this.completeTask(t.id);
                    } catch { }
                }
            }

            // 2) 获取Daily Focus任务列表（用于加分）
            let dailyFocusTaskIds = new Set<number>();
            try {
                const dailyFocus = await this.dailyFocusService.getDailyFocusTasks({});
                if (dailyFocus.success && dailyFocus.data?.focus_tasks) {
                    dailyFocusTaskIds = new Set(
                        dailyFocus.data.focus_tasks
                            .filter((ft: any) => ft.status === 'active')
                            .map((ft: any) => ft.task_id)
                    );
                }
            } catch { }

            // 3) 查找目标任务（模糊搜索）
            const found = await this.findTaskByName(newTaskTitle);
            let candidates: any[] = [];
            if (found.success && found.data?.tasks?.length) {
                candidates = found.data.tasks;
            } else if (found.success && (found as any).tasks?.length) {
                candidates = (found as any).tasks;
            }

            // 4) 智能评分排序
            let targetTask = null;
            if (candidates.length > 0) {
                const scoredTasks = candidates.map(task => ({
                    task,
                    score: this.calculateTaskScore(task, newTaskTitle, dailyFocusTaskIds)
                }));

                // 按分数降序排序
                scoredTasks.sort((a, b) => b.score - a.score);

                // 选择得分最高的任务
                targetTask = scoredTasks[0].task;

                console.error(`[智能匹配] 找到 ${candidates.length} 个候选任务，评分结果：`);
                scoredTasks.slice(0, 5).forEach((st, idx) => {
                    console.error(`  ${idx + 1}. [${st.score}分] ${st.task.title} (状态:${st.task.status}, 优先级:${st.task.priority})`);
                });
                console.error(`[智能匹配] 选择最佳匹配：${targetTask.title} (${scoredTasks[0].score}分)`);
            }

            // 5) 不存在则创建新任务
            if (!targetTask) {
                console.error(`[智能匹配] 未找到匹配任务，创建新任务: ${newTaskTitle}`);
                const created = await this.createTask(newTaskTitle, projectId);
                if (!created.success || !created.data?.id) {
                    return created;
                }
                targetTask = { id: created.data.id, title: newTaskTitle };
            }

            // 6) 启动目标任务
            const started = await this.startTask(targetTask.id);

            // 增强返回信息
            if (started.success) {
                return {
                    ...started,
                    matched_task: {
                        id: targetTask.id,
                        title: targetTask.title,
                        status: targetTask.status,
                        priority: targetTask.priority
                    },
                    match_type: candidates.length > 0 ? 'intelligent_match' : 'created_new',
                    candidates_count: candidates.length
                };
            }
            return started;
        } catch (error: any) {
            return {
                success: false,
                error: `切换任务失败: ${error.message || error}`
            };
        }
    }

    // 健康检查
    async healthCheck() {
        try {
            // 检查各个服务是否正常
            const results = {
                task_service: false,
                document_service: false,
                work_note_service: false,
                timer_service: false,
                project_service: false,
                daily_focus_service: false
            };

            // 简单的健康检查：尝试获取项目列表
            try {
                const projectsResult = await this.listProjects();
                results.project_service = projectsResult.success;
            } catch (e) {
                results.project_service = false;
            }

            // 检查其他服务...
            const allHealthy = Object.values(results).every(Boolean);

            return {
                success: allHealthy,
                health_status: results,
                all_services_healthy: allHealthy,
                message: allHealthy ? '✅ 所有服务运行正常' : '⚠️ 部分服务存在问题'
            };
        } catch (error: any) {
            return {
                success: false,
                error: `健康检查失败: ${error.message || error}`
            };
        }
    }
}

// 导出默认实例
export default TaskMCPServer;