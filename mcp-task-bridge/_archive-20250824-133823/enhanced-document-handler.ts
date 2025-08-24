import path from 'path';
import fs from 'fs';
import axios from 'axios';

/**
 * 增强的MCP文档处理功能
 * 修复路径问题，添加批量处理和错误重试
 */
export class EnhancedDocumentHandler {
  private apiBase: string;
  private docsPath: string;
  private maxRetries: number = 3;
  
  constructor(apiBase: string) {
    this.apiBase = apiBase;
    
    // 使用绝对路径，确保文档目录存在
    this.docsPath = process.env.MCP_DOCS_PATH || 
      path.join('/Users/johnqiu/coding/www/projects/new-ai-proj', 'mcp-documents');
    
    this.ensureDocsDirectory();
  }
  
  /**
   * 确保文档目录存在
   */
  private ensureDocsDirectory(): void {
    if (!fs.existsSync(this.docsPath)) {
      fs.mkdirSync(this.docsPath, { recursive: true });
      console.log(`✅ 创建文档目录: ${this.docsPath}`);
    }
  }
  
  /**
   * 获取API请求头
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }
  
  /**
   * 带重试的请求执行
   */
  private async retryableRequest<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.error(`请求失败 (尝试 ${i + 1}/${maxRetries}):`, error.message);
        
