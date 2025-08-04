import axios from 'axios';

interface Task {
  id: number;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  project_id?: number;
  description?: string;
  created_at?: string;
}

export class TaskMCPServer {
  private apiBase: string;
  private authToken: string;

  constructor(apiBase: string = 'http://localhost:8080/api/v1') {
    this.apiBase = apiBase;
    // 使用系统 JWT token
    this.authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`
    };
  }

  // 辅助方法：通过ID查找任务
  private async findTaskById(id: number): Promise<any> {
    try {
      // 首先尝试从项目1获取任务列表 (大部分任务都在项目1中)
      const response1 = await axios.get(`${this.apiBase}/projects/1/tasks`, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      const tasks1 = response1.data.data?.data || [];
      const task1 = tasks1.find((t: any) => t.id === id);
      
      if (task1) {
        return task1;
      }
      
      // 如果在项目1中没有找到，尝试在其他项目中查找
      const projectsResponse = await axios.get(`${this.apiBase}/projects`, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      const projects = projectsResponse.data.data?.data || [];
      
      for (const project of projects) {
        if (project.id === 1) continue; // 已经检查过项目1
        
        try {
          const tasksResponse = await axios.get(`${this.apiBase}/projects/${project.id}/tasks`, {
            headers: this.getHeaders(),
            proxy: false
          });
          
          const tasks = tasksResponse.data.data?.data || [];
          const task = tasks.find((t: any) => t.id === id);
          
          if (task) {
            return task;
          }
        } catch (projectError: any) {
          // 忽略单个项目的错误，继续查找其他项目
          console.error(`[WARNING] 无法获取项目 ${project.id} 的任务列表: ${projectError.message}`);
        }
      }
      
      throw new Error(`任务 ID ${id} 不存在`);
    } catch (error: any) {
      throw new Error(`查找任务失败: ${error.message}`);
    }
  }
  
  // 创建任务
  async createTask(title: string, projectId: number = 1): Promise<any> {
    try {
      console.error(`[DEBUG] 创建任务: ${title}, 项目ID: ${projectId}`);
      
      const response = await axios.post(`${this.apiBase}/projects/${projectId}/tasks`, {
        title,
        project_id: projectId,
        status: 'todo',  // 默认状态改为'todo'（待开始）
        description: `通过Claude Code创建：${title}`,
        custom_fields: {
          priority: 'low'  // 设置默认优先级为'低'
        }
      }, {
        headers: this.getHeaders(),
        timeout: 10000,
        proxy: false
      });

      const task = response.data.data;
      return {
        success: true,
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.custom_fields?.priority || 'low',
        message: `✅ 任务已创建 (ID: ${task.id}) - "${task.title}" [状态: ${task.status}, 优先级: ${task.custom_fields?.priority || 'low'}]`
      };
    } catch (error: any) {
      console.error(`[ERROR] 创建任务失败:`, error.response?.data || error.message);
      return {
        success: false,
        error: `创建任务失败: ${error.response?.data?.error || error.message}`
      };
    }
  }

  // 开始任务
  async startTask(id: number): Promise<any> {
    try {
      console.error(`[DEBUG] 开始任务: ID ${id}`);
      
      const task = await this.findTaskById(id);
      
      // 更新状态为进行中
      const updateResponse = await axios.put(`${this.apiBase}/projects/${task.project_id}/tasks/${id}`, {
        title: task.title,
        project_id: task.project_id,
        status: 'in_progress',
        description: task.description
      }, {
        headers: this.getHeaders(),
        proxy: false
      });

      return {
        success: true,
        id,
        title: task.title,
        status: 'in_progress',
        message: `🚀 任务 "${task.title}" 已开始执行`
      };
    } catch (error: any) {
      console.error(`[ERROR] 开始任务失败:`, error.message);
      return {
        success: false,
        error: `开始任务失败: ${error.message}`
      };
    }
  }
  
  // 完成任务
  async completeTask(id: number): Promise<any> {
    try {
      console.error(`[DEBUG] 完成任务: ID ${id}`);
      
      const task = await this.findTaskById(id);
      
      // 更新状态为已完成
      const updateResponse = await axios.put(`${this.apiBase}/projects/${task.project_id}/tasks/${id}`, {
        title: task.title,
        project_id: task.project_id,
        status: 'completed',
        description: task.description
      }, {
        headers: this.getHeaders(),
        proxy: false
      });

      return {
        success: true,
        id,
        title: task.title,
        status: 'completed',
        message: `✅ 任务 "${task.title}" 已完成`
      };
    } catch (error: any) {
      console.error(`[ERROR] 完成任务失败:`, error.message);
      return {
        success: false,
        error: `完成任务失败: ${error.message}`
      };
    }
  }

  // 更新任务标题
  async updateTaskTitle(id: number, newTitle: string): Promise<any> {
    try {
      console.error(`[DEBUG] 更新任务标题: ID ${id}, 新标题: ${newTitle}`);
      
      const task = await this.findTaskById(id);
      
      // 更新任务标题
      const updateResponse = await axios.put(`${this.apiBase}/projects/${task.project_id}/tasks/${id}`, {
        title: newTitle,
        project_id: task.project_id,
        status: task.status,
        description: task.description,
        parent_id: task.parent_id
      }, {
        headers: this.getHeaders(),
        proxy: false
      });

      return {
        success: true,
        id,
        title: newTitle,
        status: task.status,
        message: `✅ 任务标题已更新 "${newTitle}"`
      };
    } catch (error: any) {
      console.error(`[ERROR] 更新任务标题失败:`, error.message);
      return {
        success: false,
        error: `更新任务标题失败: ${error.message}`
      };
    }
  }

  // 更新任务描述
  async updateTaskDescription(id: number, newDescription: string): Promise<any> {
    try {
      console.error(`[DEBUG] 更新任务描述: ID ${id}`);
      
      const task = await this.findTaskById(id);
      
      // 更新任务描述
      const updateResponse = await axios.put(`${this.apiBase}/projects/${task.project_id}/tasks/${id}`, {
        title: task.title,
        project_id: task.project_id,
        status: task.status,
        description: newDescription,
        parent_id: task.parent_id
      }, {
        headers: this.getHeaders(),
        proxy: false
      });

      return {
        success: true,
        id,
        title: task.title,
        status: task.status,
        message: `✅ 任务描述已更新`
      };
    } catch (error: any) {
      console.error(`[ERROR] 更新任务描述失败:`, error.message);
      return {
        success: false,
        error: `更新任务描述失败: ${error.message}`
      };
    }
  }

  // 查看任务列表
  async listTasks(projectId: number = 1): Promise<any> {
    try {
      console.error(`[DEBUG] 获取任务列表, 项目ID: ${projectId}`);
      
      const response = await axios.get(`${this.apiBase}/projects/${projectId}/tasks`, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      const tasks = response.data.data?.data || [];
      
      return {
        success: true,
        total: tasks.length,
        tasks: tasks.map((task: any) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          created_at: task.created_at,
          project_id: task.project_id
        })),
        message: `📋 共找到 ${tasks.length} 个任务`
      };
    } catch (error: any) {
      console.error(`[ERROR] 获取任务列表失败:`, error.response?.data || error.message);
      return {
        success: false,
        error: `获取任务列表失败: ${error.response?.data?.error || error.message}`
      };
    }
  }
  
  // 创建子任务
  async createSubTask(parentId: number, title: string): Promise<any> {
    try {
      console.error(`[DEBUG] 创建子任务: ${title}, 父任务ID: ${parentId}`);
      
      const parentTask = await this.findTaskById(parentId);
      
      const response = await axios.post(`${this.apiBase}/projects/${parentTask.project_id}/tasks`, {
        title,
        project_id: parentTask.project_id,
        parent_id: parentId,
        status: 'todo',  // 默认状态改为'todo'（待开始）
        description: `通过Claude Code创建的子任务：${title}`,
        custom_fields: {
          priority: 'low'  // 设置默认优先级为'低'
        }
      }, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      const subtask = response.data.data;
      return {
        success: true,
        id: subtask.id,
        title: subtask.title,
        parent_id: parentId,
        status: subtask.status,
        priority: subtask.custom_fields?.priority || 'low',
        message: `✅ 子任务已创建 (ID: ${subtask.id}) - "${subtask.title}" [状态: ${subtask.status}, 优先级: ${subtask.custom_fields?.priority || 'low'}]`
      };
    } catch (error: any) {
      console.error(`[ERROR] 创建子任务失败:`, error.message);
      return {
        success: false,
        error: `创建子任务失败: ${error.message}`
      };
    }
  }

  // 根据名称搜索任务
  async findTaskByName(titlePattern: string): Promise<any> {
    try {
      const listResult = await this.listTasks();
      
      if (!listResult.success) {
        return listResult;
      }

      const matchingTasks = listResult.tasks.filter((task: any) => 
        task.title.toLowerCase().includes(titlePattern.toLowerCase())
      );

      return {
        success: true,
        total: matchingTasks.length,
        tasks: matchingTasks,
        message: `🔍 找到 ${matchingTasks.length} 个匹配"${titlePattern}"的任务`
      };
    } catch (error: any) {
      return {
        success: false,
        error: `搜索任务失败: ${error.message}`
      };
    }
  }

  // 删除任务
  async deleteTask(id: number, force: boolean = false): Promise<any> {
    try {
      console.error(`[DEBUG] 删除任务: ID ${id}, 强制删除: ${force}`);
      
      const task = await this.findTaskById(id);
      
      // 检查是否有子任务
      const childrenResponse = await axios.get(`${this.apiBase}/projects/${task.project_id}/tasks`, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      const allTasks = childrenResponse.data.data?.data || [];
      const childTasks = allTasks.filter((t: any) => t.parent_id === id);
      
      if (childTasks.length > 0 && !force) {
        return {
          success: false,
          error: `任务有 ${childTasks.length} 个子任务，请使用 force=true 强制删除或先删除子任务`,
          child_count: childTasks.length,
          children: childTasks.map((t: any) => ({ id: t.id, title: t.title }))
        };
      }

      const affectedSubtasks: number[] = [];
      
      // 如果强制删除，先删除所有子任务
      if (force && childTasks.length > 0) {
        console.error(`[DEBUG] 强制删除，先删除 ${childTasks.length} 个子任务`);
        
        for (const childTask of childTasks) {
          try {
            await axios.delete(`${this.apiBase}/projects/${task.project_id}/tasks/${childTask.id}`, {
              headers: this.getHeaders(),
              proxy: false
            });
            
            affectedSubtasks.push(childTask.id);
            console.error(`[DEBUG] 已删除子任务: ID ${childTask.id}`);
          } catch (childError: any) {
            console.error(`[WARNING] 删除子任务 ${childTask.id} 失败: ${childError.message}`);
          }
        }
      }

      // 删除主任务
      const deleteResponse = await axios.delete(`${this.apiBase}/projects/${task.project_id}/tasks/${id}`, {
        headers: this.getHeaders(),
        proxy: false
      });

      return {
        success: true,
        deleted_task_id: id,
        title: task.title,
        affected_subtasks: affectedSubtasks,
        message: `🗑️ 任务 "${task.title}" 已删除${affectedSubtasks.length > 0 ? `，同时删除了 ${affectedSubtasks.length} 个子任务` : ''}`
      };
    } catch (error: any) {
      console.error(`[ERROR] 删除任务失败:`, error.response?.data || error.message);
      return {
        success: false,
        error: `删除任务失败: ${error.response?.data?.error || error.message}`
      };
    }
  }

  // 更新任务信息
  async updateTask(id: number, updates: any): Promise<any> {
    try {
      console.error(`[DEBUG] 更新任务: ID ${id}, 更新字段: ${Object.keys(updates).join(', ')}`);
      
      const task = await this.findTaskById(id);
      
      // 验证更新字段
      const directFields = ['title', 'description', 'status', 'due_date', 'assignee_id'];
      const customFields = ['priority'];
      const allFields = [...directFields, ...customFields];
      const changedFields: string[] = [];
      
      const updateData: any = {
        project_id: task.project_id,
        parent_id: task.parent_id,
        custom_fields: { ...task.custom_fields }
      };

      // 构建更新数据，只包含变更的字段
      for (const [field, value] of Object.entries(updates)) {
        if (!allFields.includes(field)) {
          console.error(`[WARNING] 忽略不允许的字段: ${field}`);
          continue;
        }

        let currentValue: any;
        let hasChanged = false;

        if (directFields.includes(field)) {
          // 直接字段
          currentValue = task[field];
          hasChanged = currentValue !== value;
          if (hasChanged) {
            updateData[field] = value;
          }
        } else if (customFields.includes(field)) {
          // custom_fields中的字段
          currentValue = task.custom_fields?.[field];
          hasChanged = currentValue !== value;
          if (hasChanged) {
            updateData.custom_fields[field] = value;
          }
        }

        if (hasChanged) {
          changedFields.push(field);
          console.error(`[DEBUG] 字段变更: ${field} = "${currentValue}" -> "${value}"`);
        }
      }

      // 保持未更新的直接字段不变
      directFields.forEach(field => {
        if (!(field in updateData)) {
          updateData[field] = task[field];
        }
      });

      if (changedFields.length === 0) {
        return {
          success: true,
          updated_task: {
            ...task,
            priority: task.custom_fields?.priority
          },
          changed_fields: [],
          message: `📝 任务 "${task.title}" 无变更`
        };
      }

      // 状态验证
      if (updates.status && !['todo', 'pending', 'in_progress', 'completed', 'cancelled'].includes(updates.status)) {
        return {
          success: false,
          error: `无效的状态值: ${updates.status}。允许的值: todo, pending, in_progress, completed, cancelled`
        };
      }

      // 优先级验证
      if (updates.priority && !['low', 'medium', 'high'].includes(updates.priority)) {
        return {
          success: false,
          error: `无效的优先级值: ${updates.priority}。允许的值: low, medium, high`
        };
      }

      // 日期格式验证
      if (updates.due_date && updates.due_date !== null) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
        if (!dateRegex.test(updates.due_date)) {
          return {
            success: false,
            error: `无效的日期格式: ${updates.due_date}。请使用 ISO 8601 格式 (YYYY-MM-DDTHH:mm:ss.sssZ)`
          };
        }
      }

      // 执行更新
      const updateResponse = await axios.put(`${this.apiBase}/projects/${task.project_id}/tasks/${id}`, updateData, {
        headers: this.getHeaders(),
        proxy: false
      });

      const updatedTask = updateResponse.data.data;

      return {
        success: true,
        updated_task: {
          id: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description,
          status: updatedTask.status,
          priority: updatedTask.custom_fields?.priority,
          due_date: updatedTask.due_date,
          assignee_id: updatedTask.assignee_id,
          project_id: updatedTask.project_id,
          updated_at: updatedTask.updated_at,
          custom_fields: updatedTask.custom_fields
        },
        changed_fields: changedFields,
        message: `📝 任务 "${updatedTask.title}" 已更新${changedFields.length > 0 ? ` (${changedFields.join(', ')})` : ''}`
      };
    } catch (error: any) {
      console.error(`[ERROR] 更新任务失败:`, error.response?.data || error.message);
      return {
        success: false,
        error: `更新任务失败: ${error.response?.data?.error || error.message}`
      };
    }
  }

  // 创建或更新任务文档
  async createOrUpdateTaskDocument(taskId: number, content: string, projectId: number = 1): Promise<any> {
    try {
      console.error(`[DEBUG] 创建/更新任务文档: 任务ID ${taskId}, 项目ID: ${projectId}`);
      
      // 验证任务存在
      const task = await this.findTaskById(taskId);
      const actualProjectId = task.project_id || projectId;
      
      const response = await axios.put(`${this.apiBase}/projects/${actualProjectId}/tasks/${taskId}/document`, {
        content: content
      }, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      return {
        success: true,
        task_id: taskId,
        project_id: actualProjectId,
        content_length: content.length,
        message: `📄 任务 #${taskId} 文档已保存 (${content.length} 字符)`
      };
    } catch (error: any) {
      console.error(`[ERROR] 保存任务文档失败:`, error.response?.data || error.message);
      return {
        success: false,
        error: `保存任务文档失败: ${error.response?.data?.error || error.message}`
      };
    }
  }

  // 获取任务文档内容
  async getTaskDocument(taskId: number, projectId: number = 1): Promise<any> {
    try {
      console.error(`[DEBUG] 获取任务文档: 任务ID ${taskId}, 项目ID: ${projectId}`);
      
      // 验证任务存在
      const task = await this.findTaskById(taskId);
      const actualProjectId = task.project_id || projectId;
      
      const response = await axios.get(`${this.apiBase}/projects/${actualProjectId}/tasks/${taskId}/document`, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      const documentData = response.data.data || response.data;
      
      return {
        success: true,
        task_id: taskId,
        project_id: actualProjectId,
        content: documentData.content || '',
        title: documentData.title || `任务 #${taskId} 文档`,
        updated_at: documentData.updated_at,
        message: `📄 任务 #${taskId} 文档内容已获取`
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          success: false,
          task_id: taskId,
          project_id: projectId,
          error: `任务 #${taskId} 暂无文档`,
          not_found: true
        };
      }
      
      console.error(`[ERROR] 获取任务文档失败:`, error.response?.data || error.message);
      return {
        success: false,
        error: `获取任务文档失败: ${error.response?.data?.error || error.message}`
      };
    }
  }

  // 检查任务是否有文档
  async hasTaskDocument(taskId: number, projectId: number = 1): Promise<any> {
    try {
      console.error(`[DEBUG] 检查任务文档: 任务ID ${taskId}, 项目ID: ${projectId}`);
      
      // 验证任务存在
      const task = await this.findTaskById(taskId);
      const actualProjectId = task.project_id || projectId;
      
      const response = await axios.head(`${this.apiBase}/projects/${actualProjectId}/tasks/${taskId}/document`, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      return {
        success: true,
        task_id: taskId,
        project_id: actualProjectId,
        has_document: true,
        message: `📄 任务 #${taskId} 有文档`
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          success: true,
          task_id: taskId,
          project_id: projectId,
          has_document: false,
          message: `📄 任务 #${taskId} 暂无文档`
        };
      }
      
      console.error(`[ERROR] 检查任务文档失败:`, error.response?.data || error.message);
      return {
        success: false,
        error: `检查任务文档失败: ${error.response?.data?.error || error.message}`
      };
    }
  }

  // 删除任务文档
  async deleteTaskDocument(taskId: number, projectId: number = 1): Promise<any> {
    try {
      console.error(`[DEBUG] 删除任务文档: 任务ID ${taskId}, 项目ID: ${projectId}`);
      
      // 验证任务存在
      const task = await this.findTaskById(taskId);
      const actualProjectId = task.project_id || projectId;
      
      const response = await axios.delete(`${this.apiBase}/projects/${actualProjectId}/tasks/${taskId}/document`, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      return {
        success: true,
        task_id: taskId,
        project_id: actualProjectId,
        message: `🗑️ 任务 #${taskId} 文档已删除`
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          success: false,
          task_id: taskId,
          project_id: projectId,
          error: `任务 #${taskId} 暂无文档可删除`
        };
      }
      
      console.error(`[ERROR] 删除任务文档失败:`, error.response?.data || error.message);
      return {
        success: false,
        error: `删除任务文档失败: ${error.response?.data?.error || error.message}`
      };
    }
  }

  // 移动任务到其他项目
  async moveTask(id: number, targetProjectId: number): Promise<any> {
    try {
      console.error(`[DEBUG] 移动任务: ID ${id} 到项目 ${targetProjectId}`);
      
      const task = await this.findTaskById(id);
      
      // 验证目标项目存在
      try {
        const projectResponse = await axios.get(`${this.apiBase}/projects/${targetProjectId}`, {
          headers: this.getHeaders(),
          proxy: false
        });
        
        if (!projectResponse.data.data) {
          return {
            success: false,
            error: `目标项目 ID ${targetProjectId} 不存在`
          };
        }
      } catch (projectError: any) {
        return {
          success: false,
          error: `目标项目 ID ${targetProjectId} 不存在或无权限访问`
        };
      }

      // 检查是否是移动到同一个项目
      if (task.project_id === targetProjectId) {
        return {
          success: false,
          error: `任务已在项目 ${targetProjectId} 中，无需移动`
        };
      }

      // 检查任务是否有子任务
      const childrenResponse = await axios.get(`${this.apiBase}/projects/${task.project_id}/tasks`, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      const allTasks = childrenResponse.data.data?.data || [];
      const childTasks = allTasks.filter((t: any) => t.parent_id === id);
      
      if (childTasks.length > 0) {
        return {
          success: false,
          error: `任务有 ${childTasks.length} 个子任务，暂不支持移动有子任务的任务`,
          child_count: childTasks.length,
          children: childTasks.map((t: any) => ({ id: t.id, title: t.title }))
        };
      }

      // 检查任务是否是子任务
      if (task.parent_id) {
        return {
          success: false,
          error: `任务是子任务（父任务ID: ${task.parent_id}），暂不支持移动子任务到其他项目`
        };
      }

      // 构建移动数据 - 保持所有原有字段，只改变项目ID
      const moveData = {
        title: task.title,
        description: task.description,
        status: task.status,
        project_id: targetProjectId,
        assignee_id: task.assignee_id,
        due_date: task.due_date,
        custom_fields: task.custom_fields,
        parent_id: null // 移动到新项目时重置父任务关系
      };

      // 在目标项目中创建任务
      const createResponse = await axios.post(`${this.apiBase}/projects/${targetProjectId}/tasks`, moveData, {
        headers: this.getHeaders(),
        proxy: false
      });

      const newTask = createResponse.data.data;

      // 删除原任务
      const deleteResponse = await axios.delete(`${this.apiBase}/projects/${task.project_id}/tasks/${id}`, {
        headers: this.getHeaders(),
        proxy: false
      });

      return {
        success: true,
        original_task_id: id,
        new_task_id: newTask.id,
        title: task.title,
        source_project_id: task.project_id,
        target_project_id: targetProjectId,
        message: `📦 任务 "${task.title}" 已从项目 ${task.project_id} 移动到项目 ${targetProjectId} (新任务ID: ${newTask.id})`
      };
    } catch (error: any) {
      console.error(`[ERROR] 移动任务失败:`, error.response?.data || error.message);
      return {
        success: false,
        error: `移动任务失败: ${error.response?.data?.error || error.message}`
      };
    }
  }

  // ========== Phase 1 新增接口 ==========

  // 1. 暂停任务
  async pauseTask(id: number): Promise<any> {
    try {
      console.error(`[DEBUG] 暂停任务: ID ${id}`);
      
      const task = await this.findTaskById(id);
      
      // 检查当前状态
      if (task.status === 'completed') {
        return {
          success: false,
          error: `任务 "${task.title}" 已完成，无法暂停`
        };
      }
      
      if (task.status === 'cancelled') {
        return {
          success: false,
          error: `任务 "${task.title}" 已取消，无法暂停`
        };
      }
      
      // 更新状态为暂停 (使用pending状态表示暂停)
      const updateResponse = await axios.put(`${this.apiBase}/projects/${task.project_id}/tasks/${id}`, {
        title: task.title,
        project_id: task.project_id,
        status: 'pending',
        description: task.description,
        parent_id: task.parent_id,
        custom_fields: task.custom_fields
      }, {
        headers: this.getHeaders(),
        proxy: false
      });

      return {
        success: true,
        id,
        title: task.title,
        status: 'pending',
        message: `⏸️ 任务 "${task.title}" 已暂停`
      };
    } catch (error: any) {
      console.error(`[ERROR] 暂停任务失败:`, error.message);
      return {
        success: false,
        error: `暂停任务失败: ${error.message}`
      };
    }
  }

  // 2. 查看项目列表
  async listProjects(): Promise<any> {
    try {
      console.error(`[DEBUG] 获取项目列表`);
      
      const response = await axios.get(`${this.apiBase}/projects`, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      const projects = response.data.data?.data || [];
      
      return {
        success: true,
        total: projects.length,
        projects: projects.map((project: any) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          created_at: project.created_at,
          updated_at: project.updated_at,
          status: project.status
        })),
        message: `📁 共找到 ${projects.length} 个项目`
      };
    } catch (error: any) {
      console.error(`[ERROR] 获取项目列表失败:`, error.response?.data || error.message);
      return {
        success: false,
        error: `获取项目列表失败: ${error.response?.data?.error || error.message}`
      };
    }
  }

  // 3. 创建新项目
  async createProject(name: string, description?: string): Promise<any> {
    try {
      console.error(`[DEBUG] 创建新项目: ${name}`);
      
      const response = await axios.post(`${this.apiBase}/projects`, {
        name,
        description: description || `通过Claude Code创建：${name}`,
        status: 'active'
      }, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      const project = response.data.data;
      
      return {
        success: true,
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        message: `✅ 项目 "${name}" 已创建 (ID: ${project.id})`
      };
    } catch (error: any) {
      console.error(`[ERROR] 创建项目失败:`, error.response?.data || error.message);
      return {
        success: false,
        error: `创建项目失败: ${error.response?.data?.error || error.message}`
      };
    }
  }

  // 4. 获取任务的子任务
  async getTaskChildren(parentId: number): Promise<any> {
    try {
      console.error(`[DEBUG] 获取任务子任务: 父任务ID ${parentId}`);
      
      const parentTask = await this.findTaskById(parentId);
      
      // 获取父任务所在项目的所有任务
      const response = await axios.get(`${this.apiBase}/projects/${parentTask.project_id}/tasks`, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      const allTasks = response.data.data?.data || [];
      const childTasks = allTasks.filter((task: any) => task.parent_id === parentId);
      
      return {
        success: true,
        parent_id: parentId,
        parent_title: parentTask.title,
        total: childTasks.length,
        children: childTasks.map((task: any) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          created_at: task.created_at,
          priority: task.custom_fields?.priority || 'low'
        })),
        message: `🌳 任务 "${parentTask.title}" 有 ${childTasks.length} 个子任务`
      };
    } catch (error: any) {
      console.error(`[ERROR] 获取子任务失败:`, error.message);
      return {
        success: false,
        error: `获取子任务失败: ${error.message}`
      };
    }
  }

  // 5. 开始任务计时
  async startTimer(taskId: number, description?: string): Promise<any> {
    try {
      console.error(`[DEBUG] 开始任务计时: 任务ID ${taskId}`);
      
      const task = await this.findTaskById(taskId);
      
      // 检查任务状态 - 只有待开始或进行中的任务可以计时
      if (!['todo', 'pending', 'in_progress'].includes(task.status)) {
        return {
          success: false,
          error: `任务 "${task.title}" 状态为 "${task.status}"，无法开始计时`
        };
      }

      // 调用统一计时API - 使用正确的端点和参数
      const response = await axios.post(`${this.apiBase}/user/timer/start`, {
        task_id: taskId,
        title: description || `Claude Code 开始计时：${task.title}`,
        category: 'development',
        estimated_minutes: 30 // 默认估算30分钟
      }, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      const timerData = response.data.data;
      
      // 如果任务还未开始，自动将其状态更新为进行中
      if (task.status !== 'in_progress') {
        await this.startTask(taskId);
      }
      
      return {
        success: true,
        task_id: taskId,
        task_title: task.title,
        timer_id: timerData.id,
        started_at: timerData.started_at,
        description: timerData.description,
        message: `⏱️ 任务 "${task.title}" 开始计时`
      };
    } catch (error: any) {
      console.error(`[ERROR] 开始计时失败:`, error.response?.data || error.message);
      return {
        success: false,
        error: `开始计时失败: ${error.response?.data?.error || error.message}`
      };
    }
  }

  // 6. 停止当前计时
  async stopTimer(taskId?: number): Promise<any> {
    try {
      console.error(`[DEBUG] 停止计时: ${taskId ? `任务ID ${taskId}` : '当前所有计时'}`);
      
      // 使用统一计时API停止计时（不需要taskId参数，会停止当前活动的计时）
      const response = await axios.post(`${this.apiBase}/user/timer/stop`, {}, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      const timerData = response.data.data;
      
      if (taskId) {
        // 如果指定了taskId，尝试获取任务信息
        try {
          const task = await this.findTaskById(taskId);
          return {
            success: true,
            task_id: taskId,
            task_title: task.title,
            timer_id: timerData.id,
            duration_seconds: timerData.duration_seconds,
            duration_formatted: this.formatDuration(timerData.duration_seconds || 0),
            stopped_at: timerData.stopped_at,
            message: `⏹️ 任务 "${task.title}" 停止计时，耗时: ${this.formatDuration(timerData.duration_seconds || 0)}`
          };
        } catch (taskError) {
          return {
            success: true,
            task_id: taskId,
            task_title: '未知任务',
            timer_id: timerData.id,
            duration_seconds: timerData.duration_seconds,
            duration_formatted: this.formatDuration(timerData.duration_seconds || 0),
            stopped_at: timerData.stopped_at,
            message: `⏹️ 计时已停止，耗时: ${this.formatDuration(timerData.duration_seconds || 0)}`
          };
        }
      } else {
        return {
          success: true,
          stopped_count: 1,
          duration_seconds: timerData.duration_seconds,
          duration_formatted: this.formatDuration(timerData.duration_seconds || 0),
          message: `⏹️ 已停止计时，总耗时: ${this.formatDuration(timerData.duration_seconds || 0)}`
        };
      }
    } catch (error: any) {
      console.error(`[ERROR] 停止计时失败:`, error.response?.data || error.message);
      return {
        success: false,
        error: `停止计时失败: ${error.response?.data?.error || error.message}`
      };
    }
  }

  // 7. 获取当前计时状态
  async getCurrentTimer(): Promise<any> {
    try {
      console.error(`[DEBUG] 获取当前计时状态`);
      
      // 使用统一计时API获取当前计时状态
      const response = await axios.get(`${this.apiBase}/user/timer/current`, {
        headers: this.getHeaders(),
        proxy: false
      });
      
      const timerData = response.data.data;
      
      if (!timerData || !timerData.task_id) {
        return {
          success: true,
          active_timers: [],
          total: 0,
          message: `⏱️ 当前没有活动的计时`
        };
      }

      // 获取任务信息
      try {
        const task = await this.findTaskById(timerData.task_id);
        const currentDuration = this.calculateCurrentDuration(timerData.started_at);
        
        const timerInfo = {
          timer_id: timerData.id,
          task_id: timerData.task_id,
          task_title: task.title,
          started_at: timerData.started_at,
          current_duration_seconds: currentDuration,
          current_duration_formatted: this.formatDuration(currentDuration),
          description: timerData.description
        };
        
        return {
          success: true,
          active_timers: [timerInfo],
          total: 1,
          message: `⏱️ 当前正在计时任务: "${task.title}" - ${this.formatDuration(currentDuration)}`
        };
      } catch (taskError) {
        return {
          success: true,
          active_timers: [{
            timer_id: timerData.id,
            task_id: timerData.task_id,
            task_title: '未知任务',
            started_at: timerData.started_at,
            current_duration_seconds: 0,
            current_duration_formatted: '00:00:00',
            description: timerData.description,
            error: '无法获取任务信息'
          }],
          total: 1,
          message: `⏱️ 当前有 1 个活动计时（任务信息获取失败）`
        };
      }
    } catch (error: any) {
      console.error(`[ERROR] 获取当前计时状态失败:`, error.response?.data || error.message);
      return {
        success: false,
        error: `获取当前计时状态失败: ${error.response?.data?.error || error.message}`
      };
    }
  }

  // 辅助方法：格式化时长
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // 辅助方法：计算当前时长
  private calculateCurrentDuration(startedAt: string): number {
    const startTime = new Date(startedAt).getTime();
    const currentTime = new Date().getTime();
    return Math.floor((currentTime - startTime) / 1000);
  }
}
