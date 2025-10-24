import api from './api';
import { 
  User, 
  UserCreateRequest, 
  UserUpdateRequest, 
  UserListParams, 
  UserListResponse,
  PasswordResetRequest 
} from '../types/user';

class UserManagementService {
  /**
   * 获取用户列表
   */
  async getUserList(params: UserListParams = {}): Promise<UserListResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.page_size) queryParams.append('page_size', params.page_size.toString());
      if (params.user_type) queryParams.append('user_type', params.user_type);
      if (params.role) queryParams.append('role', params.role);
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      if (params.company_id) queryParams.append('company_id', params.company_id.toString());
      if (params.enterprise_ids && params.enterprise_ids.length > 0) {
        queryParams.append('enterprise_ids', params.enterprise_ids.join(','));
      }
      
      const response = await api.get(`/admin/users?${queryParams.toString()}`);
      const data = (response as any).data || [];
      
      // Filter out invalid users with missing IDs
      const validData = data.filter((user: any) => user && user.id && typeof user.id === 'number');
      
      return {
        data: validData,
        total: (response as any).total || 0,
        page: (response as any).page || params.page || 1,
        page_size: (response as any).page_size || params.page_size || 10
      };
    } catch (error) {
      console.error('Error fetching user list:', error);
      throw new Error('Failed to fetch user list');
    }
  }

  /**
   * 获取用户详情
   */
  async getUserById(id: number): Promise<{ data: User }> {
    try {
      const response = await api.get(`/admin/users/${id}`);
      return { data: response };
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user details');
    }
  }

  /**
   * 创建用户
   */
  async createUser(userData: UserCreateRequest): Promise<User> {
    try {
      const response = await api.post('/admin/users', userData);
      return response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(id: number, userData: UserUpdateRequest): Promise<User> {
    try {
      const response = await api.put(`/admin/users/${id}`, userData);
      return response;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * 删除用户（软删除）
   */
  async deleteUser(id: number): Promise<void> {
    try {
      await api.delete(`/admin/users/${id}`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * 重置用户密码
   */
  async resetUserPassword(id: number, passwordData: PasswordResetRequest): Promise<void> {
    try {
      await api.post(`/admin/users/${id}/reset-password`, passwordData);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw new Error('Failed to reset password');
    }
  }

  /**
   * 更新用户状态
   */
  async updateUserStatus(id: number, status: 'active' | 'inactive' | 'suspended'): Promise<User> {
    try {
      // Validate user ID
      if (!id || typeof id !== 'number' || id <= 0) {
        throw new Error('Invalid user ID');
      }
      
      const response = await api.put(`/admin/users/${id}/status`, { status });
      return response;
    } catch (error) {
      console.error('Error updating user status:', error);
      if (error instanceof Error && error.message.includes('404')) {
        throw new Error('User not found or has been deleted');
      }
      throw new Error('Failed to update user status');
    }
  }

  /**
   * 批量操作用户
   */
  async batchUpdateUsers(userIds: number[], action: 'activate' | 'suspend' | 'delete'): Promise<void> {
    try {
      await api.post('/admin/users/batch', {
        user_ids: userIds,
        action
      });
    } catch (error) {
      console.error('Error in batch operation:', error);
      throw new Error('Failed to perform batch operation');
    }
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(): Promise<{
    total: number;
    by_role: Record<string, number>;
    by_status: Record<string, number>;
    recent_registrations: number;
  }> {
    try {
      const response = await api.get('/admin/users/stats');
      
      // API拦截器应该已经解包了标准的{success, data, message}格式
      // 所以response应该直接是统计数据
      return response as any;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw new Error('Failed to fetch user statistics');
    }
  }

  /**
   * 导出用户数据
   */
  async exportUsers(params: UserListParams = {}): Promise<Blob> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.user_type) queryParams.append('user_type', params.user_type);
      if (params.role) queryParams.append('role', params.role);
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      if (params.company_id) queryParams.append('company_id', params.company_id.toString());
      if (params.enterprise_ids && params.enterprise_ids.length > 0) {
        queryParams.append('enterprise_ids', params.enterprise_ids.join(','));
      }
      
      const response = await api.get(`/admin/users/export?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error exporting users:', error);
      throw new Error('Failed to export user data');
    }
  }

  /**
   * 获取用户参与的项目列表
   */
  async getUserProjects(userId: number): Promise<{
    data: Array<{
      id: number;
      name: string;
      role: string;
      status: string;
      last_access?: string;
    }>
  }> {
    try {
      const response = await api.get(`/admin/users/${userId}/projects`);
      return { data: response || [] };
    } catch (error) {
      console.error('Error fetching user projects:', error);
      // 返回空数据而不是抛出错误，以便页面能正常显示
      return { data: [] };
    }
  }

  /**
   * 获取用户活动日志
   */
  async getUserActivityLog(userId: number, params: { page?: number; page_size?: number } = {}): Promise<{
    data: Array<{
      id: string;
      action: string;
      description: string;
      ip_address?: string;
      created_at: string;
    }>;
    total: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.page_size) queryParams.append('page_size', params.page_size.toString());
      
      const response = await api.get(`/admin/users/${userId}/activity?${queryParams.toString()}`);
      return {
        data: response || [],
        total: response.total || 0
      };
    } catch (error) {
      console.error('Error fetching user activity log:', error);
      // 返回空数据而不是抛出错误，以便页面能正常显示
      return { data: [], total: 0 };
    }
  }
}

export const userManagementService = new UserManagementService();
export default userManagementService;