import { api } from './api';

export interface TaskDocumentContent {
  taskId: number;
  projectId?: number;
  userId?: number;
  content: string;
  format: 'markdown';
  lastModified?: string;
  gitHash?: string;
}

export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface DocumentDiff {
  fromHash: string;
  toHash: string;
  diff: string;
}

export interface TaskDocumentHistory {
  taskId: number;
  projectId?: number;
  history: GitCommit[];
}

/**
 * 基于文件的任务文档管理服务
 * 支持项目任务和个人任务的文档管理，包括Git版本控制
 */
export class TaskDocumentFileService {
  // ========== 项目任务文档管理 ==========

  /**
   * 获取项目任务文档
   */
  async getTaskDocument(taskId: number, projectId: number): Promise<TaskDocumentContent> {
    const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document/file`);
    return response.data;
  }

  /**
   * 更新项目任务文档内容
   */
  async updateTaskDocument(taskId: number, projectId: number, content: string): Promise<void> {
    await api.put(`/projects/${projectId}/tasks/${taskId}/document/file`, {
      content: content
    });
  }

  /**
   * 手动创建项目任务文档
   */
  async createTaskDocument(taskId: number, projectId: number): Promise<void> {
    await api.post(`/projects/${projectId}/tasks/${taskId}/document/create`);
  }

  /**
   * 归档项目任务文档
   */
  async archiveTaskDocument(taskId: number, projectId: number): Promise<void> {
    await api.post(`/projects/${projectId}/tasks/${taskId}/document/archive`);
  }

  /**
   * 获取项目任务文档历史版本
   */
  async getTaskDocumentHistory(taskId: number, projectId: number): Promise<TaskDocumentHistory> {
    const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document/history`);
    return response.data;
  }

  /**
   * 比较项目任务文档版本
   */
  async compareTaskDocumentVersions(taskId: number, projectId: number, fromHash: string, toHash: string): Promise<DocumentDiff> {
    const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document/compare`, {
      params: { from: fromHash, to: toHash }
    });
    return response.data;
  }

  // ========== 个人任务文档管理 ==========

  /**
   * 获取个人任务文档
   */
  async getPersonalTaskDocument(taskId: number): Promise<TaskDocumentContent> {
    const response = await api.get(`/user/timer-tasks/${taskId}/document`);
    return response.data;
  }

  /**
   * 更新个人任务文档内容
   */
  async updatePersonalTaskDocument(taskId: number, content: string): Promise<void> {
    await api.put(`/user/timer-tasks/${taskId}/document`, {
      content: content
    });
  }

  /**
   * 获取个人任务文档历史版本
   */
  async getPersonalTaskDocumentHistory(taskId: number): Promise<TaskDocumentHistory> {
    const response = await api.get(`/user/timer-tasks/${taskId}/document/history`, {
      params: { personal: 'true' }
    });
    return response.data;
  }

  /**
   * 比较个人任务文档版本
   */
  async comparePersonalTaskDocumentVersions(taskId: number, fromHash: string, toHash: string): Promise<DocumentDiff> {
    const response = await api.get(`/user/timer-tasks/${taskId}/document/compare`, {
      params: { from: fromHash, to: toHash, personal: 'true' }
    });
    return response.data;
  }

  // ========== 工具方法 ==========

  /**
   * 解析Markdown文档的前置matter
   */
  parseFrontMatter(content: string): { metadata: Record<string, any>, body: string } {
    const frontMatterRegex = /^---\s*\n(.*?)\n---\s*\n(.*)/s;
    const match = content.match(frontMatterRegex);
    
    if (match) {
      const yamlContent = match[1];
      const body = match[2];
      
      // 简单的YAML解析（仅支持基本键值对）
      const metadata: Record<string, any> = {};
      yamlContent.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
          metadata[key] = value;
        }
      });
      
      return { metadata, body };
    }
    
    return { metadata: {}, body: content };
  }

  /**
   * 格式化文档内容
   */
  formatDocumentContent(metadata: Record<string, any>, body: string): string {
    const yamlLines: string[] = [];
    Object.entries(metadata).forEach(([key, value]) => {
      if (typeof value === 'string') {
        yamlLines.push(`${key}: "${value}"`);
      } else {
        yamlLines.push(`${key}: ${value}`);
      }
    });
    
    return `---\n${yamlLines.join('\n')}\n---\n\n${body}`;
  }

  /**
   * 获取文档预览（提取摘要）
   */
  getDocumentPreview(content: string, maxLength: number = 200): string {
    const { body } = this.parseFrontMatter(content);
    
    // 移除Markdown标记
    const plainText = body
      .replace(/#{1,6}\s+/g, '') // 移除标题标记
      .replace(/\*\*(.+?)\*\*/g, '$1') // 移除粗体标记
      .replace(/\*(.+?)\*/g, '$1') // 移除斜体标记
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // 移除链接，保留文本
      .replace(/`(.+?)`/g, '$1') // 移除行内代码标记
      .replace(/\n+/g, ' ') // 将换行符替换为空格
      .trim();
    
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...' 
      : plainText;
  }

  /**
   * 验证文档内容格式
   */
  validateDocumentContent(content: string): { isValid: boolean, errors: string[] } {
    const errors: string[] = [];
    
    // 检查是否有前置matter
    if (!content.startsWith('---')) {
      errors.push('文档缺少前置matter（元数据）');
    }
    
    // 检查基本结构
    const { metadata, body } = this.parseFrontMatter(content);
    
    if (!metadata.task_id) {
      errors.push('缺少task_id字段');
    }
    
    if (!metadata.title) {
      errors.push('缺少title字段');
    }
    
    if (!body.trim()) {
      errors.push('文档内容不能为空');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// 导出单例实例
export const taskDocumentFileService = new TaskDocumentFileService();