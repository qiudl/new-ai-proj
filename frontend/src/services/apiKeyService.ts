/**
 * API Key管理服务
 * 提供API Key的完整CRUD操作和安全管理功能
 */

import api from './api';
import { APIKeyValidator, PermissionValidator, APIKeySecurity } from '../utils/apiKeyValidation';

export interface APIKey {
  id: string;
  name: string;
  description?: string;
  key: string;
  maskedKey: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'expired';
  expiresAt?: string;
  lastUsed?: string;
  usageCount: number;
  usageLimit?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreateAPIKeyRequest {
  name: string;
  description?: string;
  permissions: string[];
  expiresAt?: string;
  usageLimit?: number;
}

export interface UpdateAPIKeyRequest {
  name?: string;
  description?: string;
  permissions?: string[];
  expiresAt?: string;
  usageLimit?: number;
}

export interface APIKeyListResponse {
  data: APIKey[];
  total: number;
  page: number;
  pageSize: number;
}

export interface APIKeyStatistics {
  total: number;
  active: number;
  expired: number;
  expiringSoon: number;
  totalUsage: number;
  averageUsage: number;
}

/**
 * API Key管理服务类
 */
export class APIKeyService {
  
  /**
   * 获取API Key列表
   */
  static async getAPIKeys(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
  }): Promise<APIKeyListResponse> {
    try {
      const response = await api.get('/api-keys', { params });

      // 为每个API Key添加安全掩码
      const processedData = (response as APIKey[]).map((apiKey: APIKey) => ({
        ...apiKey,
        maskedKey: APIKeySecurity.maskApiKey(apiKey.key)
      }));

      return {
        data: processedData,
        total: processedData.length,
        page: 1,
        pageSize: processedData.length
      };
    } catch (error) {
      console.error('Failed to load API keys:', error);
      throw error;
    }
  }

  /**
   * 获取单个API Key详情
   */
  static async getAPIKey(id: string): Promise<APIKey> {
    try {
      const response = await api.get(`/api-keys/${id}`);

      return {
        ...response,
        maskedKey: APIKeySecurity.maskApiKey((response as APIKey).key)
      };
    } catch (error) {
      console.error(`Failed to load API key ${id}:`, error);
      throw error;
    }
  }

  /**
   * 创建新的API Key
   */
  static async createAPIKey(data: CreateAPIKeyRequest): Promise<{
    apiKey: APIKey;
    plainKey: string;
  }> {
    try {
      // 验证权限组合
      const permissionValidation = PermissionValidator.validatePermissionCombination(data.permissions);
      if (!permissionValidation.valid && permissionValidation.warnings.length > 0) {
        console.warn('Permission validation warnings:', permissionValidation.warnings);
      }

      const response = await api.post('/api-keys', data);

      return {
        apiKey: {
          ...(response as any).apiKey,
          maskedKey: APIKeySecurity.maskApiKey((response as any).apiKey.key)
        },
        plainKey: (response as any).key
      };
    } catch (error) {
      console.error('Failed to create API key:', error);
      throw error;
    }
  }

  /**
   * 更新API Key
   */
  static async updateAPIKey(id: string, data: UpdateAPIKeyRequest): Promise<APIKey> {
    try {
      // 如果更新权限，验证权限组合
      if (data.permissions) {
        const permissionValidation = PermissionValidator.validatePermissionCombination(data.permissions);
        if (!permissionValidation.valid && permissionValidation.warnings.length > 0) {
          console.warn('Permission validation warnings:', permissionValidation.warnings);
        }
      }

      const response = await api.put(`/api-keys/${id}`, data);

      return {
        ...response,
        maskedKey: APIKeySecurity.maskApiKey((response as APIKey).key)
      };
    } catch (error) {
      console.error(`Failed to update API key ${id}:`, error);
      throw error;
    }
  }

  /**
   * 删除API Key
   */
  static async deleteAPIKey(id: string): Promise<void> {
    try {
      await api.delete(`/api-keys/${id}`);
    } catch (error) {
      console.error(`Failed to delete API key ${id}:`, error);
      throw error;
    }
  }

  /**
   * 切换API Key状态
   */
  static async toggleAPIKeyStatus(id: string, status: 'active' | 'inactive'): Promise<APIKey> {
    try {
      const response = await api.patch(`/api-keys/${id}/status`, { status });

      return {
        ...response,
        maskedKey: APIKeySecurity.maskApiKey((response as APIKey).key)
      };
    } catch (error) {
      console.error(`Failed to toggle API key status ${id}:`, error);
      throw error;
    }
  }

  /**
   * 重新生成API Key
   */
  static async regenerateAPIKey(id: string): Promise<{
    apiKey: APIKey;
    plainKey: string;
  }> {
    try {
      const response = await api.post(`/api-keys/${id}/regenerate`);

      return {
        apiKey: {
          ...(response as any).apiKey,
          maskedKey: APIKeySecurity.maskApiKey((response as any).apiKey.key)
        },
        plainKey: (response as any).key
      };
    } catch (error) {
      console.error(`Failed to regenerate API key ${id}:`, error);
      throw error;
    }
  }

  /**
   * 获取API Key统计信息
   */
  static async getAPIKeyStatistics(): Promise<APIKeyStatistics> {
    try {
      const response = await api.get('/api-keys/statistics');
      return response;
    } catch (error) {
      console.error('Failed to load API key statistics:', error);
      throw error;
    }
  }

  /**
   * 测试API Key是否有效
   */
  static async testAPIKey(id: string): Promise<{
    valid: boolean;
    message: string;
    lastTested: string;
  }> {
    try {
      const response = await api.post(`/api-keys/${id}/test`);
      return response;
    } catch (error) {
      console.error(`Failed to test API key ${id}:`, error);
      throw error;
    }
  }

