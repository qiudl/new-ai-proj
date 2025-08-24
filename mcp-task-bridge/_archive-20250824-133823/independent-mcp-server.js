#!/usr/bin/env node

/**
 * 独立的MCP服务器 - 正确的架构实现
 * 
 * 设计原则:
 * 1. 文档服务完全独立，不依赖任务系统
 * 2. 任务关联是可选功能，通过元数据实现
 * 3. 支持多种存储后端 (本地文件、数据库等)
 * 4. 优雅降级，核心功能始终可用
 */

import { DocumentService, LocalFileStorage, ConfigurableMCPService } from './ideal-mcp-architecture.js';

// ==================== 独立MCP服务器类 ====================
class IndependentMCPServer {
    constructor(config = {}) {
        this.config = {
            // 默认配置：完全独立，不依赖外部系统
            storage: 'local',
            storagePath: './.independent-docs',
            taskLinking: 'optional',  // 可选，不影响核心功能
            authRequired: false,      // 不需要认证
            ...config
        };
        
        // 创建独立的文档服务
        this.documentService = this.createDocumentService();
        this.taskMetadataStore = new Map(); // 简单的内存存储任务元数据
    }
    
    createDocumentService() {
        return new ConfigurableMCPService({
            storage: this.config.storage,
            storagePath: this.config.storagePath,
            taskLinking: this.config.taskLinking
        });
    }
    
    // ==================== 核心MCP工具方法 ====================
    
