import api from './api';
import axios, { AxiosProgressEvent } from 'axios';

interface TaskDocumentResponse {
  content: string;
}

// Task 307: 新增接口定义
interface UploadedDocumentInfo {
  id?: number;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  upload_type: 'manual' | 'api';
  uploaded_at: string;
  file_path?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

interface DocumentListResponse {
  documents: UploadedDocumentInfo[];
  total: number;
}

interface UploadProgressCallback {
  (progress: number, loaded: number, total: number): void;
}

interface AdvancedTaskDocumentResponse {
  id: number;
  task_id: number;
  project_id: number;
  document_id: number;
  title: string;
  content: string;
  type: string;
  status: string;
  version: number;
  metadata: Record<string, any>;
  owner_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  task_title: string;
  project_name: string;
  owner_name: string;
  creator_name: string;
  document_exists: boolean;
  can_edit: boolean;
  can_delete: boolean;
  relations: unknown[];
  last_modified?: string;
}

interface DocumentRequest {
  content: string;
}

export const taskDocumentService = {
  // 获取任务文档内容
  async get(projectId: number, taskId: number): Promise<TaskDocumentResponse> {
    try {
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document`);
      return response.data;
    } catch (error) {
      console.error('获取任务文档失败:', error);
      throw error;
    }
  },

  // 获取增强版任务文档
  async getAdvanced(projectId: number, taskId: number): Promise<AdvancedTaskDocumentResponse> {
    try {
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/document/advanced`);
      return response.data;
    } catch (error) {
      console.error('获取增强版任务文档失败:', error);
      throw error;
    }
  },

  // 保存任务文档内容
  async save(projectId: number, taskId: number, content: string): Promise<TaskDocumentResponse> {
    try {
      const requestData: DocumentRequest = { content };
      const response = await api.put(`/projects/${projectId}/tasks/${taskId}/document`, requestData);
      return response.data;
    } catch (error) {
      console.error('保存任务文档失败:', error);
      throw error;
    }
  },

  // 更新增强版任务文档
  async updateAdvanced(projectId: number, taskId: number, data: Partial<{ content: string }>): Promise<AdvancedTaskDocumentResponse> {
    try {
      const response = await api.patch(`/projects/${projectId}/tasks/${taskId}/document/advanced`, data);
      return response.data;
    } catch (error) {
      console.error('更新增强版任务文档失败:', error);
      throw error;
    }
  },

  // 删除任务文档
  async delete(projectId: number, taskId: number): Promise<void> {
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}/document`);
    } catch (error) {
      console.error('删除任务文档失败:', error);
      throw error;
    }
  },

  // ===== Task 307: 新增文档上传下载功能 =====

  /**
   * 手工上传文档
   */
  async uploadDocument(
    projectId: number,
    taskId: number,
    file: File,
    onProgress?: UploadProgressCallback
  ): Promise<UploadedDocumentInfo> {
    try {
      // 验证文件
      this.validateFile(file);

      // 创建FormData
      const formData = new FormData();
      formData.append('document', file);

      // 配置请求
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress, progressEvent.loaded, progressEvent.total);
          }
        },
      };

      // 发送请求
      const response = await api.post(
        `/projects/${projectId}/tasks/${taskId}/upload`,
        formData,
        config
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('上传文档失败:', error);
      throw error;
    }
  },

  /**
   * API方式上传文档
   */
  async uploadDocumentAPI(
    projectId: number,
    taskId: number,
    fileName: string,
    content: string,
    mimeType?: string,
    description?: string
  ): Promise<UploadedDocumentInfo> {
    try {
      // 验证文件名
      this.validateFileName(fileName);

      const payload = {
        file_name: fileName,
        content: content, // base64 encoded
        mime_type: mimeType || this.getMimeTypeFromFileName(fileName),
        description: description || '',
      };

      const response = await api.post(
        `/projects/${projectId}/tasks/${taskId}/upload-api`,
        payload
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'API upload failed');
      }
    } catch (error) {
      console.error('API上传文档失败:', error);
      throw error;
    }
  },

  /**
   * 获取任务的所有上传文档
   */
  async getTaskDocuments(projectId: number, taskId: number): Promise<DocumentListResponse> {
    try {
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/uploads`);

      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to get documents');
      }
    } catch (error) {
      console.error('获取任务文档列表失败:', error);
      throw error;
    }
  },

  /**
   * 下载任务的Markdown格式文档
   */
  async downloadTaskMarkdown(projectId: number, taskId: number): Promise<Blob> {
    try {
      const response = await api.get(
        `/projects/${projectId}/tasks/${taskId}/download/md`,
        {
          responseType: 'blob',
        }
      );

      return response.data;
    } catch (error) {
      console.error('下载Markdown文档失败:', error);
      throw error;
    }
  },

  /**
   * 下载任务的PDF格式文档
   */
  async downloadTaskPDF(projectId: number, taskId: number): Promise<Blob> {
    try {
      const response = await api.get(
        `/projects/${projectId}/tasks/${taskId}/download/pdf`,
        {
          responseType: 'blob',
        }
      );

      return response.data;
    } catch (error) {
      console.error('下载PDF文档失败:', error);
      throw error;
    }
  },

  /**
   * 将文件转换为base64编码
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 移除data:开头的部分，只保留base64内容
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * 触发文件下载
   */
  triggerDownload(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * 批量上传文档
   */
  async uploadMultipleDocuments(
    projectId: number,
    taskId: number,
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void
  ): Promise<UploadedDocumentInfo[]> {
    const results: UploadedDocumentInfo[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await this.uploadDocument(
          projectId,
          taskId,
          file,
          onProgress ? (progress) => onProgress(i, progress) : undefined
        );
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        // 继续上传其他文件
      }
    }
    
    return results;
  },

  // ===== 辅助方法 =====

  /**
   * 验证文件
   */
  validateFile(file: File): void {
    // 检查文件大小 (10MB限制)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`文件大小 ${this.formatFileSize(file.size)} 超过最大允许大小 ${this.formatFileSize(maxSize)}`);
    }

    // 检查文件扩展名
    this.validateFileName(file.name);
  },

  /**
   * 验证文件名
   */
  validateFileName(fileName: string): void {
    const allowedExtensions = ['.md', '.pdf', '.txt'];
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));

    if (!allowedExtensions.includes(extension)) {
      throw new Error(`文件扩展名 ${extension} 不被允许。允许的扩展名: ${allowedExtensions.join(', ')}`);
    }
  },

  /**
   * 根据文件名获取MIME类型
   */
  getMimeTypeFromFileName(fileName: string): string {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    switch (extension) {
      case '.md':
        return 'text/markdown';
      case '.pdf':
        return 'application/pdf';
      case '.txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  },

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

export default taskDocumentService;