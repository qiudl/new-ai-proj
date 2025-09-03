import { TaskService, ListTasksParams, PaginatedTaskResponse } from './task-service.js';
import { DocumentService } from './document-service.js';
import { WorkNoteService } from './work-note-service.js';
import { TimerService } from './timer-service.js';
import { ProjectService } from './project-service.js';
import { MCPPermissionManager } from './permission-manager.js';
import { 
  Task, 
  Project, 
  CreateTaskOptions, 
  SubTaskData, 
  UpdateTaskData, 
  TimerData, 
  WorkNote, 
  WorkNoteOptions, 
  ApiResponse,
  SearchOptions,
  BatchOptions
} from './types.js';

/**
 * 统一的MCP任务服务器类
 * 整合了任务管理、文档管理、工作笔记、计时器和项目管理功能
 */
export class TaskMCPServer {
  private taskService: TaskService;
  private documentService: DocumentService;
  private workNoteService: WorkNoteService;
  private timerService: TimerService;
  private projectService: ProjectService;

  constructor(apiBase: string = 'http://localhost:8080/api/v1') {
    // 初始化各个服务
    this.taskService = new TaskService(apiBase);
    this.documentService = new DocumentService(apiBase);
    this.workNoteService = new WorkNoteService(apiBase);
    this.timerService = new TimerService(apiBase);
    this.projectService = new ProjectService(apiBase);
  }

  // ===========================================
  // 任务管理相关方法
  // ===========================================

  async findTaskById(id: number): Promise<Task> {
    return this.taskService.findTaskById(id);
  }

  async createTask(title: string, projectId: number = 1, options: CreateTaskOptions = {}): Promise<ApiResponse<Task>> {
    return this.taskService.createTask(title, projectId, options);
  }

  async startTask(id: number): Promise<ApiResponse> {
    return this.taskService.startTask(id);
  }

  async completeTask(id: number): Promise<ApiResponse> {
    return this.taskService.completeTask(id);
  }

  async pauseTask(id: number): Promise<ApiResponse> {
    return this.taskService.pauseTask(id);
  }

  async updateTaskTitle(id: number, newTitle: string): Promise<ApiResponse> {
    return this.taskService.updateTaskTitle(id, newTitle);
  }

  async updateTaskDescription(id: number, newDescription: string): Promise<ApiResponse> {
    return this.taskService.updateTaskDescription(id, newDescription);
  }

  async listTasks(params?: ListTasksParams): Promise<ApiResponse<PaginatedTaskResponse>> {
    return this.taskService.listTasks(params);
  }

  async createSubTask(parentId: number, taskData: SubTaskData | string): Promise<ApiResponse> {
    return this.taskService.createSubTask(parentId, taskData);
  }

  async createSiblingTask(siblingId: number, title: string, options: {
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    status?: Task['status'];
  } = {}): Promise<ApiResponse> {
    return this.taskService.createSiblingTask(siblingId, title, options);
  }

  async findTaskByName(titlePattern: string): Promise<ApiResponse<{ tasks: Task[] }>> {
    return this.taskService.findTaskByName(titlePattern);
  }

  async findTask(params: { id?: number; titlePattern?: string }): Promise<ApiResponse<{ tasks: Task[] }>> {
    return this.taskService.findTask(params);
  }

  async deleteTask(id: number, force: boolean = false): Promise<ApiResponse> {
    return this.taskService.deleteTask(id, force);
  }

  async updateTask(id: number, updates: UpdateTaskData): Promise<ApiResponse<Task>> {
    return this.taskService.updateTask(id, updates);
  }

  async moveTask(id: number, targetProjectId: number): Promise<ApiResponse> {
    return this.taskService.moveTask(id, targetProjectId);
  }

  async getTaskChildren(parentId: number): Promise<ApiResponse<{ children: Task[] }>> {
    return this.taskService.getTaskChildren(parentId);
  }

  async getDetailedTaskInfo(taskId: number): Promise<ApiResponse<any>> {
    return this.taskService.getDetailedTaskInfo(taskId);
  }

  async getTaskTimeline(taskId: number, projectId: number = 1, limit: number = 20, offset: number = 0): Promise<ApiResponse> {
    return this.taskService.getTaskTimeline(taskId, projectId, limit, offset);
  }

  // ===========================================
  // 文档管理相关方法
  // ===========================================