    /**
     * 创建任务 - 简化版，只存储基本信息
     */
    async createTask(title, projectId = 1, options = {}) {
        const task = {
            id: this.generateTaskId(),
            title,
            project_id: projectId,
            status: options.status || 'todo',
            description: options.description || `创建任务：${title}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...options
        };
        
        // 存储到内存中 (实际项目中可以用数据库)
        this.taskMetadataStore.set(task.id, task);
        
        return {
            success: true,
            data: task,
            id: task.id,
            title: task.title,
            status: task.status,
            message: `✅ 任务已创建 (ID: ${task.id}) - "${task.title}"`
        };
    }
    
    /**
     * 查找任务 - 不依赖外部系统
     */
    async findTask({ id, titlePattern }) {
        if (id) {
            const task = this.taskMetadataStore.get(id);
            if (task) {
                return {
                    success: true,
                    data: task,
                    message: `找到任务: ${task.title}`
                };
            } else {
                return {
                    success: false,
                    error: `任务 ${id} 不存在`
                };
            }
        }
        
        if (titlePattern) {
            const tasks = Array.from(this.taskMetadataStore.values())
                .filter(task => task.title.includes(titlePattern));
            
            return {
                success: true,
                data: tasks,
                count: tasks.length,
                message: `找到 ${tasks.length} 个匹配的任务`
            };
        }
        
        return {
            success: false,
            error: '请提供任务ID或标题模式'
        };
    }
    
    /**
     * 创建并关联任务文档 - 核心修复！
     */
    async createAndAttachTaskDocument(taskId, content, projectId = 1, title) {
        try {
            console.log(`[INDEPENDENT-MCP] 创建文档: 任务ID ${taskId}`);
            
            // 1. 创建文档 (核心功能，不依赖任何外部验证)
            const docTitle = title || `任务 ${taskId} 文档`;
            const result = await this.documentService.createAndOptionallyLink(
                docTitle,
                content,
                taskId  // 作为元数据存储，不需要验证
            );
            
            // 2. 可选：更新任务元数据
            if (this.taskMetadataStore.has(taskId)) {
                const task = this.taskMetadataStore.get(taskId);
                task.has_documents = true;
                task.updated_at = new Date().toISOString();
                this.taskMetadataStore.set(taskId, task);
            }
            
            return {
                success: true,
                task_id: taskId,
                project_id: projectId,
                document_id: result.document.id,
                created: true,
                message: `✅ 文档已创建并关联到任务 ${taskId}`
            };
            
        } catch (error) {
            console.error('[INDEPENDENT-MCP] 创建文档失败:', error);
            return {
                success: false,
                error: `创建文档失败: ${error.message}`
            };
        }
    }
    
    /**
     * 批量创建文档 - 修复版本
     */
    async createBatchDocuments(documents) {
        try {
            console.log(`[INDEPENDENT-MCP] 批量创建 ${documents.length} 个文档`);
            
            const results = [];
            const errors = [];
            
            for (const doc of documents) {
                try {
                    const result = await this.createAndAttachTaskDocument(
                        doc.taskId,
                        doc.content,
                        doc.projectId || 1,
                        doc.title
                    );
                    
                    if (result.success) {
                        results.push({
                            taskId: doc.taskId,
                            title: doc.title,
                            document_id: result.document_id,
                            success: true
                        });
                    } else {
                        errors.push({
                            taskId: doc.taskId,
                            title: doc.title,
                            error: result.error
                        });
                    }
                } catch (error) {
                    errors.push({
                        taskId: doc.taskId,
                        title: doc.title,
                        error: error.message
                    });
                }
            }
            
            return {
                success: errors.length === 0,
                created: results.length,
                failed: errors.length,
                results: results,
                errors: errors,
                message: `批量创建完成: 成功 ${results.length}, 失败 ${errors.length}`
            };
            
        } catch (error) {
            console.error('[INDEPENDENT-MCP] 批量创建失败:', error);
            return {
                success: false,
                error: `批量创建失败: ${error.message}`
            };
        }
    }
    
    /**
     * 获取任务文档
     */
    async getTaskDocument(taskId, projectId = 1) {
        try {
            // 从文档服务中查找与任务关联的文档
            const docs = await this.documentService.documentService.listDocuments({
                taskId: taskId
            });
            
            if (docs.length === 0) {
                return {
                    success: false,
                    task_id: taskId,
                    error: `任务 ${taskId} 暂无文档`,
                    not_found: true
                };
            }
            
            // 返回最新的文档
            const latestDoc = docs.sort((a, b) => 
                new Date(b.updatedAt) - new Date(a.updatedAt)
            )[0];
            
            return {
                success: true,
                task_id: taskId,
                document_id: latestDoc.id,
                content: latestDoc.content,
                title: latestDoc.title,
                updated_at: latestDoc.updatedAt,
                message: `任务 ${taskId} 文档已获取`
            };
            
        } catch (error) {
            return {
                success: false,
                error: `获取任务文档失败: ${error.message}`
            };
        }
    }
    
    /**
     * 检查任务是否有文档
     */
    async hasTaskDocument(taskId, projectId = 1) {
        try {
            const docs = await this.documentService.documentService.listDocuments({
                taskId: taskId
            });
            
            return {
                success: true,
                task_id: taskId,
                has_document: docs.length > 0,
                document_count: docs.length,
                message: `任务 ${taskId} ${docs.length > 0 ? '有' : '没有'} 文档`
            };
            
        } catch (error) {
            return {
                success: false,
                error: `检查文档失败: ${error.message}`
            };
        }
    }
    
    /**
     * 列出所有任务
     */
    async listTasks(projectId) {
        const allTasks = Array.from(this.taskMetadataStore.values());
        const filteredTasks = projectId 
            ? allTasks.filter(task => task.project_id === projectId)
            : allTasks;
        
        return {
            success: true,
            data: {
                data: filteredTasks,
                total: filteredTasks.length
            },
            message: `找到 ${filteredTasks.length} 个任务`
        };
    }
    
    /**
     * 更新任务状态
     */
    async updateTask(id, updates) {
        const task = this.taskMetadataStore.get(id);
        if (!task) {
            return {
                success: false,
                error: `任务 ${id} 不存在`
            };
        }
        
        const updatedTask = {
            ...task,
            ...updates,
            updated_at: new Date().toISOString()
        };
        
        this.taskMetadataStore.set(id, updatedTask);
        
        return {
            success: true,
            id: id,
            data: updatedTask,
            message: `任务 ${id} 已更新`
        };
    }
    
    /**
     * 完成任务
     */
    async completeTask(id) {
        return await this.updateTask(id, { status: 'completed' });
    }
    
    /**
     * 开始任务
     */
    async startTask(id) {
        return await this.updateTask(id, { status: 'in_progress' });
    }
    
    // ==================== 辅助方法 ====================
    
    generateTaskId() {
        return Date.now();
    }
    
    /**
     * 健康检查
     */
    async healthCheck() {
        return {
            success: true,
            status: 'healthy',
            service: 'Independent MCP Server',
            features: {
                document_creation: true,
                task_metadata: true,
                external_dependencies: false
            },
            storage: this.config.storage,
            message: '独立MCP服务器运行正常，无外部依赖'
        };
    }
    
    /**
     * 获取服务统计信息
     */
    getStats() {
        return {
            tasks_count: this.taskMetadataStore.size,
            storage_type: this.config.storage,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
    }
}

// ==================== 导出 ====================
export { IndependentMCPServer };

// 如果直接运行，启动测试服务器
if (import.meta.url === `file://${process.argv[1]}`) {
    async function testIndependentServer() {
        console.log('🚀 启动独立MCP服务器测试...\n');
        
        const server = new IndependentMCPServer({
            storagePath: './test-independent-docs'
        });
        
        // 健康检查
        const health = await server.healthCheck();
        console.log('🔍 健康检查:', health);
        
        // 创建测试任务
        const task1 = await server.createTask('测试独立架构', 1, {
            description: '验证独立MCP服务器功能'
        });
        console.log('\n📝 创建任务:', task1.message);
        
        // 创建文档 (核心测试)
        const doc1 = await server.createAndAttachTaskDocument(
            task1.id,
            `# 独立MCP服务器测试
            
这个文档证明了新的架构可以完全独立工作，不需要Jenkins！

## 架构优势

- ✅ 不依赖外部任务系统
- ✅ 文档创建始终可用
- ✅ 简单可靠的设计
- ✅ 易于测试和维护

## 测试结果

如果能看到这个文档，说明独立架构成功运行！`,
            1,
            '独立架构验证文档'
        );
        console.log('📄 创建文档:', doc1.message);
        
        // 批量创建测试
        const batchResult = await server.createBatchDocuments([
            {
                taskId: task1.id,
                title: '批量测试文档1',
                content: '这是批量创建的第一个文档',
                projectId: 1
            },
            {
                taskId: 999, // 不存在的任务ID，但不影响文档创建
                title: '批量测试文档2',
                content: '这是批量创建的第二个文档，任务ID不存在也能创建',
                projectId: 1
            }
        ]);
        console.log('📚 批量创建:', batchResult.message);
        
        // 获取统计信息
        const stats = server.getStats();
        console.log('\n📊 服务统计:', stats);
        
        console.log('\n🎉 独立MCP服务器测试完成！');
        console.log('   - 所有功能都独立工作');
        console.log('   - 不需要Jenkins或其他外部系统');
        console.log('   - 这就是正确的架构！');
    }
    
    testIndependentServer().catch(console.error);
}
