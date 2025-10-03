import { BaseClient } from './base-client.js';
export class DocumentService extends BaseClient {
    // 创建或更新任务文档
    // // @requiresPermission('create_document')
    async createOrUpdateTaskDocument(taskId, content, projectId = 1) {
        try {
            const response = await this.makeRequest('POST', `/projects/${projectId}/tasks/${taskId}/documents`, {
                content: content,
                auto_create: true
            });
            if (response.success) {
                return {
                    success: true,
                    task_id: taskId,
                    project_id: projectId,
                    content_length: content.length,
                    message: `📄 任务 ${taskId} 的文档已创建/更新 (${content.length} 字符)`
                };
            }
            else {
                return response;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `创建/更新任务文档失败: ${error.message || error}`
            };
        }
    }
    // 创建并关联任务文档
    // @requiresPermission('create_document')
    async createAndAttachTaskDocument(taskId, content, projectId = 1, title) {
        try {
            const payload = {
                taskId: taskId,
                content: content
            };
            if (projectId && projectId !== 1) {
                payload.projectId = projectId;
            }
            if (title) {
                payload.title = title;
            }
            const response = await this.makeRequest('POST', '/mcp/create-and-attach', payload);
            if (response.success) {
                return {
                    success: true,
                    task_id: taskId,
                    project_id: projectId,
                    title: title,
                    document_id: response.data?.document_id,
                    content_length: content.length,
                    message: `✅ 任务文档已创建并关联到任务 ${taskId}${title ? ` (标题: ${title})` : ''}`
                };
            }
            else {
                return response;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `创建并关联任务文档失败: ${error.message || error}`
            };
        }
    }
    // 创建并关联工作笔记
    // @requiresPermission('create_work_note')
    async createAndAttachWorkNote(taskId, content, title) {
        try {
            const payload = {
                taskId: taskId,
                content: content
            };
            if (title) {
                payload.title = title;
            }
            const response = await this.makeRequest('POST', '/mcp/create-and-attach-work-note', payload);
            if (response.success) {
                return {
                    success: true,
                    task_id: taskId,
                    title: title,
                    work_note_id: response.data?.work_note_id,
                    content_length: content.length,
                    message: `📝 工作笔记已创建并关联到任务 ${taskId}${title ? ` (标题: ${title})` : ''}`
                };
            }
            else {
                return response;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `创建并关联工作笔记失败: ${error.message || error}`
            };
        }
    }
    // 获取任务文档
    async getTaskDocument(taskId, projectId = 1) {
        try {
            const response = await this.makeRequest('GET', `/projects/${projectId}/tasks/${taskId}/documents`);
            if (response.success) {
                return {
                    success: true,
                    task_id: taskId,
                    project_id: projectId,
                    documents: response.data,
                    message: `📄 获取任务 ${taskId} 的文档成功`
                };
            }
            else {
                return response;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `获取任务文档失败: ${error.message || error}`
            };
        }
    }
    // 检查任务是否有文档
    async hasTaskDocument(taskId, projectId = 1) {
        try {
            const response = await this.makeRequest('GET', `/projects/${projectId}/tasks/${taskId}/documents/has`);
            if (response.success) {
                return {
                    success: true,
                    task_id: taskId,
                    project_id: projectId,
                    has_document: response.data?.has_document || response.data || false,
                    message: (response.data?.has_document || response.data)
                        ? `✅ 任务 ${taskId} 已有关联文档`
                        : `📄 任务 ${taskId} 暂无关联文档`
                };
            }
            else {
                return response;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `检查任务文档失败: ${error.message || error}`
            };
        }
    }
    // 删除任务文档
    // @requiresPermission('delete_document')
    async deleteTaskDocument(taskId, projectId = 1) {
        try {
            const response = await this.makeRequest('DELETE', `/mcp/delete-task-document`, undefined, {
                taskId: taskId,
                projectId: projectId
            });
            if (response.success) {
                return {
                    success: true,
                    task_id: taskId,
                    project_id: projectId,
                    message: `🗑️ 任务 ${taskId} 的文档已删除`
                };
            }
            else {
                return response;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `删除任务文档失败: ${error.message || error}`
            };
        }
    }
    // 批量创建文档
    // @requiresPermission('create_document')
    async createBatchDocuments(documents) {
        try {
            const response = await this.makeRequest('POST', '/mcp/create-batch-documents', {
                documents: documents
            });
            if (response.success) {
                return {
                    success: true,
                    created_count: documents.length,
                    documents: response.data,
                    message: `📚 批量创建 ${documents.length} 个文档成功`
                };
            }
            else {
                return response;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `批量创建文档失败: ${error.message || error}`
            };
        }
    }
    // 从模板生成文档
    // @requiresPermission('create_document')
    async generateDocumentFromTemplate(templateType, context, autoCreate = false) {
        try {
            const response = await this.makeRequest('POST', '/mcp/generate-document-from-template', {
                templateType: templateType,
                context: context,
                autoCreate: autoCreate
            });
            if (response.success) {
                return {
                    success: true,
                    template_type: templateType,
                    generated_content: response.data?.content,
                    auto_created: autoCreate,
                    document_id: response.data?.document_id,
                    message: `📋 从模板 "${templateType}" 生成文档成功${autoCreate ? ' 并已创建' : ''}`
                };
            }
            else {
                return response;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `从模板生成文档失败: ${error.message || error}`
            };
        }
    }
    // 自动填充任务上下文
    async autoFillTaskContext(taskIds, templateType, includeSubtasks = true, includeDocuments = true, includeTimeLogs = true, dateRange) {
        try {
            const payload = {
                taskIds: taskIds,
                templateType: templateType,
                includeSubtasks: includeSubtasks,
                includeDocuments: includeDocuments,
                includeTimeLogs: includeTimeLogs
            };
            if (dateRange) {
                payload.dateRange = dateRange;
            }
            const response = await this.makeRequest('POST', '/mcp/auto-fill-task-context', payload);
            if (response.success) {
                return {
                    success: true,
                    task_ids: taskIds,
                    template_type: templateType,
                    filled_content: response.data?.content,
                    context_info: response.data?.context_info,
                    message: `📊 为 ${taskIds.length} 个任务自动填充上下文成功`
                };
            }
            else {
                return response;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `自动填充任务上下文失败: ${error.message || error}`
            };
        }
    }
    // 批量创建任务文档
    // @requiresPermission('create_document')
    async createTaskDocs(options) {
        try {
            const defaultOptions = {
                template_type: 'auto',
                auto_attach: true,
                skip_existing: true,
                project_id: 1,
                batch_size: 10,
                ...options
            };
            const response = await this.makeRequest('POST', '/mcp/create-task-docs', defaultOptions);
            if (response.success) {
                return {
                    success: true,
                    processed_tasks: response.data?.processed_tasks || 0,
                    created_documents: response.data?.created_documents || 0,
                    skipped_tasks: response.data?.skipped_tasks || 0,
                    options: defaultOptions,
                    message: `📚 批量创建任务文档完成: 处理 ${response.data?.processed_tasks || 0} 个任务，创建 ${response.data?.created_documents || 0} 个文档`
                };
            }
            else {
                return response;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `批量创建任务文档失败: ${error.message || error}`
            };
        }
    }
    // 获取文档内容（通用方法）
    async getDocument(documentId) {
        try {
            const response = await this.makeRequest('GET', `/documents/${documentId}`);
            if (response.success) {
                return {
                    success: true,
                    document_id: documentId,
                    document: response.data,
                    message: `📄 获取文档 ${documentId} 成功`
                };
            }
            else {
                return response;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `获取文档失败: ${error.message || error}`
            };
        }
    }
    // 更新文档
    // @requiresPermission('update_document')
    async updateDocument(documentId, updates) {
        try {
            const response = await this.makeRequest('PUT', `/documents/${documentId}`, updates);
            if (response.success) {
                return {
                    success: true,
                    document_id: documentId,
                    updated_fields: Object.keys(updates),
                    document: response.data,
                    message: `📝 文档 ${documentId} 更新成功`
                };
            }
            else {
                return response;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `更新文档失败: ${error.message || error}`
            };
        }
    }
    // 删除文档
    // @requiresPermission('delete_document')
    async deleteDocument(documentId) {
        try {
            const response = await this.makeRequest('DELETE', `/documents/${documentId}`);
            if (response.success) {
                return {
                    success: true,
                    document_id: documentId,
                    message: `🗑️ 文档 ${documentId} 已删除`
                };
            }
            else {
                return response;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `删除文档失败: ${error.message || error}`
            };
        }
    }
    // 搜索文档
    async searchDocuments(query, options = {}) {
        try {
            const params = {
                q: query,
                limit: options.limit || 10,
                offset: options.offset || 0,
                ...options
            };
            const response = await this.makeRequest('GET', '/documents/search', undefined, params);
            if (response.success) {
                const documents = response.data?.documents || [];
                return {
                    success: true,
                    query: query,
                    documents: documents,
                    total: response.data?.total || documents.length,
                    options: options,
                    message: `🔍 搜索到 ${documents.length} 个文档`
                };
            }
            else {
                return response;
            }
        }
        catch (error) {
            return {
                success: false,
                error: `搜索文档失败: ${error.message || error}`
            };
        }
    }
}