  async createOrUpdateTaskDocument(taskId: number, content: string, projectId: number = 1): Promise<ApiResponse> {
    return this.documentService.createOrUpdateTaskDocument(taskId, content, projectId);
  }

  async createAndAttachTaskDocument(taskId: number, content: string, projectId: number = 1, title?: string): Promise<ApiResponse> {
    return this.documentService.createAndAttachTaskDocument(taskId, content, projectId, title);
  }

  async createAndAttachWorkNote(taskId: number, content: string, title?: string): Promise<ApiResponse> {
    return this.documentService.createAndAttachWorkNote(taskId, content, title);
  }

  async getTaskDocument(taskId: number, projectId: number = 1): Promise<ApiResponse> {
    return this.documentService.getTaskDocument(taskId, projectId);
  }

  async hasTaskDocument(taskId: number, projectId: number = 1): Promise<ApiResponse> {
    return this.documentService.hasTaskDocument(taskId, projectId);
  }

  async deleteTaskDocument(taskId: number, projectId: number = 1): Promise<ApiResponse> {
    return this.documentService.deleteTaskDocument(taskId, projectId);
  }

  async createBatchDocuments(documents: Array<any>): Promise<ApiResponse> {
    return this.documentService.createBatchDocuments(documents);
  }

  async generateDocumentFromTemplate(templateType: string, context: any, autoCreate: boolean = false): Promise<ApiResponse> {
    return this.documentService.generateDocumentFromTemplate(templateType, context, autoCreate);
  }

  async autoFillTaskContext(taskIds: number[], templateType: string, includeSubtasks: boolean = true, includeDocuments: boolean = true, includeTimeLogs: boolean = true, dateRange?: any): Promise<ApiResponse> {
    return this.documentService.autoFillTaskContext(taskIds, templateType, includeSubtasks, includeDocuments, includeTimeLogs, dateRange);
  }

  async createTaskDocs(options: { task_ids?: number[]; date_filter?: string; template_type?: string; auto_attach?: boolean; skip_existing?: boolean; project_id?: number; batch_size?: number }): Promise<ApiResponse> {
    return this.documentService.createTaskDocs(options);
  }

  // ===========================================
  // 工作笔记相关方法
  // ===========================================

  async createWorkNote(title: string, content: string, options: WorkNoteOptions = {}): Promise<ApiResponse> {
    return this.workNoteService.createWorkNote(title, content, options);
  }

  async listWorkNotes(options: {
    limit?: number;
    page?: number;
    status?: WorkNote['status'];
    type?: WorkNote['type'];
  } = {}): Promise<ApiResponse> {
    return this.workNoteService.listWorkNotes(options);
  }

  async searchWorkNotes(query: string, options: {
    limit?: number;
    tags?: string[];
  } = {}): Promise<ApiResponse> {
    return this.workNoteService.searchWorkNotes(query, options);
  }

  async getWorkNote(id: number): Promise<ApiResponse> {
    return this.workNoteService.getWorkNote(id);
  }

  async updateWorkNote(id: number, updates: {
    title?: string;
    content?: string;
    status?: WorkNote['status'];
    type?: WorkNote['type'];
    visibility?: WorkNote['visibility'];
    tags?: string[];
  }): Promise<ApiResponse> {
    return this.workNoteService.updateWorkNote(id, updates);
  }

  async deleteWorkNote(id: number): Promise<ApiResponse> {
    return this.workNoteService.deleteWorkNote(id);
  }

  // ===========================================
  // 计时器相关方法
  // ===========================================

  async startTimer(taskId: number, description?: string): Promise<ApiResponse<TimerData>> {
    return this.timerService.startTimer(taskId, description);
  }

  async stopTimer(taskId?: number): Promise<ApiResponse<TimerData>> {
    return this.timerService.stopTimer(taskId);
  }

  async getCurrentTimer(): Promise<ApiResponse<{ active_timers: TimerData[] }>> {
    return this.timerService.getCurrentTimer();
  }

  async getDailyWorkReport(projectId: number = 1): Promise<ApiResponse> {
    return this.timerService.getDailyWorkReport(projectId);
  }

  // ===========================================
  // 项目管理相关方法
  // ===========================================

  async listProjects(): Promise<ApiResponse<{ projects: Project[] }>> {
    return this.projectService.listProjects();
  }

