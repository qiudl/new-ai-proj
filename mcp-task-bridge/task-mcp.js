import axios from 'axios';
export class TaskMCPServer {
    apiBase;
    authToken;
    constructor(apiBase = 'http://localhost:8080/api/v1') {
        this.apiBase = apiBase;
        // 使用系统 JWT token (2025-08-18 更新)
        this.authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTYxNDQ2ODAsImlhdCI6MTc1NTUzOTg4MCwibmJmIjoxNzU1NTM5ODgwLCJyb2xlIjoiYWRtaW4iLCJzdWIiOiJhZG1pbiIsInVzZXJfaWQiOjEsInVzZXJfdHlwZSI6InN5c3RlbSIsInVzZXJuYW1lIjoiYWRtaW4ifQ.huC0kTWXh_OzoOUfApPNTXroiv9u31BX7ZQBrXcX0a4';
    }
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
        };
    }
    // 辅助方法：通过ID查找任务
    async findTaskById(id) {
        try {
            // 首先尝试从项目1获取任务列表 (大部分任务都在项目1中)
            const response1 = await axios.get(`${this.apiBase}/projects/1/tasks`, {
                headers: this.getHeaders(),
                proxy: false
            });
            const tasks1 = response1.data.data?.data || [];
            const task1 = tasks1.find((t) => t.id === id);
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
                if (project.id === 1)
                    continue; // 已经检查过项目1
                try {
                    const tasksResponse = await axios.get(`${this.apiBase}/projects/${project.id}/tasks`, {
                        headers: this.getHeaders(),
                        proxy: false
                    });
                    const tasks = tasksResponse.data.data?.data || [];
                    const task = tasks.find((t) => t.id === id);
                    if (task) {
                        return task;
                    }
                }
                catch (projectError) {
                    // 忽略单个项目的错误，继续查找其他项目
                    console.error(`[WARNING] 无法获取项目 ${project.id} 的任务列表: ${projectError.message}`);
                }
            }
            throw new Error(`任务 ID ${id} 不存在`);
        }
        catch (error) {
            throw new Error(`查找任务失败: ${error.message}`);
        }
    }
    // 创建任务
    async createTask(title, projectId = 1, options = {}) {
        try {
            console.error(`[DEBUG] 创建任务: ${title}, 项目ID: ${projectId}${options.parent_id ? `, 父任务ID: ${options.parent_id}` : ''}`);
            // 构建任务数据，支持parent_id等选项
            const taskData = {
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
            const response = await axios.post(`${this.apiBase}/projects/${projectId}/tasks`, taskData, {
                headers: this.getHeaders(),
                timeout: 10000,
                proxy: false
            });
            const task = response.data.data;
            return {
                success: true,
                data: task,
                id: task.id,
                title: task.title,
                status: task.status,
                priority: task.custom_fields?.priority || 'low',
                message: `✅ 任务已创建 (ID: ${task.id}) - "${task.title}" [状态: ${task.status}, 优先级: ${task.custom_fields?.priority || 'low'}]`
            };
        }
        catch (error) {
            console.error(`[ERROR] 创建任务失败:`, error.response?.data || error.message);
            // 更好的错误处理：提取用户友好的错误信息
            let userFriendlyError = error.message;
            if (error.response?.data) {
                const responseData = error.response.data;
                if (responseData.error?.message) {
                    // 后端返回的结构化错误信息
                    userFriendlyError = responseData.error.message;
                }
                else if (responseData.message) {
                    // 简单的错误信息
                    userFriendlyError = responseData.message;
                }
                else if (typeof responseData === 'string') {
                    userFriendlyError = responseData;
                }
            }
            return {
                success: false,
                error: userFriendlyError
            };
        }
    }
    // 开始任务
    async startTask(id) {
        try {
            console.error(`[DEBUG] 开始任务: ID ${id}`);
            const task = await this.findTaskById(id);
            // 更新状态为进行中
            const updateResponse = await axios.put(`${this.apiBase}/projects/${task.project_id}/tasks/${id}`, {
                title: task.title,
                project_id: task.project_id,
                status: 'in_progress',
                description: task.description,
                parent_id: task.parent_id
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
        }
        catch (error) {
            console.error(`[ERROR] 开始任务失败:`, error.message);
            return {
                success: false,
                error: `开始任务失败: ${error.message}`
            };
        }
    }
    // 完成任务
    async completeTask(id) {
        try {
            console.error(`[DEBUG] 完成任务: ID ${id}`);
            const task = await this.findTaskById(id);
            // 更新状态为已完成
            const updateResponse = await axios.put(`${this.apiBase}/projects/${task.project_id}/tasks/${id}`, {
                title: task.title,
                project_id: task.project_id,
                status: 'completed',
                description: task.description,
                parent_id: task.parent_id
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
        }
        catch (error) {
            console.error(`[ERROR] 完成任务失败:`, error.message);
            return {
                success: false,
                error: `完成任务失败: ${error.message}`
            };
        }
    }
    // 更新任务标题
    async updateTaskTitle(id, newTitle) {
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
        }
        catch (error) {
            console.error(`[ERROR] 更新任务标题失败:`, error.message);
            return {
                success: false,
                error: `更新任务标题失败: ${error.message}`
            };
        }
    }
    // 更新任务描述
    async updateTaskDescription(id, newDescription) {
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
        }
        catch (error) {
            console.error(`[ERROR] 更新任务描述失败:`, error.message);
            return {
                success: false,
                error: `更新任务描述失败: ${error.message}`
            };
        }
    }
    // 查看任务列表
    async listTasks(projectId) {
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
                tasks: tasks.map((task) => ({
                    id: task.id,
                    title: task.title,
                    status: task.status,
                    created_at: task.created_at,
                    project_id: task.project_id,
                    parent_id: task.parent_id,
                    custom_fields: task.custom_fields
                })),
                message: `📋 共找到 ${tasks.length} 个任务`
            };
        }
        catch (error) {
            console.error(`[ERROR] 获取任务列表失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `获取任务列表失败: ${error.response?.data?.error || error.message}`
            };
        }
    }
    // 创建子任务 - 支持详细参数
    async createSubTask(parentId, taskData) {
        try {
            // 如果taskData是字符串，表示只传入了title（保持向后兼容）
            if (typeof taskData === 'string') {
                taskData = { title: taskData };
            }
            const { title, description, priority = 'medium', estimated_hours = null, status = 'todo', tags = [] } = taskData;
            console.error(`[DEBUG] 创建子任务: ${title}, 父任务ID: ${parentId}`);
            const parentTask = await this.findTaskById(parentId);
            // 构建任务数据
            const taskPayload = {
                title,
                project_id: parentTask.project_id,
                parent_id: parentId,
                status: status,
                description: description || `通过Claude Code创建的子任务：${title}`,
                custom_fields: {
                    priority: priority
                }
            };
            // 添加预估工时
            if (estimated_hours) {
                taskPayload.custom_fields.estimated_hours = estimated_hours;
            }
            // 添加标签
            if (tags && tags.length > 0) {
                taskPayload.custom_fields.tags = tags;
            }
            const response = await axios.post(`${this.apiBase}/projects/${parentTask.project_id}/tasks`, taskPayload, {
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
                priority: subtask.custom_fields?.priority || priority,
                estimated_hours: subtask.custom_fields?.estimated_hours || estimated_hours,
                message: `✅ 子任务已创建 (ID: ${subtask.id}) - "${subtask.title}" [状态: ${subtask.status}, 优先级: ${subtask.custom_fields?.priority || priority}${estimated_hours ? `, 预估: ${estimated_hours}小时` : ''}]`
            };
        }
        catch (error) {
            console.error(`[ERROR] 创建子任务失败:`, error.message);
            return {
                success: false,
                error: `创建子任务失败: ${error.message}`
            };
        }
    }
    // 创建兄弟任务 - 与指定任务同级的任务
    async createSiblingTask(siblingId, title, description, status = 'todo', priority = 'medium') {
        try {
            console.error(`[DEBUG] 创建兄弟任务: ${title}, 兄弟任务ID: ${siblingId}`);
            const siblingTask = await this.findTaskById(siblingId);
            // 构建任务数据 - 兄弟任务具有相同的parent_id和project_id
            const taskPayload = {
                title,
                project_id: siblingTask.project_id,
                parent_id: siblingTask.parent_id, // 关键：使用兄弟任务的parent_id
                status: status,
                description: description || `通过Claude Code创建的兄弟任务：${title}`,
                custom_fields: {
                    priority: priority
                }
            };
            const response = await axios.post(`${this.apiBase}/projects/${siblingTask.project_id}/tasks`, taskPayload, {
                headers: this.getHeaders(),
                proxy: false
            });
            const newSibling = response.data.data;
            return {
                success: true,
                id: newSibling.id,
                title: newSibling.title,
                parent_id: newSibling.parent_id,
                sibling_id: siblingId,
                status: newSibling.status,
                priority: newSibling.custom_fields?.priority || priority,
                estimated_hours: newSibling.custom_fields?.estimated_hours || null,
                message: `✅ 兄弟任务已创建 (ID: ${newSibling.id}) - "${newSibling.title}" [同级于任务 ${siblingId}, 状态: ${newSibling.status}, 优先级: ${newSibling.custom_fields?.priority || priority}]`
            };
        }
        catch (error) {
            console.error(`[ERROR] 创建兄弟任务失败:`, error.message);
            return {
                success: false,
                error: `创建兄弟任务失败: ${error.message}`
            };
        }
    }
    // 根据名称搜索任务
    async findTaskByName(titlePattern) {
        try {
            const listResult = await this.listTasks();
            if (!listResult.success) {
                return listResult;
            }
            const matchingTasks = listResult.tasks.filter((task) => task.title.toLowerCase().includes(titlePattern.toLowerCase()));
            return {
                success: true,
                total: matchingTasks.length,
                tasks: matchingTasks,
                message: `🔍 找到 ${matchingTasks.length} 个匹配"${titlePattern}"的任务`
            };
        }
        catch (error) {
            return {
                success: false,
                error: `搜索任务失败: ${error.message}`
            };
        }
    }
    // 删除任务
    async deleteTask(id, force = false) {
        try {
            console.error(`[DEBUG] 删除任务: ID ${id}, 强制删除: ${force}`);
            const task = await this.findTaskById(id);
            // 检查是否有子任务
            const childrenResponse = await axios.get(`${this.apiBase}/projects/${task.project_id}/tasks`, {
                headers: this.getHeaders(),
                proxy: false
            });
            const allTasks = childrenResponse.data.data?.data || [];
            const childTasks = allTasks.filter((t) => t.parent_id === id);
            if (childTasks.length > 0 && !force) {
                return {
                    success: false,
                    error: `任务有 ${childTasks.length} 个子任务，请使用 force=true 强制删除或先删除子任务`,
                    child_count: childTasks.length,
                    children: childTasks.map((t) => ({ id: t.id, title: t.title }))
                };
            }
            const affectedSubtasks = [];
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
                    }
                    catch (childError) {
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
        }
        catch (error) {
            console.error(`[ERROR] 删除任务失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `删除任务失败: ${error.response?.data?.error || error.message}`
            };
        }
    }
    // 更新任务信息
    async updateTask(id, updates) {
        try {
            console.error(`[DEBUG] 更新任务: ID ${id}, 更新字段: ${Object.keys(updates).join(', ')}`);
            const task = await this.findTaskById(id);
            // 验证更新字段 - 现在包含parent_id
            const directFields = ['title', 'description', 'status', 'due_date', 'assignee_id', 'parent_id'];
            const customFields = ['priority'];
            const allFields = [...directFields, ...customFields];
            const changedFields = [];
            const updateData = {
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
                let currentValue;
                let hasChanged = false;
                if (directFields.includes(field)) {
                    // 直接字段
                    currentValue = task[field];
                    hasChanged = currentValue !== value;
                    if (hasChanged) {
                        updateData[field] = value;
                    }
                }
                else if (customFields.includes(field)) {
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
                    data: {
                        ...task,
                        priority: task.custom_fields?.priority
                    },
                    changed_fields: [],
                    message: `📝 任务 "${task.title}" 无变更`
                };
            }
            // 状态验证
            if (updates.status && !['draft', 'planning', 'todo', 'in_progress', 'testing', 'completed', 'cancelled', 'on_hold', 'suspended', 'blocked', 'archived'].includes(updates.status)) {
                return {
                    success: false,
                    error: `无效的状态值: ${updates.status}。允许的值: draft, planning, todo, in_progress, testing, completed, cancelled, on_hold, suspended, blocked, archived`
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
                data: updatedTask,
                updated_task: {
                    id: updatedTask.id,
                    title: updatedTask.title,
                    description: updatedTask.description,
                    status: updatedTask.status,
                    priority: updatedTask.custom_fields?.priority,
                    due_date: updatedTask.due_date,
                    assignee_id: updatedTask.assignee_id,
                    project_id: updatedTask.project_id,
                    parent_id: updatedTask.parent_id,
                    updated_at: updatedTask.updated_at,
                    custom_fields: updatedTask.custom_fields
                },
                changed_fields: changedFields,
                message: `📝 任务 "${updatedTask.title}" 已更新${changedFields.length > 0 ? ` (${changedFields.join(', ')})` : ''}`
            };
        }
        catch (error) {
            console.error(`[ERROR] 更新任务失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `更新任务失败: ${error.response?.data?.error || error.message}`
            };
        }
    }
    // 创建或更新任务文档
    async createOrUpdateTaskDocument(taskId, content, projectId = 1) {
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
        }
        catch (error) {
            console.error(`[ERROR] 保存任务文档失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `保存任务文档失败: ${error.response?.data?.error || error.message}`
            };
        }
    }
    // 获取任务文档内容
    async getTaskDocument(taskId, projectId = 1) {
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
        }
        catch (error) {
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
    async hasTaskDocument(taskId, projectId = 1) {
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
        }
        catch (error) {
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
    async deleteTaskDocument(taskId, projectId = 1) {
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
        }
        catch (error) {
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
    async moveTask(id, targetProjectId) {
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
            }
            catch (projectError) {
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
            const childTasks = allTasks.filter((t) => t.parent_id === id);
            if (childTasks.length > 0) {
                return {
                    success: false,
                    error: `任务有 ${childTasks.length} 个子任务，暂不支持移动有子任务的任务`,
                    child_count: childTasks.length,
                    children: childTasks.map((t) => ({ id: t.id, title: t.title }))
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
        }
        catch (error) {
            console.error(`[ERROR] 移动任务失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `移动任务失败: ${error.response?.data?.error || error.message}`
            };
        }
    }
    // ========== Phase 1 新增接口 ==========
    // 1. 暂停任务
    async pauseTask(id) {
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
        }
        catch (error) {
            console.error(`[ERROR] 暂停任务失败:`, error.message);
            return {
                success: false,
                error: `暂停任务失败: ${error.message}`
            };
        }
    }
    // 2. 查看项目列表
    async listProjects() {
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
                projects: projects.map((project) => ({
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    created_at: project.created_at,
                    updated_at: project.updated_at,
                    status: project.status
                })),
                message: `📁 共找到 ${projects.length} 个项目`
            };
        }
        catch (error) {
            console.error(`[ERROR] 获取项目列表失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `获取项目列表失败: ${error.response?.data?.error || error.message}`
            };
        }
    }
    // 3. 创建新项目
    async createProject(name, description) {
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
                data: project,
                id: project.id,
                name: project.name,
                description: project.description,
                status: project.status,
                message: `✅ 项目 "${name}" 已创建 (ID: ${project.id})`
            };
        }
        catch (error) {
            console.error(`[ERROR] 创建项目失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `创建项目失败: ${error.response?.data?.error || error.message}`
            };
        }
    }
    // 4. 获取任务的子任务
    async getTaskChildren(parentId) {
        try {
            console.error(`[DEBUG] 获取任务子任务: 父任务ID ${parentId}`);
            const parentTask = await this.findTaskById(parentId);
            // 获取父任务所在项目的所有任务
            const response = await axios.get(`${this.apiBase}/projects/${parentTask.project_id}/tasks`, {
                headers: this.getHeaders(),
                proxy: false
            });
            const allTasks = response.data.data?.data || [];
            const childTasks = allTasks.filter((task) => task.parent_id === parentId);
            return {
                success: true,
                parent_id: parentId,
                parent_title: parentTask.title,
                total: childTasks.length,
                children: childTasks.map((task) => ({
                    id: task.id,
                    title: task.title,
                    status: task.status,
                    created_at: task.created_at,
                    priority: task.custom_fields?.priority || 'low'
                })),
                message: `🌳 任务 "${parentTask.title}" 有 ${childTasks.length} 个子任务`
            };
        }
        catch (error) {
            console.error(`[ERROR] 获取子任务失败:`, error.message);
            return {
                success: false,
                error: `获取子任务失败: ${error.message}`
            };
        }
    }
    // 5. 开始任务计时
    async startTimer(taskId, description) {
        try {
            console.error(`[DEBUG] 开始任务计时: 任务ID ${taskId}`);
            const task = await this.findTaskById(taskId);
            // 检查任务状态 - 只有可工作状态的任务可以计时
            if (!['draft', 'planning', 'todo', 'in_progress', 'testing', 'on_hold'].includes(task.status)) {
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
                data: timerData,
                task_id: taskId,
                task_title: task.title,
                timer_id: timerData.id,
                started_at: timerData.started_at,
                description: timerData.description,
                message: `⏱️ 任务 "${task.title}" 开始计时`
            };
        }
        catch (error) {
            console.error(`[ERROR] 开始计时失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `开始计时失败: ${error.response?.data?.error || error.message}`
            };
        }
    }
    // 6. 停止当前计时
    async stopTimer(taskId) {
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
                        data: timerData,
                        task_id: taskId,
                        task_title: task.title,
                        timer_id: timerData.id,
                        duration_seconds: timerData.duration_seconds,
                        duration_formatted: this.formatDuration(timerData.duration_seconds || 0),
                        stopped_at: timerData.stopped_at,
                        message: `⏹️ 任务 "${task.title}" 停止计时，耗时: ${this.formatDuration(timerData.duration_seconds || 0)}`
                    };
                }
                catch (taskError) {
                    return {
                        success: true,
                        data: timerData,
                        task_id: taskId,
                        task_title: '未知任务',
                        timer_id: timerData.id,
                        duration_seconds: timerData.duration_seconds,
                        duration_formatted: this.formatDuration(timerData.duration_seconds || 0),
                        stopped_at: timerData.stopped_at,
                        message: `⏹️ 计时已停止，耗时: ${this.formatDuration(timerData.duration_seconds || 0)}`
                    };
                }
            }
            else {
                return {
                    success: true,
                    data: timerData,
                    stopped_count: 1,
                    duration_seconds: timerData.duration_seconds,
                    duration_formatted: this.formatDuration(timerData.duration_seconds || 0),
                    message: `⏹️ 已停止计时，总耗时: ${this.formatDuration(timerData.duration_seconds || 0)}`
                };
            }
        }
        catch (error) {
            console.error(`[ERROR] 停止计时失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `停止计时失败: ${error.response?.data?.error || error.message}`
            };
        }
    }
    // 7. 获取当前计时状态
    async getCurrentTimer() {
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
                    data: { active_timers: [] },
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
                    data: { active_timers: [timerInfo] },
                    active_timers: [timerInfo],
                    total: 1,
                    message: `⏱️ 当前正在计时任务: "${task.title}" - ${this.formatDuration(currentDuration)}`
                };
            }
            catch (taskError) {
                const timerInfo = {
                    timer_id: timerData.id,
                    task_id: timerData.task_id,
                    task_title: '未知任务',
                    started_at: timerData.started_at,
                    current_duration_seconds: 0,
                    current_duration_formatted: '00:00:00',
                    description: timerData.description,
                    error: '无法获取任务信息'
                };
                return {
                    success: true,
                    data: { active_timers: [timerInfo] },
                    active_timers: [timerInfo],
                    total: 1,
                    message: `⏱️ 当前有 1 个活动计时（任务信息获取失败）`
                };
            }
        }
        catch (error) {
            console.error(`[ERROR] 获取当前计时状态失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `获取当前计时状态失败: ${error.response?.data?.error || error.message}`
            };
        }
    }
    // 辅助方法：格式化时长
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    // 辅助方法：计算当前时长
    calculateCurrentDuration(startedAt) {
        const startTime = new Date(startedAt).getTime();
        const currentTime = new Date().getTime();
        return Math.floor((currentTime - startTime) / 1000);
    }

    // 批量创建任务文档 (Claude Code专用命令)
    async createTaskDocs(options = {}) {
        try {
            console.error(`[DEBUG] 批量创建任务文档: ${JSON.stringify(options)}`);
            
            const {
                task_ids = [],
                date_filter = null,
                template_type = 'auto',
                auto_attach = true,
                skip_existing = true,
                project_id = 1,
                batch_size = 10
            } = options;

            let targetTasks = [];

            // 步骤1: 获取目标任务列表
            if (task_ids && task_ids.length > 0) {
                // 通过指定任务ID获取任务
                console.error(`[DEBUG] 通过任务ID获取任务: ${task_ids.join(', ')}`);
                for (const taskId of task_ids) {
                    try {
                        const task = await this.findTaskById(taskId);
                        if (task) {
                            targetTasks.push(task);
                        }
                    } catch (error) {
                        console.error(`[WARNING] 跳过任务 ${taskId}: ${error.message}`);
                    }
                }
            } else if (date_filter) {
                // 通过日期过滤获取任务
                console.error(`[DEBUG] 通过日期过滤获取任务: ${date_filter}`);
                const tasksResponse = await axios.get(`${this.apiBase}/projects/${project_id}/tasks?page=1&page_size=100`, {
                    headers: this.getHeaders(),
                    proxy: false
                });
                
                const allTasks = tasksResponse.data.data?.data || [];
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                
                targetTasks = allTasks.filter(task => {
                    const taskDate = new Date(task.created_at).toISOString().split('T')[0];
                    
                    switch (date_filter) {
                        case 'today':
                            return taskDate === today;
                        case 'yesterday':
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);
                            return taskDate === yesterday.toISOString().split('T')[0];
                        case 'this_week':
                            const weekStart = new Date();
                            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                            return new Date(task.created_at) >= weekStart;
                        case 'last_week':
                            const lastWeekStart = new Date();
                            lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay() - 7);
                            const lastWeekEnd = new Date();
                            lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay() - 1);
                            const taskDateTime = new Date(task.created_at);
                            return taskDateTime >= lastWeekStart && taskDateTime <= lastWeekEnd;
                        case 'this_month':
                            return taskDate.substring(0, 7) === today.substring(0, 7);
                        case 'last_month':
                            const lastMonth = new Date();
                            lastMonth.setMonth(lastMonth.getMonth() - 1);
                            return taskDate.substring(0, 7) === lastMonth.toISOString().split('T')[0].substring(0, 7);
                        default:
                            return false;
                    }
                });
            } else {
                return {
                    success: false,
                    error: "必须提供 task_ids 或 date_filter 参数"
                };
            }

            if (targetTasks.length === 0) {
                return {
                    success: true,
                    data: {
                        created_documents: [],
                        skipped_tasks: [],
                        errors: []
                    },
                    message: "没有找到符合条件的任务"
                };
            }

            console.error(`[DEBUG] 找到 ${targetTasks.length} 个待处理任务`);

            // 步骤2: 检查已有文档 (如果启用skip_existing)
            const tasksToProcess = [];
            const skippedTasks = [];

            if (skip_existing) {
                for (const task of targetTasks) {
                    try {
                        const docsResponse = await axios.get(`${this.apiBase}/projects/${project_id}/tasks/${task.id}/documents`, {
                            headers: this.getHeaders(),
                            proxy: false
                        });
                        
                        const existingDocs = docsResponse.data.documents || [];
                        if (existingDocs.length > 0) {
                            skippedTasks.push({
                                task_id: task.id,
                                title: task.title,
                                reason: `已有 ${existingDocs.length} 个文档`
                            });
                        } else {
                            tasksToProcess.push(task);
                        }
                    } catch (error) {
                        // 如果无法获取文档列表，假设没有文档
                        tasksToProcess.push(task);
                    }
                }
            } else {
                tasksToProcess.push(...targetTasks);
            }

            console.error(`[DEBUG] 需要创建文档的任务: ${tasksToProcess.length} 个, 跳过: ${skippedTasks.length} 个`);

            // 步骤3: 批量创建文档
            const batchDocuments = [];
            const errors = [];

            for (const task of tasksToProcess) {
                try {
                    // 智能模板检测
                    let detectedTemplate = template_type;
                    if (template_type === 'auto') {
                        const title = task.title.toLowerCase();
                        const description = (task.description || '').toLowerCase();
                        
                        if (title.includes('bug') || title.includes('修复') || title.includes('fix')) {
                            detectedTemplate = 'bug_fix';
                        } else if (title.includes('第') && title.includes('阶段')) {
                            detectedTemplate = 'project_phase';
                        } else if (title.includes('api') || title.includes('接口')) {
                            detectedTemplate = 'api_documentation';
                        } else if (title.includes('技术') || title.includes('设计')) {
                            detectedTemplate = 'technical_design';
                        } else {
                            detectedTemplate = 'feature';
                        }
                    }

                    // 生成文档标题和内容
                    const docTitle = `${task.title} - 技术实现文档`;
                    const docContent = this.generateDocumentContent(task, detectedTemplate);

                    batchDocuments.push({
                        project_id: project_id,
                        task_id: task.id,
                        title: docTitle,
                        content: docContent,
                        type: 'markdown',
                        status: 'draft',
                        description: `任务 ${task.id} 的自动生成技术文档`,
                        attach_to_task: auto_attach,
                        relation_type: 'main',
                        template_type: detectedTemplate,
                        variables: {
                            task_id: task.id,
                            task_title: task.title,
                            task_status: task.status,
                            task_priority: task.custom_fields?.priority || 'medium',
                            created_at: new Date().toISOString()
                        }
                    });
                } catch (error) {
                    errors.push({
                        task_id: task.id,
                        title: task.title,
                        error: error.message
                    });
                }
            }

            // 步骤4: 调用批量文档创建API
            let createdDocuments = [];
            
            if (batchDocuments.length > 0) {
                try {
                    const batchResponse = await axios.post(`${this.apiBase}/documents/batch`, {
                        documents: batchDocuments,
                        options: {
                            auto_attach: auto_attach,
                            skip_existing: skip_existing,
                            transaction_mode: false, // 允许部分成功
                            default_status: 'draft',
                            default_visibility: 'team'
                        }
                    }, {
                        headers: this.getHeaders(),
                        timeout: 30000,
                        proxy: false
                    });

                    createdDocuments = batchResponse.data.created_documents || [];
                    const batchErrors = batchResponse.data.errors || [];
                    errors.push(...batchErrors);
                    
                    console.error(`[DEBUG] 批量创建完成: 成功 ${createdDocuments.length} 个, 错误 ${batchErrors.length} 个`);
                } catch (batchError) {
                    console.error(`[ERROR] 批量文档创建失败:`, batchError.response?.data || batchError.message);
                    return {
                        success: false,
                        error: `批量文档创建失败: ${batchError.response?.data?.error || batchError.message}`
                    };
                }
            }

            // 返回结果
            const result = {
                success: true,
                data: {
                    created_documents: createdDocuments,
                    skipped_tasks: skippedTasks,
                    errors: errors,
                    statistics: {
                        total_tasks: targetTasks.length,
                        processed_tasks: tasksToProcess.length,
                        created_documents: createdDocuments.length,
                        skipped_tasks: skippedTasks.length,
                        errors: errors.length
                    }
                },
                message: `📝 批量文档创建完成: 成功创建 ${createdDocuments.length} 个文档, 跳过 ${skippedTasks.length} 个任务, ${errors.length} 个错误`
            };

            return result;

        } catch (error) {
            console.error(`[ERROR] 批量创建任务文档失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `批量创建任务文档失败: ${error.response?.data?.error || error.message}`
            };
        }
    }

    // 辅助方法：生成文档内容
    generateDocumentContent(task, templateType) {
        const now = new Date().toISOString();
        const priority = task.custom_fields?.priority || 'medium';
        const status = task.status || 'todo';

        let content = `# ${task.title}\n\n`;
        content += `## 📋 任务信息\n`;
        content += `- **任务ID**: ${task.id}\n`;
        content += `- **状态**: ${status}\n`;
        content += `- **优先级**: ${priority}\n`;
        content += `- **创建时间**: ${task.created_at}\n`;
        content += `- **文档生成时间**: ${now}\n\n`;

        if (task.description) {
            content += `## 📝 任务描述\n${task.description}\n\n`;
        }

        // 根据模板类型添加特定内容
        switch (templateType) {
            case 'bug_fix':
                content += `## 🐛 Bug分析\n\n`;
                content += `### 问题描述\n- 详细描述bug现象\n- 重现步骤\n- 影响范围评估\n\n`;
                content += `### 根本原因\n- 技术原因分析\n- 代码位置定位\n- 数据流分析\n\n`;
                content += `## 🔧 修复方案\n\n`;
                content += `### 技术方案\n- 修复策略\n- 代码改动\n- 测试验证\n\n`;
                content += `### 验收标准\n- [ ] Bug现象消失\n- [ ] 相关功能正常\n- [ ] 无回归问题\n- [ ] 代码review通过\n\n`;
                break;

            case 'feature':
                content += `## 🎯 功能设计\n\n`;
                content += `### 需求分析\n- 用户故事\n- 功能需求\n- 非功能需求\n\n`;
                content += `### 技术方案\n- 架构设计\n- 接口设计\n- 数据模型\n\n`;
                content += `## 🚀 实施计划\n\n`;
                content += `### 开发阶段\n1. **需求澄清** - 与产品确认需求细节\n2. **技术设计** - 完成详细设计\n3. **功能开发** - 编码实现\n4. **测试验证** - 质量保证\n\n`;
                content += `### 验收标准\n- [ ] 功能完全按需求实现\n- [ ] 用户体验友好\n- [ ] 性能满足要求\n- [ ] 兼容性测试通过\n\n`;
                break;

            case 'project_phase':
                content += `## 🎯 阶段目标\n\n`;
                content += `### 核心交付\n- 功能列表\n- 质量标准\n- 里程碑定义\n\n`;
                content += `### 技术架构\n- 系统架构\n- 技术选型\n- 集成方案\n\n`;
                content += `## 📅 执行计划\n\n`;
                content += `### 分阶段实施\n1. **分析阶段** - 需求梳理和技术调研\n2. **设计阶段** - 架构设计和接口定义\n3. **开发阶段** - 功能实现和单元测试\n4. **验证阶段** - 集成测试和性能优化\n\n`;
                content += `### 质量保证\n- [ ] 阶段目标达成\n- [ ] 技术方案验证\n- [ ] 代码质量合格\n- [ ] 文档更新完整\n\n`;
                break;

            case 'api_documentation':
                content += `## 📡 API设计\n\n`;
                content += `### 接口规范\n- 请求方法和路径\n- 参数定义\n- 响应格式\n\n`;
                content += `### 技术细节\n- 认证机制\n- 错误处理\n- 数据验证\n\n`;
                content += `## 🔧 实现要点\n\n`;
                content += `### 后端实现\n- 路由定义\n- 控制器逻辑\n- 数据访问层\n\n`;
                content += `### 测试策略\n- 单元测试\n- 集成测试\n- API文档\n\n`;
                break;

            case 'technical_design':
                content += `## 🏗️ 技术架构\n\n`;
                content += `### 系统设计\n- 整体架构\n- 模块划分\n- 数据流设计\n\n`;
                content += `### 技术选型\n- 框架选择\n- 工具选型\n- 技术栈\n\n`;
                content += `## 🎯 实施细节\n\n`;
                content += `### 开发规范\n- 代码规范\n- 命名约定\n- 项目结构\n\n`;
                content += `### 质量控制\n- 代码review\n- 自动化测试\n- 性能监控\n\n`;
                break;

            default:
                content += `## 🔧 技术实现\n\n`;
                content += `### 实现要点\n- 关键技术点\n- 难点分析\n- 解决方案\n\n`;
                content += `### 开发计划\n1. **分析设计** - 需求分析和方案设计\n2. **编码实现** - 功能开发和调试\n3. **测试优化** - 测试和性能优化\n\n`;
                content += `### 验收标准\n- [ ] 功能正确实现\n- [ ] 代码质量合格\n- [ ] 测试覆盖充分\n\n`;
        }

        content += `## ⏱️ 预估工时\n待评估\n\n`;
        content += `---\n`;
        content += `*文档自动生成时间: ${now}*  \n`;
        content += `*生成工具: Claude Code MCP Server*  \n`;
        content += `*模板类型: ${templateType}*`;

        return content;
    }
}
