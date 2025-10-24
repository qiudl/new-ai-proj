import api from './api';

/**
 * 提示词模板
 */
export interface PromptTemplate {
  id: number;
  name: string;
  description?: string;
  content: string;
  category: string;
  tags: string[];
  usage_count: number;
  success_rate: number;
  recommended_models: string[];
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 用户提示词历史
 */
export interface UserPromptHistory {
  id: number;
  user_id: number;
  parent_task_id: number;
  prompt_text: string;
  template_id?: number;
  ai_provider: string;
  ai_model: string;
  subtasks_generated: number;
  subtasks_accepted: number;
  total_estimated_hours?: number;
  is_successful?: boolean;
  user_rating?: number;
  user_feedback?: string;
  created_at: string;
}

/**
 * 智能推荐项
 */
export interface PromptRecommendation {
  type: 'template' | 'history';
  id: number;
  content: string;
  score: number;
  similarity: number;
  success_rate: number;
  usage_count: number;
  source: string;
  category?: string;
  tags?: string[];
}

/**
 * 获取模板列表参数
 */
export interface GetTemplatesParams {
  category?: string;
  ai_provider?: string;
  limit?: number;
  page?: number;
}

/**
 * 获取历史列表参数
 */
export interface GetHistoryParams {
  ai_provider?: string;
  limit?: number;
  page?: number;
}

/**
 * 保存历史记录数据
 */
export interface SaveHistoryData {
  parent_task_id: number;
  prompt_text: string;
  template_id?: number;
  ai_provider: string;
  ai_model: string;
  subtasks_generated: number;
  total_estimated_hours?: number;
}

/**
 * 更新历史结果数据
 */
export interface UpdateHistoryResultData {
  subtasks_accepted: number;
  is_successful: boolean;
  user_rating?: number;
  user_feedback?: string;
}

/**
 * 获取推荐参数
 */
export interface GetRecommendationsParams {
  task_description: string;
  ai_provider?: string;
  limit?: number;
}

/**
 * Prompt服务类
 */
class PromptService {
  private baseURL = '/prompts';

  /**
   * 获取提示词模板列表
   */
  async getTemplates(params?: GetTemplatesParams): Promise<PromptTemplate[]> {
    try {
      const response = await api.get<PromptTemplate[]>(`${this.baseURL}/templates`, {
        params
      });
      return response as any;
    } catch (error) {
      console.error('[PromptService] Failed to fetch templates:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取提示词模板
   */
  async getTemplateById(id: number): Promise<PromptTemplate> {
    try {
      const response = await api.get<PromptTemplate>(`${this.baseURL}/templates/${id}`);
      return response as any;
    } catch (error) {
      console.error(`[PromptService] Failed to fetch template ${id}:`, error);
      throw error;
    }
  }

  /**
   * 获取用户提示词历史
   */
  async getUserHistory(params?: GetHistoryParams): Promise<UserPromptHistory[]> {
    try {
      const response = await api.get<UserPromptHistory[]>(`${this.baseURL}/history`, {
        params
      });
      return response as any;
    } catch (error) {
      console.error('[PromptService] Failed to fetch user history:', error);
      throw error;
    }
  }

  /**
   * 保存提示词历史
   */
  async saveHistory(data: SaveHistoryData): Promise<{ id: number; created_at: string }> {
    try {
      const response = await api.post<{ id: number; created_at: string }>(
        `${this.baseURL}/history`,
        data
      );
      return response as any;
    } catch (error) {
      console.error('[PromptService] Failed to save history:', error);
      throw error;
    }
  }

  /**
   * 更新历史记录结果
   */
  async updateHistoryResult(
    historyId: number,
    data: UpdateHistoryResultData
  ): Promise<void> {
    try {
      await api.put(`${this.baseURL}/history/${historyId}/result`, data);
    } catch (error) {
      console.error(`[PromptService] Failed to update history ${historyId}:`, error);
      throw error;
    }
  }

  /**
   * 获取智能推荐
   */
  async getRecommendations(params: GetRecommendationsParams): Promise<PromptRecommendation[]> {
    try {
      const response = await api.get<PromptRecommendation[]>(
        `${this.baseURL}/recommendations`,
        { params }
      );
      return response as any;
    } catch (error) {
      console.error('[PromptService] Failed to fetch recommendations:', error);
      throw error;
    }
  }

  /**
   * 删除历史记录
   */
  async deleteHistory(historyId: number): Promise<void> {
    try {
      await api.delete(`${this.baseURL}/history/${historyId}`);
    } catch (error) {
      console.error(`[PromptService] Failed to delete history ${historyId}:`, error);
      throw error;
    }
  }

  /**
   * 批量删除历史记录
   */
  async batchDeleteHistory(historyIds: number[]): Promise<void> {
    try {
      await api.post(`${this.baseURL}/history/batch-delete`, {
        history_ids: historyIds
      });
    } catch (error) {
      console.error('[PromptService] Failed to batch delete history:', error);
      throw error;
    }
  }
}

// 导出单例
export const promptService = new PromptService();

export default promptService;
