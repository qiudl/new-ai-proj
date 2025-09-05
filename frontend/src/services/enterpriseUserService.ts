import api from './api';

// 企业用户数据类型定义
export interface EnterpriseUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  department_id?: number;
  department_name?: string;
  role_id?: number;
  role_name?: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'pending' | 'locked';
  is_primary_contact: boolean;
  can_make_decisions: boolean;
  access_level: number;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  invitation_sent_at?: string;
  invitation_accepted_at?: string;
}

// 用户邀请数据类型
export interface UserInvitation {
  id: number;
  email: string;
  invited_by: string;
  role_name: string;
  department_name?: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  sent_at: string;
  expires_at: string;
}

// 用户活动日志类型
export interface UserActivity {
  id: number;
  user_name: string;
  action: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// 创建用户请求类型
export interface CreateUserRequest {
  name: string;
  email: string;
  phone?: string;
  position?: string;
  department_id?: number;
  role_id?: number;
  is_primary_contact?: boolean;
  can_make_decisions?: boolean;
  access_level?: number;
  status?: 'active' | 'inactive' | 'pending';
}

// 更新用户请求类型
export interface UpdateUserRequest extends Partial<CreateUserRequest> {}

// 邀请用户请求类型
export interface InviteUserRequest {
  email: string;
  role_id: number;
  department_id?: number;
  message?: string;
  expires_in_days?: number;
}

// 批量操作请求类型
export interface BatchUserOperationRequest {
  user_ids: number[];
  action: 'activate' | 'deactivate' | 'lock' | 'unlock' | 'delete';
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

class EnterpriseUserService {
  private readonly API_BASE_URL = '/organization/users';

