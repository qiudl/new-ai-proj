/**
 * MCP API Key 管理服务
 * 用于管理 MCP (Model Context Protocol) 服务的 API Key
 */

import api from './api';

// MCP API Key 状态
export type MCPAPIKeyStatus = 'active' | 'revoked' | 'expired';

// 用户简要信息（包含在 API Key 响应中）
export interface MCPAPIKeyUser {
  id: number;
  username: string;
  email?: string;
  nickname?: string;
}

// 企业简要信息
export interface MCPAPIKeyEnterprise {
  id: number;
  name: string;
}

// MCP API Key 接口
export interface MCPAPIKey {
  id: number;
  key_id: string;
  key_prefix: string;
  user_id: number;
  enterprise_id?: number;
  name: string;
  description?: string;
  status: MCPAPIKeyStatus;
  permissions?: string[];
  expires_at?: string;
  last_used_at?: string;
  total_requests: number;
  total_errors?: number;  // 后端返回的是 total_errors
  error_requests?: number;  // 兼容旧字段
  created_at: string;
  updated_at: string;
  // 关联信息
  user?: MCPAPIKeyUser;
  enterprise?: MCPAPIKeyEnterprise;
}

// 创建 MCP API Key 请求
export interface CreateMCPAPIKeyRequest {
  name: string;
  description?: string;
  expires_at?: string;
  permissions?: string[];
}

// 创建 MCP API Key 响应
export interface CreateMCPAPIKeyResponse {
  id: number;
  key_id: string;
  plain_key: string;  // 明文密钥，仅在创建时返回
  name: string;
  description?: string;
  status: MCPAPIKeyStatus;
  expires_at?: string;
  created_at: string;
}

// 更新 MCP API Key 请求
export interface UpdateMCPAPIKeyRequest {
  name?: string;
  description?: string;
  expires_at?: string;
}

// 列表查询参数
export interface ListMCPAPIKeysParams {
  page?: number;
  limit?: number;
  status?: MCPAPIKeyStatus;
  include_revoked?: boolean;
  all?: boolean;        // 管理员查看所有用户的 Keys
  user_id?: number;     // 按用户 ID 过滤（仅管理员可用）
}

// 列表响应
export interface ListMCPAPIKeysResponse {
  data: MCPAPIKey[];
  total: number;
  page: number;
  limit: number;
  is_admin?: boolean;   // 当前用户是否是管理员
}

// API Key 统计
export interface MCPAPIKeyStats {
  total_requests: number;
  total_errors: number;
  success_rate: number;
  avg_duration_ms: number;
  tools_usage?: MCPToolUsageStat[];
  daily_requests?: MCPDailyRequestStat[];
}

export interface MCPToolUsageStat {
  tool_name: string;
  count: number;
}

export interface MCPDailyRequestStat {
  date: string;
  requests: number;
  errors: number;
}

// API Key 调用日志
export interface MCPAPIKeyLog {
  id: number;
  api_key_id: number;
  request_id: string;
  tool_name: string;
  response_status: 'success' | 'error' | 'timeout';
  response_error?: string;
  duration_ms: number;
  client_ip?: string;
  user_agent?: string;
  created_at: string;
}

export interface ListMCPAPIKeyLogsResponse {
  data: MCPAPIKeyLog[];
  total: number;
  page: number;
  limit: number;
}

/**
 * MCP API Key 管理服务
 */
export class MCPAPIKeyService {
  private static basePath = '/mcp/keys';

  /**
   * 获取当前用户的 MCP API Key 列表
   * 管理员可通过 params.all=true 查看所有用户的 Keys
   */
  static async listAPIKeys(params?: ListMCPAPIKeysParams): Promise<ListMCPAPIKeysResponse> {
    try {
      const response = await api.get(this.basePath, { params });
      // 后端响应格式: { success: true, data: { keys, total, page, limit }, is_admin: boolean }
      const result = response.data || response;
      // 适配后端响应格式，将 keys 映射为 data
      if (result && result.keys !== undefined) {
        return {
          data: result.keys,
          total: result.total,
          page: result.page,
          limit: result.limit,
          is_admin: (response as any).is_admin,
        };
      }
      // 兼容直接返回格式
      return {
        ...result,
        is_admin: (response as any).is_admin,
      };
    } catch (error) {
      console.error('Failed to list MCP API keys:', error);
      throw error;
    }
  }

  /**
   * 创建新的 MCP API Key
   */
  static async createAPIKey(data: CreateMCPAPIKeyRequest): Promise<CreateMCPAPIKeyResponse> {
    try {
      const response = await api.post(this.basePath, data);
      return response.data || response;
    } catch (error) {
      console.error('Failed to create MCP API key:', error);
      throw error;
    }
  }

  /**
   * 获取单个 MCP API Key 详情
   */
  static async getAPIKey(keyId: string): Promise<MCPAPIKey> {
    try {
      const response = await api.get(`${this.basePath}/${keyId}`);
      return response.data || response;
    } catch (error) {
      console.error(`Failed to get MCP API key ${keyId}:`, error);
      throw error;
    }
  }

  /**
   * 更新 MCP API Key
   */
  static async updateAPIKey(keyId: string, data: UpdateMCPAPIKeyRequest): Promise<MCPAPIKey> {
    try {
      const response = await api.put(`${this.basePath}/${keyId}`, data);
      return response.data || response;
    } catch (error) {
      console.error(`Failed to update MCP API key ${keyId}:`, error);
      throw error;
    }
  }

  /**
   * 撤销 MCP API Key
   */
  static async revokeAPIKey(keyId: string): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${keyId}`);
    } catch (error) {
      console.error(`Failed to revoke MCP API key ${keyId}:`, error);
      throw error;
    }
  }

  /**
   * 获取 MCP API Key 使用统计
   */
  static async getAPIKeyStats(keyId: string): Promise<MCPAPIKeyStats> {
    try {
      const response = await api.get(`${this.basePath}/${keyId}/stats`);
      return response.data || response;
    } catch (error) {
      console.error(`Failed to get MCP API key stats ${keyId}:`, error);
      throw error;
    }
  }

  /**
   * 获取 MCP API Key 调用日志
   */
  static async getAPIKeyLogs(keyId: string, params?: {
    page?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<ListMCPAPIKeyLogsResponse> {
    try {
      const response = await api.get(`${this.basePath}/${keyId}/logs`, { params });
      return response.data || response;
    } catch (error) {
      console.error(`Failed to get MCP API key logs ${keyId}:`, error);
      throw error;
    }
  }

  /**
   * 检查 MCP 服务健康状态
   */
  static async checkHealth(): Promise<{
    success: boolean;
    message: string;
    data: {
      service: string;
      version: string;
      protocol: string;
      transport: string;
      endpoints: {
        sse: string;
        keys: string;
        health: string;
      };
    };
  }> {
    try {
      const response = await api.get('/mcp/health');
      return response.data || response;
    } catch (error) {
      console.error('Failed to check MCP health:', error);
      throw error;
    }
  }

  /**
   * 格式化 API Key 显示（只显示前缀）
   */
  static formatKeyDisplay(keyPrefix: string): string {
    return `${keyPrefix}...`;
  }

  /**
   * 计算成功率
   */
  static calculateSuccessRate(totalRequests: number, errorRequests: number): number {
    if (totalRequests === 0) return 100;
    return Math.round(((totalRequests - errorRequests) / totalRequests) * 100 * 100) / 100;
  }
}

export default MCPAPIKeyService;