  async createProject(name: string, description?: string): Promise<ApiResponse<Project>> {
    return this.projectService.createProject(name, description);
  }

  async getProject(projectId: number): Promise<ApiResponse<Project>> {
    return this.projectService.getProject(projectId);
  }

  async updateProject(projectId: number, updates: {
    name?: string;
    description?: string;
    status?: Project['status'];
  }): Promise<ApiResponse<Project>> {
    return this.projectService.updateProject(projectId, updates);
  }

  async deleteProject(projectId: number, force: boolean = false): Promise<ApiResponse> {
    return this.projectService.deleteProject(projectId, force);
  }

  // ===========================================
  // 开发环境相关方法
  // ===========================================

  async devQuickLogin(username?: string): Promise<ApiResponse<{ token?: string }>> {
    try {
      // 直接使用BaseClient的统一登录方法
      const result = await this.taskService.devQuickLogin(username || 'admin');
      
      if (result.success && (result as any).token) {
        // 更新所有服务的认证令牌
        const token = (result as any).token;
        this.setAuthToken(token);
        console.error('[AUTH] Dev quick login: token set in all services via unified context');

        return {
          success: true,
          data: { token: token },
          token: token,
          username: (result.data as any)?.context?.username || username || 'admin',
          message: '开发环境快速登录成功，已通过统一上下文更新 Authorization 令牌'
        };
      } else {
        return result as ApiResponse<{ token?: string }>;
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
  public setAuthToken(token: string): void {
    this.taskService.setAuthToken(token);
    this.documentService.setAuthToken(token);
    this.workNoteService.setAuthToken(token);
    this.timerService.setAuthToken(token);
    this.projectService.setAuthToken(token);
  }

  // 设置API基础URL（同步到所有服务）
  public setApiBase(apiBase: string): void {
    this.taskService.setApiBase(apiBase);
    this.documentService.setApiBase(apiBase);
    this.workNoteService.setApiBase(apiBase);
    this.timerService.setApiBase(apiBase);
    this.projectService.setApiBase(apiBase);
  }

  // 获取权限管理器（从任务服务）
  public getPermissionManager(): MCPPermissionManager {
    return this.taskService.getPermissionManager();
  }

  // 获取各个服务实例（用于高级操作）
  public getTaskService(): TaskService {
    return this.taskService;
  }

  public getDocumentService(): DocumentService {
    return this.documentService;
  }

  public getWorkNoteService(): WorkNoteService {
    return this.workNoteService;
  }

  public getTimerService(): TimerService {
    return this.timerService;
  }

  public getProjectService(): ProjectService {
    return this.projectService;
  }

  // 批量操作：启动任务并开始计时
  async startTaskWithTimer(taskId: number, timerDescription?: string): Promise<ApiResponse> {
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
  async completeTaskAndStopTimer(taskId: number): Promise<ApiResponse> {
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
  async switchToTask(newTaskTitle: string, projectId: number = 1): Promise<ApiResponse> {
    try {
      // 1) 列出当前进行中的任务
      const inProgress = await this.listTasks({ status: ['in_progress'], projectId });
      if (inProgress.success && inProgress.data?.tasks?.length) {
        for (const t of inProgress.data.tasks) {
          try {
            await this.completeTask(t.id);
          } catch {}
        }
      }

      // 2) 查找目标任务
      const found = await this.findTaskByName(newTaskTitle);
      let targetId: number | null = null;
      if ((found as any).success && (found as any).data?.tasks?.length) {
        targetId = (found as any).data.tasks[0].id;
      } else if ((found as any).success && (found as any).tasks?.length) {
        targetId = (found as any).tasks[0].id;
      }

      // 3) 不存在则创建
      if (!targetId) {
        const created = await this.createTask(newTaskTitle, projectId);
        if (!created.success || !created.data?.id) {
          return created;
        }
        targetId = created.data.id;
      }

      // 4) 启动目标任务
      const started = await this.startTask(targetId);
      return started;
    } catch (error: any) {
      return {
        success: false,
        error: `切换任务失败: ${error.message || error}`
      };
    }
  }

  // 健康检查
  async healthCheck(): Promise<ApiResponse> {
    try {
      // 检查各个服务是否正常
      const results = {
        task_service: false,
        document_service: false,
        work_note_service: false,
        timer_service: false,
        project_service: false
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