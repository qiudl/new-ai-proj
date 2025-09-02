import { BaseClient } from './base-client.js';
import { requiresPermission } from './permission-manager.js';
import { Task, CreateTaskOptions, SubTaskData, UpdateTaskData, ApiResponse } from './types.js';

// 列出任务的查询参数
export interface ListTasksParams {
  projectId?: number;
  page?: number;
  limit?: number;
  status?: string[];
  priority?: string[];
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// 分页响应格式
export interface PaginatedTaskResponse {
  tasks: Task[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class TaskService extends BaseClient {
  
  // 通过ID查找任务
  async findTaskById(id: number): Promise<Task> {
    try {
      // 1) 优先使用全局任务列表端点带精确过滤，避免分页导致的遗漏
      //    支持查询参数 task_id，且可显式限制 page_size=1 以提升效率
      try {
        const response = await this.makeRequest<{ data: Task[] }>('GET', '/tasks', undefined, {
          task_id: id,
          page: 1,
          page_size: 1
        });
        
        if (response.success && response.data?.data && Array.isArray(response.data.data)) {
          const list: Task[] = response.data.data;
          if (list.length > 0) {
            return list[0];
          }
        }
      } catch (e: any) {
        // 记录但不直接失败，进入回退逻辑
        console.error(`[WARNING] 通过 /tasks?task_id= 查询任务失败，尝试回退查找: ${e?.message || e}`);
      }

      // 2) 回退方案：遍历项目，但带 task_id 过滤并使用较大 page_size，避免遗漏
      //    先尝试项目 1（常见默认项目），再遍历其它项目
      const tryFetchFromProject = async (projectId: number): Promise<Task | null> => {
        try {
          const response = await this.makeRequest<{ data: Task[] }>('GET', `/projects/${projectId}/tasks`, undefined, {
            task_id: id,
            page: 1,
            page_size: 1000
          });
          
          if (response.success && response.data?.data && Array.isArray(response.data.data)) {
            const arr: Task[] = response.data.data;
            if (arr.length > 0) {
              return arr[0];
            }
          }
          return null;
        } catch (err: any) {
          console.error(`[WARNING] 获取项目 ${projectId} 的任务失败: ${err?.message || err}`);
          return null;
        }
      };

      const fromProject1 = await tryFetchFromProject(1);
      if (fromProject1) return fromProject1;

      // 获取项目列表并遍历（排除项目1）
      try {
        const projectsResponse = await this.makeRequest<{ data: any[] }>('GET', '/projects');
        if (projectsResponse.success && projectsResponse.data?.data) {
          const projects = projectsResponse.data.data;
          for (const project of projects) {
            if (!project || typeof project.id !== 'number' || project.id === 1) continue;
            const found = await tryFetchFromProject(project.id);
            if (found) return found;
          }
        }
      } catch (pe: any) {
        console.error(`[WARNING] 获取项目列表失败: ${pe?.message || pe}`);
      }

      throw new Error(`任务 ID ${id} 不存在`);
    } catch (error: any) {
      throw new Error(`查找任务失败: ${error?.message || String(error)}`);
    }
  }

  // 创建任务
  // @requiresPermission('create_task')
  async createTask(title: string, projectId: number = 1, options: CreateTaskOptions = {}): Promise<ApiResponse<Task>> {
    try {
      console.error(`[DEBUG] 创建任务: ${title}, 项目ID: ${projectId}${options.parent_id ? `, 父任务ID: ${options.parent_id}` : ''}`);
      
      // 构建任务数据，支持parent_id等选项
      const taskData: any = {
        title,
        project_id: projectId,
        status: options.status || 'todo', // 默认状态改为'todo'（待开始）
        description: options.description || `通过Claude Code创建：${title}`,
        custom_fields: {
          priority: options.priority || 'low', // 设置默认优先级为'低'
          ...options.custom_fields
        }
      };
      
      // 如果有parent_id，添加到请求中
      if (options.parent_id) {
        taskData.parent_id = options.parent_id;
      }
      
      // 添加预估工时
      if (options.estimated_hours) {
        taskData.custom_fields.estimated_hours = options.estimated_hours;
      }
      
      // 添加标签
      if (options.tags && options.tags.length > 0) {
        taskData.custom_fields.tags = options.tags;
      }
      
      const response = await this.makeRequest<Task>('POST', `/projects/${projectId}/tasks`, taskData);

      if (response.success) {
        return {
          success: true,
          data: response.data,
          message: `✅ 任务 "${title}" 创建成功${options.parent_id ? ` (子任务，父任务ID: ${options.parent_id})` : ''}`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `创建任务失败: ${error.message || error}`
      };
    }
  }

  // 开始任务
  // @requiresPermission('update_task')
  async startTask(id: number): Promise<ApiResponse> {
    try {
      // 查找任务确定项目ID
      const task = await this.findTaskById(id);
      if (!task) {
        return { success: false, error: `任务 ${id} 不存在` };
      }

      const response = await this.makeRequest('PUT', `/projects/${task.project_id}/tasks/${id}`, {
        status: 'in_progress'
      });

      if (response.success) {
        return {
          success: true,
          id: id,
          title: task.title,
          status: 'in_progress',
          message: `🚀 任务 "${task.title}" 已开始执行`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `启动任务失败: ${error.message || error}`
      };
    }
  }

  // 完成任务
  // @requiresPermission('update_task')
  async completeTask(id: number): Promise<ApiResponse> {
    try {
      // 查找任务确定项目ID
      const task = await this.findTaskById(id);
      if (!task) {
        return { success: false, error: `任务 ${id} 不存在` };
      }

      const response = await this.makeRequest('PUT', `/projects/${task.project_id}/tasks/${id}`, {
        status: 'completed'
      });

      if (response.success) {
        return {
          success: true,
          id: id,
          title: task.title,
          status: 'completed',
          message: `🎉 任务 "${task.title}" 已完成`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `完成任务失败: ${error.message || error}`
      };
    }
  }

  // 暂停任务
  // @requiresPermission('update_task')
  async pauseTask(id: number): Promise<ApiResponse> {
    try {
      // 查找任务确定项目ID
      const task = await this.findTaskById(id);
      if (!task) {
        return { success: false, error: `任务 ${id} 不存在` };
      }

      const response = await this.makeRequest('PUT', `/projects/${task.project_id}/tasks/${id}`, {
        status: 'on_hold'
      });

      if (response.success) {
        return {
          success: true,
          id: id,
          title: task.title,
          status: 'on_hold',
          message: `⏸️ 任务 "${task.title}" 已暂停`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `暂停任务失败: ${error.message || error}`
      };
    }
  }

  // 更新任务标题
  // @requiresPermission('update_task')
  async updateTaskTitle(id: number, newTitle: string): Promise<ApiResponse> {
    if (!newTitle.trim()) {
      return { success: false, error: '任务标题不能为空' };
    }
    
    try {
      const task = await this.findTaskById(id);
      if (!task) {
        return { success: false, error: `任务 ${id} 不存在` };
      }

      const response = await this.makeRequest('PUT', `/projects/${task.project_id}/tasks/${id}`, {
        title: newTitle.trim()
      });

      if (response.success) {
        return {
          success: true,
          id: id,
          old_title: task.title,
          new_title: newTitle.trim(),
          message: `📝 任务标题已更新: "${task.title}" -> "${newTitle.trim()}"`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `更新任务标题失败: ${error.message || error}`
      };
    }
  }

  // 更新任务描述
  // @requiresPermission('update_task')
  async updateTaskDescription(id: number, newDescription: string): Promise<ApiResponse> {
    try {
      const task = await this.findTaskById(id);
      if (!task) {
        return { success: false, error: `任务 ${id} 不存在` };
      }

      const response = await this.makeRequest('PUT', `/projects/${task.project_id}/tasks/${id}`, {
        description: newDescription
      });

      if (response.success) {
        return {
          success: true,
          id: id,
          title: task.title,
          new_description: newDescription,
          message: `📄 任务 "${task.title}" 的描述已更新`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `更新任务描述失败: ${error.message || error}`
      };
    }
  }

  // 列出任务
  async listTasks(params?: ListTasksParams): Promise<ApiResponse<PaginatedTaskResponse>> {
    try {
      // 设置默认参数
      const page = params?.page || 1;
      const limit = Math.min(params?.limit || 20, 100); // 限制最大100
      const sort_by = params?.sort_by || 'updated_at';
      const sort_order = params?.sort_order || 'desc';
      
      let url = '/tasks';
      let queryParams: any = {
        page: page,
        page_size: limit,
        sort_by: sort_by,
        sort_order: sort_order
      };

      // 项目ID过滤
      if (params?.projectId) {
        url = `/projects/${params.projectId}/tasks`;
      }

      // 状态过滤
      if (params?.status && params.status.length > 0) {
        queryParams.status = params.status.join(',');
      }

      // 优先级过滤
      if (params?.priority && params.priority.length > 0) {
        queryParams.priority = params.priority.join(',');
      }

      // 搜索关键词
      if (params?.search) {
        queryParams.search = params.search;
      }

      const response = await this.makeRequest<{ 
        data: Task[]; 
        total?: number; 
        pagination?: any;
        count?: number;
      }>(
        'GET', 
        url, 
        undefined, 
        queryParams
      );

      if (response.success && response.data) {
        const tasks = response.data.data || [];
        const total = response.data.total || response.data.count || response.data.pagination?.total || tasks.length;
        
        // 计算分页信息
        const totalPages = Math.ceil(total / limit);
        const pagination = {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        };

        const result: PaginatedTaskResponse = {
          tasks,
          total,
          pagination
        };
        
        return {
          success: true,
          data: result,
          total: total,
          message: `📋 获取到 ${tasks.length}/${total} 个任务 (第${page}/${totalPages}页)${params?.projectId ? ` - 项目${params.projectId}` : ''}${params?.status ? ` - 状态: ${params.status.join(',')}` : ''}${params?.search ? ` - 搜索: "${params.search}"` : ''}`
        };
      } else {
        return {
          success: false,
          error: response.error || '获取任务列表失败',
          data: { tasks: [], total: 0, pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }
        } as ApiResponse<PaginatedTaskResponse>;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取任务列表失败: ${error.message || error}`,
        data: { tasks: [], total: 0, pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }
      };
    }
  }

  // 创建子任务
  // @requiresPermission('create_task')
  async createSubTask(parentId: number, taskData: SubTaskData | string): Promise<ApiResponse> {
    try {
      // 1. 验证父任务存在
      const parentTask = await this.findTaskById(parentId);
      if (!parentTask) {
        return { success: false, error: `父任务 ID ${parentId} 不存在` };
      }

      // 2. 构造子任务数据
      let subTaskData: SubTaskData;
      if (typeof taskData === 'string') {
        subTaskData = {
          title: taskData,
          priority: 'low',
          status: 'todo'
        };
      } else {
        subTaskData = { ...taskData };
      }

      // 3. 调用创建任务接口，传递parent_id
      const result = await this.createTask(subTaskData.title, parentTask.project_id, {
        ...subTaskData,
        parent_id: parentId
      });

      if (result.success) {
        return {
          success: true,
          parent_id: parentId,
          parent_title: parentTask.title,
          subtask: result.data,
          message: `✅ 成功为任务 "${parentTask.title}" 创建子任务 "${subTaskData.title}"`
        };
      } else {
        return result;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `创建子任务失败: ${error.message || error}`
      };
    }
  }

  // 创建兄弟任务
  // @requiresPermission('create_task')
  async createSiblingTask(
    siblingId: number,
    title: string,
    options: {
      description?: string;
      priority?: 'low' | 'medium' | 'high';
      status?: Task['status'];
    } = {}
  ): Promise<ApiResponse> {
    try {
      // 1. 获取兄弟任务信息
      const siblingTask = await this.findTaskById(siblingId);
      if (!siblingTask) {
        return { success: false, error: `兄弟任务 ID ${siblingId} 不存在` };
      }

      // 2. 创建新任务，使用相同的项目ID和父任务ID
      const result = await this.createTask(title, siblingTask.project_id, {
        description: options.description,
        priority: options.priority || siblingTask.custom_fields?.priority || 'medium',
        status: options.status || 'todo',
        parent_id: siblingTask.parent_id || siblingTask.parent_task_id
      });

      if (result.success) {
        return {
          success: true,
          sibling_id: siblingId,
          sibling_title: siblingTask.title,
          new_task: result.data,
          message: `✅ 成功创建兄弟任务 "${title}"，与任务 "${siblingTask.title}" 同级`
        };
      } else {
        return result;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `创建兄弟任务失败: ${error.message || error}`
      };
    }
  }

  // 按名称查找任务
  async findTaskByName(titlePattern: string): Promise<ApiResponse<{ tasks: Task[] }>> {
    if (!titlePattern.trim()) {
      return { success: false, error: '搜索关键词不能为空' };
    }

    try {
      const response = await this.makeRequest<{ data: Task[]; total: number }>(
        'GET',
        '/tasks',
        undefined,
        { title_pattern: titlePattern.trim(), page: 1, page_size: 100 }
      );

      if (response.success && response.data) {
        const tasks = response.data.data || [];
        return {
          success: true,
          data: { tasks },
          total: tasks.length,
          query: titlePattern.trim(),
          message: `🔍 通过名称找到 ${tasks.length} 个匹配任务`
        };
      } else {
        return {
          success: false,
          error: response.error || '按名称查找任务失败'
        } as ApiResponse<{ tasks: Task[] }>;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `按名称查找任务失败: ${error.message || error}`
      };
    }
  }

  // 通用查找任务方法
  async findTask(params: { id?: number; titlePattern?: string }): Promise<ApiResponse<{ tasks: Task[] }>> {
    if (!params.id && !params.titlePattern) {
      return { success: false, error: '必须提供任务ID或标题搜索关键词' };
    }

    try {
      if (params.id) {
        // 按ID精确查找
        const task = await this.findTaskById(params.id);
        return {
          success: true,
          data: { tasks: [task] },
          total: 1,
          message: `🔍 通过ID找到 1 个任务`
        };
      } else if (params.titlePattern) {
        // 按标题模糊查找
        return await this.findTaskByName(params.titlePattern);
      } else {
        return { success: false, error: '未提供有效的查找参数' };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `查找任务失败: ${error.message || error}`
      };
    }
  }

  // 删除任务
  // @requiresPermission('delete_task')
  async deleteTask(id: number, force: boolean = false): Promise<ApiResponse> {
    try {
      // 1. 验证任务存在
      const task = await this.findTaskById(id);
      if (!task) {
        return { success: false, error: `任务 ${id} 不存在` };
      }

      // 2. 执行删除
      const response = await this.makeRequest('DELETE', `/projects/${task.project_id}/tasks/${id}`, {
        force: force
      });

      if (response.success) {
        return {
          success: true,
          deleted_id: id,
          deleted_title: task.title,
          force_delete: force,
          message: `🗑️ 任务 "${task.title}" 已删除${force ? '（强制删除）' : ''}`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `删除任务失败: ${error.message || error}`
      };
    }
  }

  // 更新任务
  // @requiresPermission('update_task')
  async updateTask(id: number, updates: UpdateTaskData): Promise<ApiResponse<Task>> {
    try {
      // 1. 验证任务存在
      const task = await this.findTaskById(id);
      if (!task) {
        return { success: false, error: `任务 ${id} 不存在` };
      }

      // 2. 执行更新
      const response = await this.makeRequest<Task>('PUT', `/projects/${task.project_id}/tasks/${id}`, updates);

      if (response.success) {
        return {
          success: true,
          data: response.data,
          updated_fields: Object.keys(updates),
          message: `📝 任务 "${task.title}" 更新成功`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `更新任务失败: ${error.message || error}`
      };
    }
  }

  // 移动任务到其他项目
  // @requiresPermission('update_task')
  async moveTask(id: number, targetProjectId: number): Promise<ApiResponse> {
    try {
      // 1. 验证任务存在
      const task = await this.findTaskById(id);
      if (!task) {
        return { success: false, error: `任务 ${id} 不存在` };
      }

      // 2. 执行移动
      const response = await this.makeRequest('PUT', `/projects/${task.project_id}/tasks/${id}`, {
        project_id: targetProjectId
      });

      if (response.success) {
        return {
          success: true,
          task_id: id,
          task_title: task.title,
          from_project_id: task.project_id,
          to_project_id: targetProjectId,
          message: `📦 任务 "${task.title}" 已移动到项目 ${targetProjectId}`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `移动任务失败: ${error.message || error}`
      };
    }
  }

  // 获取任务子任务
  async getTaskChildren(parentId: number): Promise<ApiResponse<{ children: Task[] }>> {
    try {
      const response = await this.makeRequest<{ children: Task[] }>('GET', `/tasks/${parentId}/children`);

      if (response.success) {
        const children = response.data?.children || [];
        return {
          success: true,
          data: { children },
          parent_id: parentId,
          children_count: children.length,
          message: `👨‍👩‍👧‍👦 获取到 ${children.length} 个子任务`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取子任务失败: ${error.message || error}`
      };
    }
  }

  // 获取任务详细信息
  async getDetailedTaskInfo(taskId: number): Promise<ApiResponse<any>> {
    try {
      const response = await this.makeRequest('GET', `/tasks/${taskId}/details`);

      if (response.success) {
        return {
          success: true,
          data: response.data,
          message: `📋 任务详情已获取 - #${taskId} ${response.data?.title || ''}`
        };
      } else {
        return response;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `获取任务详情失败: ${error.message || error}`
      };
    }
  }

  // 获取任务时间线
  async getTaskTimeline(
    taskId: number,
    projectId: number = 1,
    limit: number = 20,
    offset: number = 0
  ): Promise<ApiResponse> {
    try {
      const response = await this.makeRequest(
        'GET',
        `/projects/${projectId}/tasks/${taskId}/timeline`,
        undefined,
        { limit: limit.toString(), offset: offset.toString() }
      );

      // 处理响应数据
      if (response.success && response.data) {
        const data = response.data;
        return {
          success: true,
          task_id: data.task_id,
          task_title: data.task_title,
          events: data.events,
          pagination: data.pagination,
          total_events: data.pagination?.total || 0,
          message: `📅 成功获取任务 "${data.task_title}" 的时间线 (${data.events?.length || 0} 个事件)`
        };
      } else {
        return {
          success: false,
          error: '获取时间线数据失败：响应格式异常'
        };
      }
    } catch (error: any) {
      const errorMessage = error?.message || '未知错误';
      
      // 提供更友好的错误信息
      if (error?.response?.status === 404) {
        return {
          success: false,
          error: `任务不存在或无权访问 (任务ID: ${taskId})`
        };
      } else if (error?.response?.status === 401) {
        return {
          success: false,
          error: '认证失败，请检查API令牌'
        };
      } else {
        return {
          success: false,
          error: `获取任务时间线失败: ${errorMessage}`
        };
      }
    }
  }
}