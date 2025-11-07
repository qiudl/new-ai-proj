import api from './api';

export interface TemplateRecommendation {
  template: {
    id: number;
    name: string;
    description: string;
    type: string;
    category: string;
    content: string;
    variables: TemplateVariable[];
    usage_count: number;
  };
  score: number;
  reason: string;
  variables?: Record<string, any>;
}

export interface TemplateVariable {
  name: string;
  type: string;
  default_value?: any;
  options?: string[];
  required: boolean;
  description: string;
}

export interface Template {
  id: number;
  name: string;
  description: string;
  type: string;
  category: string;
  content: string;
  variables: TemplateVariable[];
  usage_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface GenerateFromTemplateRequest {
  variables: Record<string, any>;
}

export interface GenerateFromTemplateResponse {
  content: string;
  template_id: number;
  variables: Record<string, any>;
}

export interface TemplateStatsResponse {
  total_templates: number;
  categories: Record<string, number>;
  types: Record<string, number>;
  most_used: Template[];
  recent: Template[];
}

class SmartTemplateService {
  // 获取任务的模板推荐
  async getRecommendations(projectId: number, taskId: number, params?: {
    category?: string;
    priority?: string;
  }): Promise<TemplateRecommendation[]> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.priority) queryParams.append('priority', params.priority);

    const queryString = queryParams.toString();
    const url = `/projects/${projectId}/tasks/${taskId}/templates/recommendations${queryString ? `?${queryString}` : ''}`;

    // ✅ FIXED - API拦截器已解包响应，使用类型断言
    const response = await api.get(url) as { recommendations?: TemplateRecommendation[] };
    return response.recommendations || [];
  }

  // 从模板生成文档内容
  async generateFromTemplate(
    templateId: number, 
    variables: Record<string, any>
  ): Promise<GenerateFromTemplateResponse> {
    const response = await api.post(`/templates/${templateId}/generate`, {
      variables
    });
    return response.data;
  }

  // 获取所有模板
  async getTemplates(): Promise<{
    templates: Template[];
    grouped: Record<string, Template[]>;
    total: number;
  }> {
    const response = await api.get('/templates');
    return response.data;
  }

  // 获取特定模板
  async getTemplate(templateId: number): Promise<Template> {
    const response = await api.get(`/templates/${templateId}`);
    return response.data;
  }

  // 创建新模板
  async createTemplate(template: Omit<Template, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'usage_count'>): Promise<Template> {
    const response = await api.post('/templates', template);
    return response.data;
  }

  // 获取模板统计
  async getTemplateStats(): Promise<TemplateStatsResponse> {
    const response = await api.get('/templates/stats');
    return response.data;
  }

  // 搜索模板
  async searchTemplates(params: {
    query?: string;
    category?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    templates: Template[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/templates?${queryParams.toString()}`);
    return response.data;
  }

  // 获取用户使用历史
  async getUserTemplateHistory(userId?: number): Promise<{
    history: Array<{
      template_id: number;
      template_name: string;
      used_at: string;
      variables_used: Record<string, any>;
      satisfaction_rating?: number;
    }>;
    total: number;
  }> {
    const url = userId ? `/users/${userId}/template-history` : '/user/template-history';
    const response = await api.get(url);
    return response.data;
  }

  // 评价模板使用体验
  async rateTemplateUsage(
    templateId: number, 
    rating: number, 
    feedback?: string
  ): Promise<void> {
    await api.post(`/templates/${templateId}/rate`, {
      satisfaction_rating: rating,
      feedback
    });
  }

  // 获取模板预览
  async previewTemplate(
    templateId: number, 
    variables: Record<string, any>
  ): Promise<{ preview: string }> {
    const response = await api.post(`/templates/${templateId}/preview`, {
      variables
    });
    return response.data;
  }

  // 克隆模板
  async cloneTemplate(templateId: number, newName: string): Promise<Template> {
    const response = await api.post(`/templates/${templateId}/clone`, {
      name: newName
    });
    return response.data;
  }

  // 更新模板
  async updateTemplate(
    templateId: number, 
    updates: Partial<Omit<Template, 'id' | 'created_at' | 'updated_at' | 'created_by'>>
  ): Promise<Template> {
    const response = await api.put(`/templates/${templateId}`, updates);
    return response.data;
  }

  // 删除模板
  async deleteTemplate(templateId: number): Promise<void> {
    await api.delete(`/templates/${templateId}`);
  }

  // 获取模板使用分析
  async getTemplateAnalytics(templateId: number): Promise<{
    usage_count: number;
    unique_users: number;
    avg_rating: number;
    usage_trend: Array<{ date: string; count: number }>;
    user_feedback: Array<{
      rating: number;
      feedback: string;
      created_at: string;
    }>;
  }> {
    const response = await api.get(`/templates/${templateId}/analytics`);
    return response.data;
  }
}

export const smartTemplateService = new SmartTemplateService();