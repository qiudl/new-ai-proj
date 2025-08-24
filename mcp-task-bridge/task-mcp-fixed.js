import axios from 'axios';

export class TaskMCPServerFixed {
    constructor(apiBase = 'http://localhost:8081/api/v1') {
        this.apiBase = apiBase;
        // 从环境变量读取令牌
        const token = process.env.TASK_API_TOKEN || process.env.API_TOKEN;
        if (token && token.trim().length > 0) {
            this.authToken = token.trim();
        }
        
        // 添加默认的Bearer token（用于测试）
        if (!this.authToken) {
            this.authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTY0ODIzODUsImlhdCI6MTc1NTg3NzU4NSwibmJmIjoxNzU1ODc3NTg1LCJyb2xlIjoiYWRtaW4iLCJzdWIiOiJhZG1pbiIsInVzZXJfaWQiOjEsInVzZXJfdHlwZSI6InN5c3RlbSIsInVzZXJuYW1lIjoiYWRtaW4ifQ.ozd_oDV1e24-_x099OgdXFiTgNf_c77UsXDyL3yvdqs';
        }
        
        console.error('[TaskMCPServerFixed] 初始化完成，API基础:', this.apiBase);
    }
    
    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return headers;
    }
    
    // 修复后的查找任务方法 - 直接使用正确的API端点
    async findTaskById(taskId, projectId = 1) {
        try {
            console.error(`[TaskMCPServerFixed] 查找任务 ${taskId} 在项目 ${projectId}`);
            
            // 直接调用正确的API端点
            const response = await axios.get(
                `${this.apiBase}/projects/${projectId}/tasks/${taskId}`,
                { headers: this.getHeaders() }
            );
            
            if (response.data.success && response.data.data) {
                return response.data.data;
            }
            
            throw new Error(`任务 ${taskId} 不存在`);
        } catch (error) {
            // 如果在项目1找不到，尝试其他项目
            if (projectId === 1 && error.response?.status === 404) {
                console.error(`[TaskMCPServerFixed] 在项目1中未找到，尝试其他项目`);
                
                // 尝试项目2-5
                for (let pid = 2; pid <= 5; pid++) {
                    try {
                        const response = await axios.get(
                            `${this.apiBase}/projects/${pid}/tasks/${taskId}`,
                            { headers: this.getHeaders() }
                        );
                        
                        if (response.data.success && response.data.data) {
                            console.error(`[TaskMCPServerFixed] 在项目 ${pid} 中找到任务 ${taskId}`);
                            return response.data.data;
                        }
                    } catch (e) {
                        // 继续尝试下一个项目
                    }
                }
            }
            
            throw error;
        }
    }
    
    // 查找任务（支持ID和标题搜索）
    async findTask(params) {
        try {
            const { id, titlePattern } = params || {};
            
            if (id) {
                console.error(`[TaskMCPServerFixed] 按ID查找: ${id}`);
                const task = await this.findTaskById(id, 1);  // 修复：添加projectId参数
                return {
                    success: true,
                    data: [task],
                    count: 1,
                    message: `找到任务: ${task.title}`
                };
            }
            
            if (titlePattern) {
                console.error(`[TaskMCPServerFixed] 按标题搜索: ${titlePattern}`);
                // 获取所有任务并过滤
                const allTasks = await this.listTasks(1);
                const filtered = allTasks.data.filter(task => 
                    task.title.toLowerCase().includes(titlePattern.toLowerCase())
                );
                
                return {
                    success: true,
                    data: filtered,
                    count: filtered.length,
                    message: `找到 ${filtered.length} 个匹配的任务`
                };
            }
            
            return {
                success: false,
                error: '请提供任务ID或标题搜索关键词'
            };
        } catch (error) {
            console.error(`[TaskMCPServerFixed] 查找任务失败:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 获取任务列表
    async listTasks(projectId = 1) {
        try {
            const response = await axios.get(
                `${this.apiBase}/projects/${projectId}/tasks`,
                { headers: this.getHeaders() }
            );
            
            const tasks = response.data.data?.data || [];
            return {
                success: true,
                data: tasks,
                total: tasks.length,
                message: `找到 ${tasks.length} 个任务`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 创建任务
    async createTask(title, projectId = 1) {
        try {
            const response = await axios.post(
                `${this.apiBase}/projects/${projectId}/tasks`,
                {
                    title,
                    project_id: projectId,
                    status: 'todo',
                    description: `通过MCP创建：${title}`
                },
                { headers: this.getHeaders() }
            );
            
            const task = response.data.data;
            return {
                success: true,
                id: task.id,
                title: task.title,
                status: task.status,
                message: `✅ 任务已创建 (ID: ${task.id})`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 更新任务
    async updateTask(taskId, updates) {
        try {
            const task = await this.findTaskById(taskId);
            
            const response = await axios.put(
                `${this.apiBase}/projects/${task.project_id}/tasks/${taskId}`,
                {
                    ...task,
                    ...updates
                },
                { headers: this.getHeaders() }
            );
            
            return {
                success: true,
                id: taskId,
                message: '任务已更新'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 创建并关联文档
    async createAndAttachDocument(taskId, content, projectId = 1, title) {
        try {
            console.error(`[TaskMCPServerFixed] 为任务 ${taskId} 创建文档`);
            
            // 首先确认任务存在
            const task = await this.findTaskById(taskId, projectId);
            
            // 尝试通过API创建文档
            try {
                const response = await axios.post(
                    `${this.apiBase}/projects/${projectId}/tasks/${taskId}/documents`,
                    {
                        title: title || `任务#${taskId}文档`,
                        content: content,
                        type: 'markdown'
                    },
                    { headers: this.getHeaders() }
                );
                
                return {
                    success: true,
                    task_id: taskId,
                    message: `文档已关联到任务 ${taskId}`
                };
            } catch (apiError) {
                // 如果API不支持，保存到本地
                const fs = await import('fs');
                const path = await import('path');
                
                const docDir = path.join(process.cwd(), '.mcp-documents');
                if (!fs.existsSync(docDir)) {
                    fs.mkdirSync(docDir, { recursive: true });
                }
                
                const docPath = path.join(docDir, `task-${taskId}.md`);
                fs.writeFileSync(docPath, content);
                
                return {
                    success: true,
                    task_id: taskId,
                    message: `文档已保存到本地 (${docPath})`,
                    local_only: true
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}
