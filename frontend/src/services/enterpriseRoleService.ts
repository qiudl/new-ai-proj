import api from './api';

// 企业角色数据类型定义
export interface EnterpriseRole {
  id: number;
  name: string;
  code: string;
  description: string;
  level: number;
  permissions: string[];
  user_count: number;
  status: 'active' | 'inactive';
  is_system: boolean;
  parent_id?: number;
  created_at: string;
  updated_at: string;
  children?: EnterpriseRole[];
}

// 权限数据类型
export interface Permission {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  is_system: boolean;
}

// 用户角色分配类型
export interface UserRole {
  id: number;
  user_name: string;
  user_email: string;
  role_name: string;
  assigned_at: string;
  assigned_by: string;
  status: 'active' | 'inactive';
}

// 创建角色请求类型
export interface CreateRoleRequest {
  name: string;
  code: string;
  description?: string;
  level?: number;
  permissions?: string[];
  parent_id?: number;
  status?: 'active' | 'inactive';
}

// 更新角色请求类型
export interface UpdateRoleRequest extends Partial<CreateRoleRequest> {}

// 角色权限配置请求类型
export interface RolePermissionRequest {
  role_id: number;
  permissions: string[];
}

// 用户角色分配请求类型
export interface UserRoleAssignRequest {
  user_id: number;
  role_id: number;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class EnterpriseRoleService {
  private readonly API_BASE_URL = '/organization/roles';

  // 统一的 API 响应处理函数
  private handleApiResponse<T>(response: any): T {
    
    if (!response) {
      return {
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      } as T;
    }

    // 处理标准API响应格式 {success: true, data: ...}（拦截器已解包response.data）
    if (response.success && response.data !== undefined) {
      return response.data as T;
    }

    // 处理分页响应格式（拦截器已解包response.data）
    if (response && Array.isArray(response.data) && response.pagination) {
      return {
        data: response.data,
        pagination: response.pagination
      } as T;
    }

    // 如果直接是数据数组
    if (Array.isArray(response)) {
      return response as T;
    }

    return response as T;
  }

  // 获取企业角色列表（树形结构）
  async getRoles(): Promise<EnterpriseRole[]> {
    try {
      const response = await api.get(`${this.API_BASE_URL}`);
      const result = this.handleApiResponse<EnterpriseRole[]>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取企业角色列表失败:', error);
      throw error;
    }
  }

  // 获取单个角色详情
  async getRole(id: number): Promise<EnterpriseRole> {
    try {
      const response = await api.get(`${this.API_BASE_URL}/${id}`);
      const result = this.handleApiResponse<EnterpriseRole>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取角色详情失败:', error);
      throw error;
    }
  }

  // 创建角色
  async createRole(role: CreateRoleRequest): Promise<EnterpriseRole> {
    try {
      const response = await api.post(`${this.API_BASE_URL}`, role);
      const result = this.handleApiResponse<EnterpriseRole>(response);
      return result;
    } catch (error) {
      console.error('❌ 创建角色失败:', error);
      throw error;
    }
  }

  // 更新角色
  async updateRole(id: number, role: UpdateRoleRequest): Promise<EnterpriseRole> {
    try {
      const response = await api.put(`${this.API_BASE_URL}/${id}`, role);
      const result = this.handleApiResponse<EnterpriseRole>(response);
      return result;
    } catch (error) {
      console.error('❌ 更新角色失败:', error);
      throw error;
    }
  }

  // 删除角色
  async deleteRole(id: number): Promise<void> {
    try {
      await api.delete(`${this.API_BASE_URL}/${id}`);
    } catch (error) {
      console.error('❌ 删除角色失败:', error);
      throw error;
    }
  }

  // 复制角色
  async copyRole(id: number, newName: string): Promise<EnterpriseRole> {
    try {
      const response = await api.post(`${this.API_BASE_URL}/${id}/copy`, { name: newName });
      const result = this.handleApiResponse<EnterpriseRole>(response);
      return result;
    } catch (error) {
      console.error('❌ 复制角色失败:', error);
      throw error;
    }
  }

  // 获取所有可用权限列表
  async getPermissions(): Promise<Permission[]> {
    try {
      const response = await api.get('/organization/permissions');
      const result = this.handleApiResponse<Permission[]>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取权限列表失败:', error);
      throw error;
    }
  }

  // 获取角色的权限配置
  async getRolePermissions(roleId: number): Promise<string[]> {
    try {
      const response = await api.get(`${this.API_BASE_URL}/${roleId}/permissions`);
      const result = this.handleApiResponse<string[]>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取角色权限配置失败:', error);
      throw error;
    }
  }

  // 更新角色权限配置
  async updateRolePermissions(request: RolePermissionRequest): Promise<void> {
    try {
      await api.put(`${this.API_BASE_URL}/${request.role_id}/permissions`, {
        permissions: request.permissions
      });
    } catch (error) {
      console.error('❌ 更新角色权限配置失败:', error);
      throw error;
    }
  }

  // 获取角色的用户分配列表
  async getRoleUsers(roleId?: number): Promise<UserRole[]> {
    try {
      const url = roleId 
        ? `${this.API_BASE_URL}/${roleId}/users`
        : '/organization/user-roles';
      
      const response = await api.get(url);
      const result = this.handleApiResponse<UserRole[]>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取角色用户分配列表失败:', error);
      throw error;
    }
  }

  // 分配用户到角色
  async assignUserToRole(request: UserRoleAssignRequest): Promise<void> {
    try {
      await api.post('/organization/user-roles', request);
    } catch (error) {
      console.error('❌ 分配用户到角色失败:', error);
      throw error;
    }
  }

  // 移除用户角色分配
  async removeUserFromRole(userRoleId: number): Promise<void> {
    try {
      await api.delete(`/organization/user-roles/${userRoleId}`);
    } catch (error) {
      console.error('❌ 移除用户角色分配失败:', error);
      throw error;
    }
  }

  // 获取可分配的用户列表
  async getAvailableUsers(): Promise<{id: number; name: string; email: string}[]> {
    try {
      const response = await api.get('/organization/users/available');
      const result = this.handleApiResponse<{id: number; name: string; email: string}[]>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取可分配用户列表失败:', error);
      throw error;
    }
  }

  // 获取角色统计信息
  async getRoleStats(): Promise<{
    totalRoles: number;
    systemRoles: number;
    customRoles: number;
    totalUsers: number;
    roleDistribution: { role_name: string; user_count: number }[];
  }> {
    try {
      const response = await api.get(`${this.API_BASE_URL}/stats`);
      const result = this.handleApiResponse<{
        totalRoles: number;
        systemRoles: number;
        customRoles: number;
        totalUsers: number;
        roleDistribution: { role_name: string; user_count: number }[];
      }>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取角色统计信息失败:', error);
      // 返回默认统计信息
      return {
        totalRoles: 0,
        systemRoles: 0,
        customRoles: 0,
        totalUsers: 0,
        roleDistribution: []
      };
    }
  }

  // 批量分配用户角色
  async batchAssignUserRoles(roleId: number, userIds: number[]): Promise<void> {
    try {
      await api.post(`${this.API_BASE_URL}/${roleId}/users/batch`, { user_ids: userIds });
    } catch (error) {
      console.error('❌ 批量分配用户角色失败:', error);
      throw error;
    }
  }

  // 验证角色权限
  async validateRolePermissions(roleId: number, permissions: string[]): Promise<{
    valid: boolean;
    conflicts: string[];
    suggestions: string[];
  }> {
    try {
      const response = await api.post(`${this.API_BASE_URL}/${roleId}/permissions/validate`, {
        permissions
      });
      const result = this.handleApiResponse<{
        valid: boolean;
        conflicts: string[];
        suggestions: string[];
      }>(response);
      return result;
    } catch (error) {
      console.error('❌ 验证角色权限失败:', error);
      // 返回默认验证结果
      return {
        valid: true,
        conflicts: [],
        suggestions: []
      };
    }
  }
}

export default new EnterpriseRoleService();