  /**
   * 获取API Key使用日志
   */
  static async getAPIKeyUsageLogs(id: string, params?: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    logs: Array<{
      id: string;
      timestamp: string;
      method: string;
      endpoint: string;
      statusCode: number;
      responseTime: number;
      userAgent?: string;
      ip?: string;
    }>;
    total: number;
  }> {
    try {
      const response = await api.get(`/api-keys/${id}/usage-logs`, { params });
      return response;
    } catch (error) {
      console.error(`Failed to load usage logs for API key ${id}:`, error);
      throw error;
    }
  }

  /**
   * 批量操作API Keys
   */
  static async batchUpdateAPIKeys(ids: string[], operation: {
    type: 'activate' | 'deactivate' | 'delete';
    data?: any;
  }): Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    try {
      const response = await api.post('/api-keys/batch', {
        ids,
        operation
      });
      return response;
    } catch (error) {
      console.error('Failed to perform batch operation:', error);
      throw error;
    }
  }

  /**
   * 导出API Key配置（不包含密钥）
   */
  static async exportAPIKeyConfigs(ids?: string[]): Promise<Blob> {
    try {
      const response = await api.post('/api-keys/export', 
        { ids }, 
        { responseType: 'blob' }
      );
      return response;
    } catch (error) {
      console.error('Failed to export API key configs:', error);
      throw error;
    }
  }

  /**
   * 验证API Key数据
   */
  static validateAPIKeyData(data: CreateAPIKeyRequest | UpdateAPIKeyRequest): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证名称
    if ('name' in data && data.name) {
      if (data.name.length < 2) {
        errors.push('API Key名称至少需要2个字符');
      }
      if (data.name.length > 50) {
        errors.push('API Key名称不能超过50个字符');
      }
    }

    // 验证描述
    if (data.description && data.description.length > 200) {
      errors.push('描述不能超过200个字符');
    }

    // 验证权限
    if (data.permissions && data.permissions.length > 0) {
      const permissionValidation = PermissionValidator.validatePermissionCombination(data.permissions);
      if (!permissionValidation.valid) {
        warnings.push(...permissionValidation.warnings);
      }
      warnings.push(...permissionValidation.recommendations);
    }

    // 验证过期时间
    if (data.expiresAt) {
      const expiryDate = new Date(data.expiresAt);
      const now = new Date();
      
      if (expiryDate <= now) {
        errors.push('过期时间必须在当前时间之后');
      }
      
      const maxExpiryDate = new Date();
      maxExpiryDate.setFullYear(maxExpiryDate.getFullYear() + 5);
      
      if (expiryDate > maxExpiryDate) {
        warnings.push('API Key有效期超过5年，建议设置更短的有效期');
      }
    }

    // 验证使用限制
    if (data.usageLimit !== undefined) {
      if (data.usageLimit <= 0) {
        errors.push('使用次数限制必须大于0');
      }
      if (data.usageLimit > 1000000) {
        warnings.push('使用次数限制较高，请确认是否必要');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 生成API Key安全报告
   */
  static generateSecurityReport(apiKeys: APIKey[]): {
    overview: {
      total: number;
      active: number;
      expired: number;
      expiringSoon: number;
      withoutExpiry: number;
      withoutUsageLimit: number;
      highRiskPermissions: number;
    };
    recommendations: string[];
    issues: Array<{
      apiKeyId: string;
      apiKeyName: string;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      recommendation: string;
    }>;
  } {
    const overview = {
      total: apiKeys.length,
      active: apiKeys.filter(k => k.status === 'active').length,
      expired: apiKeys.filter(k => k.status === 'expired').length,
      expiringSoon: apiKeys.filter(k => {
        if (!k.expiresAt) return false;
        const expiry = new Date(k.expiresAt);
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return expiry <= weekFromNow && expiry > new Date();
      }).length,
      withoutExpiry: apiKeys.filter(k => !k.expiresAt).length,
      withoutUsageLimit: apiKeys.filter(k => !k.usageLimit).length,
      highRiskPermissions: apiKeys.filter(k => 
        k.permissions.some(p => PermissionValidator.getPermissionSecurityLevel(p) === 'high' || 
                               PermissionValidator.getPermissionSecurityLevel(p) === 'critical')
      ).length
    };

    const recommendations: string[] = [];
    const issues: Array<{
      apiKeyId: string;
      apiKeyName: string;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      recommendation: string;
    }> = [];

    // 生成全局建议
    if (overview.withoutExpiry > 0) {
      recommendations.push(`${overview.withoutExpiry} 个API Key没有设置过期时间，建议设置适当的有效期`);
    }

    if (overview.withoutUsageLimit > 0) {
      recommendations.push(`${overview.withoutUsageLimit} 个API Key没有使用次数限制，建议设置合理的限制`);
    }

    if (overview.highRiskPermissions > 0) {
      recommendations.push(`${overview.highRiskPermissions} 个API Key拥有高风险权限，请定期审查权限必要性`);
    }

    // 分析每个API Key的问题
    apiKeys.forEach(apiKey => {
      const securityRecommendations = APIKeySecurity.generateSecurityRecommendations(apiKey);
      
      securityRecommendations.forEach(rec => {
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        
        if (rec.includes('系统管理员') || rec.includes('高级权限')) {
          severity = 'high';
        } else if (rec.includes('过期') || rec.includes('达上限')) {
          severity = 'critical';
        } else if (rec.includes('轮换') || rec.includes('未使用')) {
          severity = 'low';
        }

        issues.push({
          apiKeyId: apiKey.id,
          apiKeyName: apiKey.name,
          issue: rec,
          severity,
          recommendation: rec
        });
      });
    });

    return {
      overview,
      recommendations,
      issues
    };
  }
}

export default APIKeyService;