  // 统一的 API 响应处理函数
  private handleApiResponse<T>(response: any): T {
    console.log('EnterpriseUserService API Response:', response);
    
    if (!response) {
      console.warn('API返回空响应，使用默认值');
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

    // 处理标准API响应格式 {success: true, data: ...}
    if (response.success && response.data !== undefined) {
      return response.data as T;
    }

    // 处理分页响应格式
    if (response.data && Array.isArray(response.data) && response.pagination) {
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

  // 获取企业用户列表
  async getUsers(page: number = 1, pageSize: number = 20, filters?: any): Promise<PaginatedResponse<EnterpriseUser>> {
    try {
      console.log('👥 获取企业用户列表，页码:', page, '每页大小:', pageSize, '筛选条件:', filters);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...filters
      });
      const response = await api.get(`${this.API_BASE_URL}?${params}`);
      const result = this.handleApiResponse<PaginatedResponse<EnterpriseUser>>(response.data);
      console.log('✅ 获取企业用户列表成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 获取企业用户列表失败:', error);
      throw error;
    }
  }

  // 获取单个用户详情
  async getUser(id: number): Promise<EnterpriseUser> {
    try {
      console.log('👤 获取用户详情，ID:', id);
      const response = await api.get(`${this.API_BASE_URL}/${id}`);
      const result = this.handleApiResponse<EnterpriseUser>(response.data);
      console.log('✅ 获取用户详情成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 获取用户详情失败:', error);
      throw error;
    }
  }

  // 创建用户
  async createUser(user: CreateUserRequest): Promise<EnterpriseUser> {
    try {
      console.log('👤 创建用户:', user);
      const response = await api.post(`${this.API_BASE_URL}`, user);
      const result = this.handleApiResponse<EnterpriseUser>(response.data);
      console.log('✅ 创建用户成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 创建用户失败:', error);
      throw error;
    }
  }

  // 更新用户
  async updateUser(id: number, user: UpdateUserRequest): Promise<EnterpriseUser> {
    try {
      console.log('👤 更新用户，ID:', id, '数据:', user);
      const response = await api.put(`${this.API_BASE_URL}/${id}`, user);
      const result = this.handleApiResponse<EnterpriseUser>(response.data);
      console.log('✅ 更新用户成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 更新用户失败:', error);
      throw error;
    }
  }

  // 删除用户
  async deleteUser(id: number): Promise<void> {
    try {
      console.log('👤 删除用户，ID:', id);
      await api.delete(`${this.API_BASE_URL}/${id}`);
      console.log('✅ 删除用户成功');
    } catch (error) {
      console.error('❌ 删除用户失败:', error);
      throw error;
    }
  }

  // 批量操作用户
  async batchUserOperation(request: BatchUserOperationRequest): Promise<void> {
    try {
      console.log('👥 批量操作用户:', request);
      await api.post(`${this.API_BASE_URL}/batch`, request);
      console.log('✅ 批量操作用户成功');
    } catch (error) {
      console.error('❌ 批量操作用户失败:', error);
      throw error;
    }
  }

  // 邀请用户
  async inviteUser(invitation: InviteUserRequest): Promise<UserInvitation> {
    try {
      console.log('📧 邀请用户:', invitation);
      const response = await api.post('/organization/invitations', invitation);
      const result = this.handleApiResponse<UserInvitation>(response.data);
      console.log('✅ 邀请用户成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 邀请用户失败:', error);
      throw error;
    }
  }

  // 获取用户邀请列表
  async getInvitations(): Promise<UserInvitation[]> {
    try {
      console.log('📧 获取用户邀请列表...');
      const response = await api.get('/organization/invitations');
      const result = this.handleApiResponse<UserInvitation[]>(response.data);
      console.log('✅ 获取用户邀请列表成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 获取用户邀请列表失败:', error);
      throw error;
    }
  }

  // 重新发送邀请
  async resendInvitation(invitationId: number): Promise<void> {
    try {
      console.log('📧 重新发送邀请，ID:', invitationId);
      await api.post(`/organization/invitations/${invitationId}/resend`);
      console.log('✅ 重新发送邀请成功');
    } catch (error) {
      console.error('❌ 重新发送邀请失败:', error);
      throw error;
    }
  }

  // 取消邀请
  async cancelInvitation(invitationId: number): Promise<void> {
    try {
      console.log('📧 取消邀请，ID:', invitationId);
      await api.delete(`/organization/invitations/${invitationId}`);
      console.log('✅ 取消邀请成功');
    } catch (error) {
      console.error('❌ 取消邀请失败:', error);
      throw error;
    }
  }

  // 获取用户活动日志
  async getUserActivities(userId?: number): Promise<UserActivity[]> {
    try {
      const url = userId 
        ? `/organization/activities?user_id=${userId}`
        : '/organization/activities';
      
      console.log('📝 获取用户活动日志，用户ID:', userId);
      const response = await api.get(url);
      const result = this.handleApiResponse<UserActivity[]>(response.data);
      console.log('✅ 获取用户活动日志成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 获取用户活动日志失败:', error);
      throw error;
    }
  }

  // 重置用户密码
  async resetUserPassword(userId: number): Promise<{ temporaryPassword: string }> {
    try {
      console.log('🔐 重置用户密码，用户ID:', userId);
      const response = await api.post(`${this.API_BASE_URL}/${userId}/reset-password`);
      const result = this.handleApiResponse<{ temporaryPassword: string }>(response.data);
      console.log('✅ 重置用户密码成功');
      return result;
    } catch (error) {
      console.error('❌ 重置用户密码失败:', error);
      throw error;
    }
  }

  // 锁定/解锁用户
  async toggleUserLock(userId: number, lock: boolean): Promise<void> {
    try {
      const action = lock ? 'lock' : 'unlock';
      console.log(`🔒 ${lock ? '锁定' : '解锁'}用户，用户ID:`, userId);
      await api.post(`${this.API_BASE_URL}/${userId}/${action}`);
      console.log(`✅ ${lock ? '锁定' : '解锁'}用户成功`);
    } catch (error) {
      console.error(`❌ ${lock ? '锁定' : '解锁'}用户失败:`, error);
      throw error;
    }
  }

  // 获取可用的角色列表
  async getAvailableRoles(): Promise<{id: number; name: string}[]> {
    try {
      console.log('🛡️ 获取可用角色列表...');
      const response = await api.get('/organization/roles/simple');
      const result = this.handleApiResponse<{id: number; name: string}[]>(response.data);
      console.log('✅ 获取可用角色列表成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 获取可用角色列表失败:', error);
      throw error;
    }
  }

  // 获取可用的部门列表
  async getAvailableDepartments(): Promise<{id: number; name: string}[]> {
    try {
      console.log('🏢 获取可用部门列表...');
      const response = await api.get('/organization/departments/simple');
      const result = this.handleApiResponse<{id: number; name: string}[]>(response.data);
      console.log('✅ 获取可用部门列表成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 获取可用部门列表失败:', error);
      throw error;
    }
  }

  // 获取用户统计信息
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    pendingUsers: number;
    lockedUsers: number;
    usersByDepartment: { department_name: string; user_count: number }[];
    usersByRole: { role_name: string; user_count: number }[];
    recentActivities: number;
  }> {
    try {
      console.log('📊 获取用户统计信息...');
      const response = await api.get(`${this.API_BASE_URL}/stats`);
      const result = this.handleApiResponse<{
        totalUsers: number;
        activeUsers: number;
        pendingUsers: number;
        lockedUsers: number;
        usersByDepartment: { department_name: string; user_count: number }[];
        usersByRole: { role_name: string; user_count: number }[];
        recentActivities: number;
      }>(response.data);
      console.log('✅ 获取用户统计信息成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 获取用户统计信息失败:', error);
      // 返回默认统计信息
      return {
        totalUsers: 0,
        activeUsers: 0,
        pendingUsers: 0,
        lockedUsers: 0,
        usersByDepartment: [],
        usersByRole: [],
        recentActivities: 0
      };
    }
  }

  // 导出用户数据
  async exportUsers(format: 'csv' | 'excel' = 'excel'): Promise<Blob> {
    try {
      console.log('📤 导出用户数据，格式:', format);
      const response = await api.get(`${this.API_BASE_URL}/export?format=${format}`, {
        responseType: 'blob'
      });
      console.log('✅ 导出用户数据成功');
      return response.data;
    } catch (error) {
      console.error('❌ 导出用户数据失败:', error);
      throw error;
    }
  }

  // 批量导入用户
  async importUsers(file: File): Promise<{
    success_count: number;
    error_count: number;
    errors: string[];
  }> {
    try {
      console.log('📥 批量导入用户，文件:', file.name);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(`${this.API_BASE_URL}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      const result = this.handleApiResponse<{
        success_count: number;
        error_count: number;
        errors: string[];
      }>(response.data);
      console.log('✅ 批量导入用户成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 批量导入用户失败:', error);
      throw error;
    }
  }
}

export default new EnterpriseUserService();