import axios from 'axios';
import { TaskContentAnalyzer, createTaskContentAnalyzer } from './TaskContentAnalyzer.js';
import { AutoDocumentService, createAutoDocumentService } from './AutoDocumentService.js';
import { HistoricalDataMigrator, createHistoricalDataMigrator } from './HistoricalDataMigrator.js';
export class TaskMCPServer {
    apiBase;
    authToken;
    // 智能文档自动化组件
    contentAnalyzer;
    autoDocService;
    migrationTool;
    autoDocConfig;

    constructor(apiBase = 'http://localhost/api/v1', config = {}) {
        this.apiBase = apiBase;
        // 使用系统 JWT token
        this.authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTQ3MTkwMTgsIm5iZiI6MTc1NDExNDIxOCwiaWF0IjoxNzU0MTE0MjE4fQ.iBXJyoqj7MQOT6ijQnSQQeiZx-q9-0_SCZ2q4eAB-J8';
        
        // 初始化自动文档化组件
        this.initializeAutoDocComponents(config);
    }
    /**
     * 初始化自动文档化组件
     * @param {Object} config - 配置参数
     */
    initializeAutoDocComponents(config = {}) {
        // 自动文档配置
        this.autoDocConfig = {
            enabled: config.autoDocEnabled !== false,
            triggerOnComplete: config.triggerOnComplete !== false,
            triggerOnDescriptionChange: config.triggerOnDescriptionChange || false,
            minConfidenceThreshold: config.minConfidenceThreshold || 0.6,
            qualityCheckEnabled: config.qualityCheckEnabled !== false,
            ...config.autoDoc
        };

        // 初始化组件
        this.contentAnalyzer = createTaskContentAnalyzer(config.analyzer);
        this.autoDocService = createAutoDocumentService(this, config.autoDocService);
        this.migrationTool = createHistoricalDataMigrator(this, config.migration);

        console.log('🤖 智能文档自动化系统已初始化');
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
        };
    }
    // 辅助方法：通过ID查找任务 (使用分页查询)
    async findTaskById(id) {
        try {
            // 首先尝试从项目1获取完整任务列表 (大部分任务都在项目1中)
            const tasksResult = await this.listTasks(1);
            if (tasksResult.success) {
                const task1 = tasksResult.tasks.find((t) => t.id === id);
                if (task1) {
                    return task1;
                }
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
                    const projectTasksResult = await this.listTasks(project.id);
                    if (projectTasksResult.success) {
                        const task = projectTasksResult.tasks.find((t) => t.id === id);
                        if (task) {
                            return task;
                        }
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
    async createTask(title, projectId = 1, parentId = null) {
        try {
            console.error(`[DEBUG] 创建任务: ${title}, 项目ID: ${projectId}, 父任务ID: ${parentId}`);
            const taskData = {
                title,
                project_id: projectId,
                status: 'todo', // 默认状态改为'todo'（待开始）
                description: `通过Claude Code创建：${title}`,
                custom_fields: {
                    priority: 'low' // 设置默认优先级为'低'
                }
            };
            
            // 如果指定了父任务ID，添加parent_id字段
            if (parentId) {
                taskData.parent_id = parentId;
            }
            
            const response = await axios.post(`${this.apiBase}/projects/${projectId}/tasks`, taskData, {
                headers: this.getHeaders(),
                timeout: 10000,
                proxy: false
            });
            const task = response.data.data;
            // 使用智能字段读取逻辑
            const priority = task.priority || task.custom_fields?.priority || 'low';
            
            return {
                success: true,
                id: task.id,
                title: task.title,
                status: task.status,
                priority: priority,
                message: `✅ 任务已创建 (ID: ${task.id}) - "${task.title}" [状态: ${task.status}, 优先级: ${priority}]`
            };
        }
        catch (error) {
            console.error(`[ERROR] 创建任务失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `创建任务失败: ${error.response?.data?.error || error.message}`
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
    // 查看任务列表 (支持分页获取所有任务)
    async listTasks(projectId = 1) {
        try {
            console.error(`[DEBUG] 获取任务列表, 项目ID: ${projectId}`);
            
            let allTasks = [];
            let currentPage = 1;
            let totalPages = 1;
            
            // 分页获取所有任务
            do {
                const response = await axios.get(`${this.apiBase}/projects/${projectId}/tasks`, {
                    headers: this.getHeaders(),
                    proxy: false,
                    params: {
                        page: currentPage,
                        page_size: 100  // 使用较大的页面大小减少请求次数
                    }
                });
                
                const responseData = response.data.data;
                const tasks = responseData?.data || [];
                const total = responseData?.total || 0;
                const pageSize = responseData?.page_size || 20;
                
                allTasks = allTasks.concat(tasks);
                totalPages = Math.ceil(total / pageSize);
                
                console.error(`[DEBUG] 已获取第 ${currentPage}/${totalPages} 页，本页 ${tasks.length} 个任务`);
                currentPage++;
                
            } while (currentPage <= totalPages);
            
            console.error(`[DEBUG] 分页获取完成，总计 ${allTasks.length} 个任务`);
            
            return {
                success: true,
                total: allTasks.length,
                tasks: allTasks.map((task) => ({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    created_at: task.created_at,
                    updated_at: task.updated_at,
                    project_id: task.project_id,
                    parent_id: task.parent_id,
                    assignee_id: task.assignee_id,
                    due_date: task.due_date,
                    custom_fields: task.custom_fields
                })),
                message: `📋 共找到 ${allTasks.length} 个任务`
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
    // 创建子任务
    async createSubTask(parentId, title) {
        try {
            console.error(`[DEBUG] 创建子任务: ${title}, 父任务ID: ${parentId}`);
            const parentTask = await this.findTaskById(parentId);
            const response = await axios.post(`${this.apiBase}/projects/${parentTask.project_id}/tasks`, {
                title,
                project_id: parentTask.project_id,
                parent_id: parentId,
                status: 'todo', // 默认状态改为'todo'（待开始）
                description: `通过Claude Code创建的子任务：${title}`,
                custom_fields: {
                    priority: 'low' // 设置默认优先级为'低'
                }
            }, {
                headers: this.getHeaders(),
                proxy: false
            });
            const subtask = response.data.data;
            // 使用智能字段读取逻辑
            const priority = subtask.priority || subtask.custom_fields?.priority || 'low';
            
            return {
                success: true,
                id: subtask.id,
                title: subtask.title,
                parent_id: parentId,
                status: subtask.status,
                priority: priority,
                message: `✅ 子任务已创建 (ID: ${subtask.id}) - "${subtask.title}" [状态: ${subtask.status}, 优先级: ${priority}]`
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
            
            // 字段分类定义
            const directFields = ['title', 'description', 'status', 'due_date', 'assignee_id', 'parent_id', 'total_time_seconds'];
            const dualStorageFields = ['priority', 'estimated_hours', 'tags']; // 双重存储字段
            const customOnlyFields = []; // 仅存储在custom_fields中的字段
            const allFields = [...directFields, ...dualStorageFields, ...customOnlyFields];
            
            const changedFields = [];
            const updateData = {
                project_id: task.project_id,
                custom_fields: { ...task.custom_fields } // 初始化custom_fields
            };
            
            // 智能字段处理函数
            const getFieldValue = (field, task) => {
                if (dualStorageFields.includes(field)) {
                    // 对于双重存储字段，直接字段优先，但要处理空值
                    const directValue = task[field];
                    const customValue = task.custom_fields?.[field];
                    
                    // 如果直接字段有有效值（非空字符串、非null、非undefined），优先使用
                    if (directValue !== null && directValue !== undefined && directValue !== '') {
                        return directValue;
                    }
                    // 否则使用custom_fields中的值
                    return customValue;
                } else {
                    return task[field];
                }
            };
            
            // 构建更新数据，只包含变更的字段
            for (const [field, value] of Object.entries(updates)) {
                if (!allFields.includes(field)) {
                    console.error(`[WARNING] 忽略不允许的字段: ${field}`);
                    continue;
                }
                
                const currentValue = getFieldValue(field, task);
                const hasChanged = currentValue !== value;
                
                if (hasChanged) {
                    changedFields.push(field);
                    console.error(`[DEBUG] 字段变更: ${field} = "${currentValue}" -> "${value}"`);
                    
                    if (directFields.includes(field)) {
                        // 仅直接字段
                        updateData[field] = value;
                    } else if (dualStorageFields.includes(field)) {
                        // 双重存储字段：同时更新直接字段和custom_fields
                        updateData[field] = value;
                        updateData.custom_fields[field] = value;
                        console.error(`[DEBUG] 双重存储字段 ${field}: 同时更新直接字段和custom_fields`);
                    } else if (customOnlyFields.includes(field)) {
                        // 仅custom_fields字段
                        updateData.custom_fields[field] = value;
                    }
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
            
            // 自动文档创建逻辑
            let autoDocResult = null;
            if (this.autoDocConfig.enabled) {
                const shouldTrigger = this.shouldTriggerAutoDocCreation(task, updates, changedFields);
                if (shouldTrigger.should) {
                    autoDocResult = await this.handleAutoDocumentCreation(updatedTask, shouldTrigger.reason);
                }
            }
            
            // 使用智能字段读取函数处理返回数据
            const getDisplayValue = (field, task) => {
                if (dualStorageFields.includes(field)) {
                    // 处理空值：直接字段优先，但要考虑空字符串和null
                    const directValue = task[field];
                    const customValue = task.custom_fields?.[field];
                    
                    if (directValue !== null && directValue !== undefined && directValue !== '') {
                        return directValue;
                    }
                    return customValue;
                }
                return task[field];
            };

            const result = {
                success: true,
                updated_task: {
                    id: updatedTask.id,
                    title: updatedTask.title,
                    description: updatedTask.description,
                    status: updatedTask.status,
                    priority: getDisplayValue('priority', updatedTask),
                    estimated_hours: getDisplayValue('estimated_hours', updatedTask),
                    tags: getDisplayValue('tags', updatedTask),
                    due_date: updatedTask.due_date,
                    assignee_id: updatedTask.assignee_id,
                    project_id: updatedTask.project_id,
                    updated_at: updatedTask.updated_at,
                    custom_fields: updatedTask.custom_fields
                },
                changed_fields: changedFields,
                message: `📝 任务 "${updatedTask.title}" 已更新${changedFields.length > 0 ? ` (${changedFields.join(', ')})` : ''}`
            };

            // 附加自动文档创建结果
            if (autoDocResult) {
                result.auto_document_created = autoDocResult.success;
                result.document_confidence = autoDocResult.confidence;
                result.auto_doc_message = autoDocResult.message;
                
                if (autoDocResult.success) {
                    result.message += ` 📄 (自动创建任务文档)`;
                }
            }

            return result;
        }
        catch (error) {
            console.error(`[ERROR] 更新任务失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `更新任务失败: ${error.response?.data?.error || error.message}`
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

    // ========================================
    // 任务文档管理方法
    // ========================================

    // 创建或更新任务文档
    async createOrUpdateTaskDocument(taskId, content, title = null) {
        try {
            console.error(`[DEBUG] 创建/更新任务文档: 任务ID ${taskId}`);
            const task = await this.findTaskById(taskId);
            
            const documentData = {
                content: content
            };
            
            if (title) {
                documentData.title = title;
            }
            
            // 先尝试获取现有文档
            let hasExistingDoc = false;
            try {
                const checkResponse = await axios.get(`${this.apiBase}/projects/${task.project_id}/tasks/${taskId}/documents`, {
                    headers: this.getHeaders(),
                    proxy: false
                });
                hasExistingDoc = checkResponse.status === 200;
            } catch (error) {
                hasExistingDoc = false;
            }
            
            let response;
            if (hasExistingDoc) {
                // 更新现有文档
                response = await axios.put(`${this.apiBase}/projects/${task.project_id}/tasks/${taskId}/documents`, documentData, {
                    headers: this.getHeaders(),
                    proxy: false
                });
            } else {
                // 创建新文档
                response = await axios.post(`${this.apiBase}/projects/${task.project_id}/tasks/${taskId}/documents`, documentData, {
                    headers: this.getHeaders(),
                    proxy: false
                });
            }
            
            return {
                success: true,
                task_id: taskId,
                operation: hasExistingDoc ? 'updated' : 'created',
                message: `📄 任务 "${task.title}" 的文档已${hasExistingDoc ? '更新' : '创建'}`
            };
        }
        catch (error) {
            console.error(`[ERROR] 创建/更新任务文档失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `创建/更新任务文档失败: ${error.response?.data?.error || error.message}`
            };
        }
    }

    // 获取任务文档
    async getTaskDocument(taskId) {
        try {
            console.error(`[DEBUG] 获取任务文档: 任务ID ${taskId}`);
            const task = await this.findTaskById(taskId);
            
            const response = await axios.get(`${this.apiBase}/projects/${task.project_id}/tasks/${taskId}/documents`, {
                headers: this.getHeaders(),
                proxy: false
            });
            
            const document = response.data.data;
            
            return {
                success: true,
                task_id: taskId,
                document: {
                    content: document.content,
                    last_updated: document.last_updated,
                    size: document.size
                },
                message: `📄 获取任务 "${task.title}" 的文档成功`
            };
        }
        catch (error) {
            if (error.response?.status === 404) {
                return {
                    success: false,
                    task_id: taskId,
                    error: '任务文档不存在',
                    has_document: false
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
    async hasTaskDocument(taskId) {
        try {
            const result = await this.getTaskDocument(taskId);
            return {
                success: true,
                task_id: taskId,
                has_document: result.success,
                message: `任务 ${taskId} ${result.success ? '有' : '没有'}文档`
            };
        }
        catch (error) {
            return {
                success: false,
                task_id: taskId,
                has_document: false,
                error: error.message
            };
        }
    }

    // 删除任务文档
    async deleteTaskDocument(taskId) {
        try {
            console.error(`[DEBUG] 删除任务文档: 任务ID ${taskId}`);
            const task = await this.findTaskById(taskId);
            
            const response = await axios.delete(`${this.apiBase}/projects/${task.project_id}/tasks/${taskId}/documents`, {
                headers: this.getHeaders(),
                proxy: false
            });
            
            return {
                success: true,
                task_id: taskId,
                message: `🗑️ 任务 "${task.title}" 的文档已删除`
            };
        }
        catch (error) {
            console.error(`[ERROR] 删除任务文档失败:`, error.response?.data || error.message);
            return {
                success: false,
                error: `删除任务文档失败: ${error.response?.data?.error || error.message}`
            };
        }
    }

    // ===== 智能文档自动化相关方法 =====

    /**
     * 判断是否应该触发自动文档创建
     * @param {Object} originalTask - 原始任务
     * @param {Object} updates - 更新的字段
     * @param {Array} changedFields - 变更的字段列表
     * @returns {Object} 触发判断结果
     */
    shouldTriggerAutoDocCreation(originalTask, updates, changedFields) {
        if (!this.autoDocConfig.enabled) {
            return { should: false, reason: '自动文档功能已禁用' };
        }

        // 1. 任务完成触发
        if (this.autoDocConfig.triggerOnComplete && 
            changedFields.includes('status') && 
            updates.status === 'completed') {
            return { 
                should: true, 
                reason: 'task_completed',
                message: '任务状态变更为completed' 
            };
        }

        // 2. 描述重大变化触发
        if (this.autoDocConfig.triggerOnDescriptionChange && 
            changedFields.includes('description')) {
            const hasSignificantChange = this.hasSignificantDescriptionChange(
                originalTask.description, 
                updates.description
            );
            
            if (hasSignificantChange) {
                return { 
                    should: true, 
                    reason: 'description_significant_change',
                    message: '任务描述发生重大变化' 
                };
            }
        }

        // 3. 其他可配置的状态变更触发
        if (this.autoDocConfig.otherStatusTriggers && 
            changedFields.includes('status')) {
            const triggerStatuses = this.autoDocConfig.otherStatusTriggers;
            if (triggerStatuses.includes(updates.status)) {
                return { 
                    should: true, 
                    reason: 'status_change',
                    message: `任务状态变更为${updates.status}` 
                };
            }
        }

        return { should: false, reason: '未满足触发条件' };
    }

    /**
     * 检测描述是否有重大变化
     * @param {string} oldDescription - 原描述
     * @param {string} newDescription - 新描述
     * @returns {boolean} 是否有重大变化
     */
    hasSignificantDescriptionChange(oldDescription, newDescription) {
        if (!oldDescription || !newDescription) {
            return false;
        }

        const oldLen = oldDescription.length;
        const newLen = newDescription.length;

        // 长度变化阈值：30%变化或200字符差异
        const lengthChangeThreshold = 0.3;
        const absoluteChangeThreshold = 200;
        
        const lengthDiff = Math.abs(newLen - oldLen);
        const relativeChange = lengthDiff / Math.max(oldLen, newLen);

        if (relativeChange >= lengthChangeThreshold || lengthDiff >= absoluteChangeThreshold) {
            return true;
        }

        // 内容相似性检查（简化版本）
        const similarity = this.calculateTextSimilarity(oldDescription, newDescription);
        return similarity < 0.7; // 70%相似度阈值
    }

    /**
     * 计算文本相似度（简化算法）
     * @param {string} text1 - 文本1
     * @param {string} text2 - 文本2
     * @returns {number} 相似度 (0-1)
     */
    calculateTextSimilarity(text1, text2) {
        // 简化的相似度计算：基于共同词汇比例
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    /**
     * 处理自动文档创建
     * @param {Object} task - 任务对象
     * @param {string} reason - 触发原因
     * @returns {Promise<Object>} 创建结果
     */
    async handleAutoDocumentCreation(task, reason) {
        try {
            console.log(`🤖 触发自动文档创建: 任务${task.id} (原因: ${reason})`);

            const result = await this.autoDocService.createDocumentFromTask(task, {
                force: false, // 尊重质量检查
                duplicateAction: this.autoDocConfig.duplicateAction || 'skip',
                message: `自动创建 - ${reason} - ${new Date().toLocaleString('zh-CN')}`
            });

            if (result.success) {
                console.log(`✅ 任务${task.id}自动文档创建成功，置信度${result.confidence}`);
            } else {
                console.log(`⚠️ 任务${task.id}自动文档创建跳过: ${result.message}`);
            }

            return result;

        } catch (error) {
            console.error(`❌ 任务${task.id}自动文档创建失败:`, error.message);
            return {
                success: false,
                confidence: 0,
                message: `自动文档创建失败: ${error.message}`
            };
        }
    }

    /**
     * 手动触发自动文档创建
     * @param {number} taskId - 任务ID
     * @param {Object} options - 创建选项
     * @returns {Promise<Object>} 创建结果
     */
    async triggerAutoDocumentCreation(taskId, options = {}) {
        try {
            const task = await this.findTaskById(taskId);
            
            return await this.autoDocService.createDocumentFromTask(task, {
                force: options.force || false,
                duplicateAction: options.duplicateAction || 'skip',
                message: options.message || `手动触发自动创建 - ${new Date().toLocaleString('zh-CN')}`
            });

        } catch (error) {
            return {
                success: false,
                error: `手动触发自动文档创建失败: ${error.message}`
            };
        }
    }

    /**
     * 批量自动文档创建（历史数据迁移）
     * @param {Object} options - 迁移选项
     * @returns {Promise<Object>} 迁移结果
     */
    async batchAutoDocumentCreation(options = {}) {
        try {
            console.log('🚀 开始批量自动文档创建...');

            // 1. 扫描和筛选任务
            const scanResult = await this.migrationTool.scanAndFilterTasks(options);
            
            if (!scanResult.success) {
                return {
                    success: false,
                    error: '扫描任务失败',
                    details: scanResult
                };
            }

            // 2. 执行迁移
            const migrationResult = await this.migrationTool.executeMigration(
                scanResult.tasks.qualified,
                options
            );

            console.log(`✅ 批量文档创建完成: ${migrationResult.summary.success}/${migrationResult.summary.total}`);

            return migrationResult;

        } catch (error) {
            console.error('❌ 批量自动文档创建失败:', error.message);
            return {
                success: false,
                error: `批量创建失败: ${error.message}`
            };
        }
    }

    /**
     * 获取自动文档统计信息
     * @returns {Promise<Object>} 统计信息
     */
    async getAutoDocumentStatistics() {
        try {
            return {
                config: this.autoDocConfig,
                analyzer: this.contentAnalyzer.getStatistics(),
                autoDocService: this.autoDocService.getStatistics(),
                migrationTool: this.migrationTool.getStatistics(),
                version: '1.0.0',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                error: `获取统计信息失败: ${error.message}`
            };
        }
    }

    /**
     * 更新自动文档配置
     * @param {Object} newConfig - 新配置
     * @returns {Object} 更新结果
     */
    updateAutoDocumentConfig(newConfig) {
        try {
            this.autoDocConfig = {
                ...this.autoDocConfig,
                ...newConfig
            };

            console.log('🔧 自动文档配置已更新');

            return {
                success: true,
                config: this.autoDocConfig,
                message: '配置更新成功'
            };
        } catch (error) {
            return {
                success: false,
                error: `配置更新失败: ${error.message}`
            };
        }
    }
}
