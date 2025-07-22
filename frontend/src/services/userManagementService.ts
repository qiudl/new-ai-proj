import api from './api';
import { 
  User, 
  UserCreateRequest, 
  UserUpdateRequest, 
  UserListParams, 
  UserListResponse,
  PasswordResetRequest 
} from '../types/user';

export class UserManagementService {
  /**
   * 获取用户列表
   */
  static async getUserList(params: UserListParams = {}): Promise<UserListResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.page_size) queryParams.append('page_size', params.page_size.toString());
      if (params.role) queryParams.append('role', params.role);
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      
      const response = await api.get(`/admin/users?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user list:', error);
      throw new Error('Failed to fetch user list');
    }
  }

  /**
   * 获取用户详情
   */
  static async getUserById(id: number): Promise<User> {
    try {
      const response = await api.get(`/admin/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user details');
    }
  }

  /**
   * 创建用户
   */
  static async createUser(userData: UserCreateRequest): Promise<User> {
    try {
      const response = await api.post('/admin/users', userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * 更新用户信息
   */
  static async updateUser(id: number, userData: UserUpdateRequest): Promise<User> {
    try {
      const response = await api.put(`/admin/users/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * 删除用户（软删除）
   */
  static async deleteUser(id: number): Promise<void> {
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
  static async resetUserPassword(id: number, passwordData: PasswordResetRequest): Promise<void> {
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
  static async updateUserStatus(id: number, status: 'active' | 'inactive' | 'suspended'): Promise<User> {
    try {
      const response = await api.put(`/admin/users/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw new Error('Failed to update user status');
    }
  }

  /**
   * 批量操作用户
   */
  static async batchUpdateUsers(userIds: number[], action: 'activate' | 'suspend' | 'delete'): Promise<void> {
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
  static async getUserStats(): Promise<{
    total: number;
    by_role: Record<string, number>;
    by_status: Record<string, number>;
    recent_registrations: number;
  }> {
    try {
      const response = await api.get('/admin/users/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw new Error('Failed to fetch user statistics');
    }
  }

  /**
   * 导出用户数据
   */
  static async exportUsers(params: UserListParams = {}): Promise<Blob> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.role) queryParams.append('role', params.role);
      if (params.status) queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      
      const response = await api.get(`/admin/users/export?${queryParams.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting users:', error);
      throw new Error('Failed to export user data');
    }
  }
}