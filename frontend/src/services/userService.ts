import api from './api';
import { User, UserProfileUpdateRequest, PasswordChangeRequest } from '../types/user';
import { APIResponse } from '../types/task';

export const userService = {
  // Get current user profile
  getProfile: async (): Promise<APIResponse<User>> => {
    // Note: api.ts interceptor already unwraps the response from { success, data } to just data
    const user = await api.get('/users/profile') as User;

    // Validate the user object
    if (!user || typeof user !== 'object' || !('id' in user) || !('user_type' in user)) {
      throw new Error('Failed to fetch user profile: Invalid user data');
    }

    // Wrap it back into APIResponse format for consistency
    return {
      success: true,
      data: user,
      message: 'Profile loaded',
      timestamp: new Date().toISOString(),
    } as APIResponse<User>;
  },

  // Update user profile
  updateProfile: async (data: UserProfileUpdateRequest): Promise<APIResponse<User>> => {
    // Note: api.ts interceptor already unwraps the response
    const user = await api.put('/users/profile', data) as User;

    // Validate the user object
    if (!user || typeof user !== 'object' || !('id' in user)) {
      throw new Error('Failed to update user profile: Invalid user data');
    }

    return {
      success: true,
      data: user,
      message: 'Profile updated',
      timestamp: new Date().toISOString(),
    } as APIResponse<User>;
  },

  // Change password
  changePassword: async (data: PasswordChangeRequest): Promise<APIResponse<null>> => {
    // Note: api.ts interceptor already unwraps the response
    // For password change, the backend typically returns null or an empty object
    await api.put('/users/password', data);

    return {
      success: true,
      data: null,
      message: 'Password changed',
      timestamp: new Date().toISOString(),
    } as APIResponse<null>;
  },

  // Search users by username or email
  searchUsers: async (query: string, page: number = 1, pageSize: number = 20): Promise<{
    users: User[];
    total: number;
  }> => {
    try {
      const response = await api.get('/api/v1/system/users', {
        params: {
          search: query,
          page,
          page_size: pageSize,
        },
      });

      // Handle different response formats
      const data = response.data || response;

      return {
        users: data.users || data.data || [],
        total: data.total || 0,
      };
    } catch (error: any) {
      console.error('Failed to search users:', error);
      return {
        users: [],
        total: 0,
      };
    }
  },
};
