import {
  RoleTemplate,
  RoleTemplateResponse,
  RoleTemplateListResponse,
  TemplatePermissionsResponse,
  CreateRoleTemplateRequest,
  UpdateRoleTemplateRequest,
  ApplyTemplateToRoleRequest,
  CloneTemplateRequest,
  RoleTemplateListParams,
  RoleTemplateStats,
  TemplateApplyResult,
  TemplateCategory
} from '../types/roleTemplate';
import api from './api';

class RoleTemplateService {
  private baseURL = '/role-templates';

  /**
   * 获取角色模板列表
   */
  async getRoleTemplates(params?: RoleTemplateListParams): Promise<RoleTemplateListResponse> {
    try {
const response = await api.get(this.baseURL, { params });
      return response;
    } catch (error) {
      console.error('Failed to fetch role templates:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 根据ID获取单个角色模板详情
   */
  async getRoleTemplateById(id: number): Promise<RoleTemplateResponse> {
    try {
const response = await api.get(`${this.baseURL}/${id}`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch role template ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 创建新的角色模板
   */
  async createRoleTemplate(data: CreateRoleTemplateRequest): Promise<RoleTemplateResponse> {
    try {
const response = await api.post(this.baseURL, data);
      return response;
    } catch (error) {
      console.error('Failed to create role template:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 更新角色模板
   */
  async updateRoleTemplate(id: number, data: UpdateRoleTemplateRequest): Promise<RoleTemplateResponse> {
    try {
const response = await api.put(`${this.baseURL}/${id}`, data);
      return response;
    } catch (error) {
      console.error(`Failed to update role template ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 删除角色模板
   */
  async deleteRoleTemplate(id: number): Promise<{ success: boolean; message?: string }> {
    try {
const response = await api.delete(`${this.baseURL}/${id}`);
      return response;
    } catch (error) {
      console.error(`Failed to delete role template ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取模板权限详情
   */
  async getTemplatePermissions(id: number): Promise<TemplatePermissionsResponse> {
    try {
const response = await api.get(`${this.baseURL}/${id}/permissions`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch template permissions for ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 将模板应用到角色
   */
  async applyTemplateToRole(id: number, data: ApplyTemplateToRoleRequest): Promise<TemplateApplyResult> {
    try {
const response = await api.post(`${this.baseURL}/${id}/apply`, data);
      return response;
    } catch (error) {
      console.error(`Failed to apply template ${id} to role:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 克隆角色模板
   */
  async cloneTemplate(id: number, data: CloneTemplateRequest): Promise<RoleTemplateResponse> {
    try {
const response = await api.post(`${this.baseURL}/${id}/clone`, data);
      return response;
    } catch (error) {
      console.error(`Failed to clone template ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 按分类获取模板列表
   */
  async getTemplatesByCategory(category: TemplateCategory): Promise<RoleTemplateListResponse> {
    try {
const response = await api.get(`${this.baseURL}/category/${category}`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch templates by category ${category}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取默认系统模板
   */
  async getDefaultTemplates(): Promise<RoleTemplateListResponse> {
    try {
const response = await api.get(`${this.baseURL}/defaults`);
      return response;
    } catch (error) {
      console.error('Failed to fetch default templates:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取模板统计数据
   */
  async getTemplateStats(): Promise<RoleTemplateStats> {
    try {
const response = await api.get(`${this.baseURL}/stats`);
      return response;
    } catch (error) {
      console.error('Failed to fetch template stats:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 批量删除模板
   */
  async batchDeleteTemplates(ids: number[]): Promise<{ success: boolean; message?: string; results?: any[] }> {
    try {
const response = await api.post(`${this.baseURL}/batch-delete`, { ids });
      return response;
    } catch (error) {
      console.error('Failed to batch delete templates:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 批量激活/停用模板
   */
  async batchToggleTemplates(ids: number[], isActive: boolean): Promise<{ success: boolean; message?: string; results?: any[] }> {
    try {
const response = await api.post(`${this.baseURL}/batch-toggle`, { ids, is_active: isActive });
      return response;
    } catch (error) {
      console.error('Failed to batch toggle templates:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取模板使用历史
   */
  async getTemplateUsageHistory(id: number, params?: { page?: number; page_size?: number }) {
    try {
const response = await api.get(`${this.baseURL}/${id}/usage-history`, { params });
      return response;
    } catch (error) {
      console.error(`Failed to fetch template usage history for ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取模板版本历史
   */
  async getTemplateVersions(id: number) {
    try {
const response = await api.get(`${this.baseURL}/${id}/versions`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch template versions for ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 恢复模板到指定版本
   */
  async revertTemplateToVersion(id: number, version: number): Promise<RoleTemplateResponse> {
    try {
const response = await api.post(`${this.baseURL}/${id}/revert`, { version });
      return response;
    } catch (error) {
      console.error(`Failed to revert template ${id} to version ${version}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 导出模板配置
   */
  async exportTemplate(id: number): Promise<Blob> {
    try {
const response = await api.get(`${this.baseURL}/${id}/export`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/json, application/octet-stream'
        }
      });
      return response;
    } catch (error) {
      console.error(`Failed to export template ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 导入模板配置
   */
  async importTemplate(file: File): Promise<RoleTemplateResponse> {
    try {
      const formData = new FormData();
      formData.append('template_file', file);

const response = await api.post(`${this.baseURL}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response;
    } catch (error) {
      console.error('Failed to import template:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 验证模板代码是否可用
   */
  async validateTemplateCode(code: string): Promise<{ valid: boolean; message?: string }> {
    try {
const response = await api.post(`${this.baseURL}/validate-code`, { template_code: code });
      return response;
    } catch (error) {
      console.error('Failed to validate template code:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 搜索模板
   */
  async searchTemplates(query: string, filters?: Partial<RoleTemplateListParams>): Promise<RoleTemplateListResponse> {
    try {
      const params = { search: query, ...filters };
const response = await api.get(this.baseURL, { params });
      return response;
    } catch (error) {
      console.error('Failed to search templates:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取可用的标签列表
   */
  async getAvailableTags(): Promise<{ tags: string[]; categories: string[] }> {
    try {
const response = await api.get(`${this.baseURL}/tags`);
      return response;
    } catch (error) {
      console.error('Failed to fetch available tags:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取行业和部门列表
   */
  async getIndustriesAndDepartments(): Promise<{ industries: string[]; departments: string[] }> {
    try {
const response = await api.get(`${this.baseURL}/industries-departments`);
      return response;
    } catch (error) {
      console.error('Failed to fetch industries and departments:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 错误处理辅助方法
   */
  private handleError(error: any) {
    if (error.response) {
      // 服务器响应错误
      const { status, data } = error.response;
      return {
        status,
        message: data?.message || data?.error || '服务器错误',
        error: data?.error || 'Server error'
      };
    } else if (error.request) {
      // 网络错误
      return {
        status: 0,
        message: '网络连接失败，请检查网络设置',
        error: 'Network error'
      };
    } else {
      // 其他错误
      return {
        status: -1,
        message: error.message || '未知错误',
        error: 'Unknown error'
      };
    }
  }
}

// 导出单例实例
export const roleTemplateService = new RoleTemplateService();
export default roleTemplateService;