        if (i < maxRetries - 1) {
          // 指数退避策略
          const delay = Math.pow(2, i) * 1000;
          console.log(`等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * 创建并关联任务文档（修复版）
   */
  async createAndAttachDocument(
    taskId: number,
    content: string,
    projectId: number = 1,
    title?: string
  ): Promise<any> {
    return this.retryableRequest(async () => {
      const url = `${this.apiBase}/projects/${projectId}/tasks/${taskId}/documents/create-and-attach`;
      
      const payload = {
        title: title || `任务 #${taskId} 文档`,
        content: content,
        type: 'markdown',
        status: 'draft',
        visibility: 'team',
        relationship_type: 'attachment',
        tags: []
      };
      
      try {
        const response = await axios.post(url, payload, {
          headers: this.getHeaders()
        });
        
        // 同时保存到本地备份
        this.saveLocalBackup(taskId, projectId, content);
        
        return {
          success: true,
          task_id: taskId,
          project_id: projectId,
          document_id: response.data?.data?.id,
          message: `✅ 任务 #${taskId} 文档已创建并关联`
        };
      } catch (error: any) {
        // 如果主端点失败，尝试备用端点
        if (error.response?.status === 404 || error.response?.status === 405) {
          const altUrl = `${this.apiBase}/projects/${projectId}/tasks/${taskId}/documents`;
          const altResponse = await axios.post(altUrl, payload, {
            headers: this.getHeaders()
          });
          
          this.saveLocalBackup(taskId, projectId, content);
          
          return {
            success: true,
            task_id: taskId,
            project_id: projectId,
            document_id: altResponse.data?.data?.id,
            message: `✅ 任务 #${taskId} 文档已通过备用端点创建`
          };
        }
        throw error;
      }
    });
  }
  
  /**
   * 批量创建文档
   */
  async createBatchDocuments(
    documents: Array<{
      taskId: number;
      title: string;
      content: string;
      projectId?: number;
    }>
  ): Promise<any> {
    const results = [];
    const errors = [];
    
    for (const doc of documents) {
      try {
        const result = await this.createAndAttachDocument(
          doc.taskId,
          doc.content,
          doc.projectId || 1,
          doc.title
        );
        results.push(result);
      } catch (error: any) {
        errors.push({
          taskId: doc.taskId,
          error: error.message
        });
      }
    }
    
    return {
      success: errors.length === 0,
      created: results.length,
      failed: errors.length,
      results,
      errors,
      message: `✅ 成功创建 ${results.length} 个文档${errors.length > 0 ? `，${errors.length} 个失败` : ''}`
    };
  }
  
  /**
   * 检查任务是否有文档
   */
  async hasTaskDocument(
    taskId: number,
    projectId: number = 1
  ): Promise<any> {
    try {
      // 首先尝试专用的has接口
      const hasUrl = `${this.apiBase}/projects/${projectId}/tasks/${taskId}/documents/has`;
      try {
        const response = await axios.get(hasUrl, {
          headers: this.getHeaders()
        });
        
        return {
          success: true,
          task_id: taskId,
          project_id: projectId,
          has_document: response.data?.has_document || false
        };
      } catch (hasError: any) {
        // 如果has接口不存在，回退到list接口
        if (hasError.response?.status === 404) {
          const listUrl = `${this.apiBase}/projects/${projectId}/tasks/${taskId}/documents/list`;
          const listResponse = await axios.get(listUrl, {
            headers: this.getHeaders()
          });
          
          const docs = listResponse.data?.data?.documents || [];
          return {
            success: true,
            task_id: taskId,
            project_id: projectId,
            has_document: docs.length > 0
          };
        }
        throw hasError;
      }
    } catch (error: any) {
      return {
        success: false,
        error: `检查文档失败: ${error.message}`
      };
    }
  }
  
  /**
   * 获取任务文档内容
   */
  async getTaskDocument(
    taskId: number,
    projectId: number = 1
  ): Promise<any> {
    try {
      // 获取文档列表
      const listUrl = `${this.apiBase}/projects/${projectId}/tasks/${taskId}/documents/list`;
      const listResponse = await axios.get(listUrl, {
        headers: this.getHeaders()
      });
      
      const docs = listResponse.data?.data?.documents || [];
      if (docs.length === 0) {
        // 检查本地备份
        const localContent = this.getLocalBackup(taskId, projectId);
        if (localContent) {
          return {
            success: true,
            task_id: taskId,
            project_id: projectId,
            content: localContent,
            source: 'local_backup',
            message: `📄 从本地备份获取任务 #${taskId} 文档`
          };
        }
        
        return {
          success: false,
          task_id: taskId,
          project_id: projectId,
          error: `任务 #${taskId} 暂无文档`,
          not_found: true
        };
      }
      
      // 选择最新的文档
      let latest = docs[0];
      for (const doc of docs) {
        if (doc.updated_at && latest.updated_at && 
            new Date(doc.updated_at) > new Date(latest.updated_at)) {
          latest = doc;
        }
      }
      
      // 获取文档内容
      const docUrl = `${this.apiBase}/documents/${latest.id}`;
      const docResponse = await axios.get(docUrl, {
        headers: this.getHeaders()
      });
      
      return {
        success: true,
        task_id: taskId,
        project_id: projectId,
        document_id: latest.id,
        content: docResponse.data?.data?.content || docResponse.data?.content,
        title: docResponse.data?.data?.title || docResponse.data?.title,
        message: `📄 获取任务 #${taskId} 文档成功`
      };
    } catch (error: any) {
      return {
        success: false,
        error: `获取文档失败: ${error.message}`
      };
    }
  }
  
  /**
   * 保存本地备份
   */
  private saveLocalBackup(
    taskId: number,
    projectId: number,
    content: string
  ): void {
    try {
      const filename = `task-${taskId}-project-${projectId}.md`;
      const filepath = path.join(this.docsPath, filename);
      fs.writeFileSync(filepath, content, 'utf8');
      console.log(`💾 本地备份已保存: ${filename}`);
    } catch (error) {
      console.error('保存本地备份失败:', error);
    }
  }
  
  /**
   * 获取本地备份
   */
  private getLocalBackup(
    taskId: number,
    projectId: number
  ): string | null {
    try {
      const filename = `task-${taskId}-project-${projectId}.md`;
      const filepath = path.join(this.docsPath, filename);
      
      if (fs.existsSync(filepath)) {
        return fs.readFileSync(filepath, 'utf8');
      }
    } catch (error) {
      console.error('读取本地备份失败:', error);
    }
    return null;
  }
}

// 导出单例实例
export const documentHandler = new EnhancedDocumentHandler(
  process.env.API_BASE || 'http://localhost:8080/api/v1'
);
