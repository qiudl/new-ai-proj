import api from './api';

/**
 * 文档生成选项
 */
export interface DocumentGenOptions {
  include_subtasks?: boolean;
  include_code_examples?: boolean;
  language?: 'zh' | 'en';
}

/**
 * 文档类型
 */
export type DocumentType = 'design' | 'requirements' | 'test_plan' | 'api_doc';

/**
 * 生成文档请求参数
 */
export interface GenerateDocumentRequest {
  task_id: number;
  model: string;
  custom_prompt?: string;
  document_type: DocumentType;
  options?: DocumentGenOptions;
}

/**
 * 文档元数据
 */
export interface DocumentMetadata {
  word_count: number;
  estimated_reading_time: number;
  sections: string[];
}

/**
 * 文档数据
 */
export interface DocumentData {
  title: string;
  content: string;
  metadata: DocumentMetadata;
}

/**
 * 生成文档响应
 */
export interface GenerateDocumentResponse {
  document: DocumentData;
  model_used: string;
  generated_at: string;
}

/**
 * 文档模板信息
 */
export interface DocumentTemplate {
  id?: number;
  name: string;
  description: string;
  content: string;
  category?: string;
  prompt_type: string;
  tags?: string[];
  usage_count?: number;
  success_rate?: number;
  recommended_models?: string[];
  is_system?: boolean;
  is_active?: boolean;
}

/**
 * 文档类型信息
 */
export interface DocumentTypeInfo {
  type: DocumentType;
  name: string;
  description: string;
}

/**
 * 保存文档请求参数
 */
export interface SaveDocumentRequest {
  task_id: number;
  title: string;
  content: string;
  project_id?: number;
}

/**
 * 保存文档响应
 */
export interface SaveDocumentResponse {
  document_id: number;
  task_id: number;
  created_at: string;
}

/**
 * AI文档生成服务类
 */
class AIDocumentService {
  /**
   * 生成文档
   */
  async generateDocument(
    request: GenerateDocumentRequest
  ): Promise<GenerateDocumentResponse> {
    try {
      const response = await api.post<GenerateDocumentResponse>(
        '/ai/generate-document',
        request
      );

      // API拦截器会自动解包 {success, data} 格式，所以response就是GenerateDocumentResponse
      return response as unknown as GenerateDocumentResponse;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'AI生成文档失败';
      throw new Error(errorMessage);
    }
  }

  /**
   * 获取文档模板列表
   */
  async getDocumentTemplates(): Promise<DocumentTemplate[]> {
    try {
      const response = await api.get<{ templates: DocumentTemplate[]; total: number }>(
        '/ai/document-templates'
      );

      // API拦截器会解包 {success, data: {templates, total}}
      const data = response as unknown as { templates: DocumentTemplate[]; total: number };
      return data.templates || [];
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || '获取文档模板失败';
      throw new Error(errorMessage);
    }
  }

  /**
   * 获取文档类型信息
   */
  async getDocumentTypes(): Promise<DocumentTypeInfo[]> {
    try {
      const response = await api.get<{ types: DocumentTypeInfo[]; total: number }>(
        '/ai/document-types'
      );

      const data = response as unknown as { types: DocumentTypeInfo[]; total: number };
      return data.types || [];
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || '获取文档类型失败';
      throw new Error(errorMessage);
    }
  }

  /**
   * 保存文档到任务
   */
  async saveDocument(request: SaveDocumentRequest): Promise<SaveDocumentResponse> {
    try {
      const response = await api.post<SaveDocumentResponse>(
        '/ai/save-document',
        request
      );

      return response as unknown as SaveDocumentResponse;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || '保存文档失败';
      throw new Error(errorMessage);
    }
  }

  /**
   * 文档类型到类型名称的映射
   */
  getDocumentTypeName(type: DocumentType): string {
    const names: Record<DocumentType, string> = {
      design: '技术设计文档',
      requirements: '需求规格说明书',
      test_plan: '测试计划文档',
      api_doc: 'API接口文档',
    };
    return names[type] || type;
  }

  /**
   * 验证文档内容
   */
  validateDocumentContent(content: string): {
    valid: boolean;
    error?: string;
  } {
    if (!content || !content.trim()) {
      return { valid: false, error: '文档内容不能为空' };
    }

    const trimmed = content.trim();

    if (trimmed.length < 100) {
      return { valid: false, error: '文档内容过短（至少100字符）' };
    }

    if (trimmed.length > 50000) {
      return { valid: false, error: '文档内容过长（最多50000字符）' };
    }

    return { valid: true };
  }
}

// 导出单例
export const aiDocumentService = new AIDocumentService();

export default aiDocumentService;
