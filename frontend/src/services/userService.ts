import api from './api';
import { User, UserProfileUpdateRequest, PasswordChangeRequest } from '../types/user';
import { APIResponse } from '../types/task';

export const userService = {
  // Get current user profile
  getProfile: async (): Promise<APIResponse<User>> => {
    const response: any = await api.get('/users/profile');
    
    // Handle wrapped APIResponse
    if (response && typeof response === 'object' && 'success' in response) {
      if (!response.success) {
        throw new Error(response.message || (response as any).error?.message || 'Failed to fetch user profile');
      }
      return response as APIResponse<User>;
    }

    // Axios-unwrapped: response is the actual User object
    const user = response as User;
    if (!user || typeof user !== 'object' || !('id' in user)) {
      throw new Error('Failed to fetch user profile');
    }
    return {
      success: true,
      data: user,
      message: 'Profile loaded',
      timestamp: new Date().toISOString(),
    } as APIResponse<User>;
  },

  // Update user profile
  updateProfile: async (data: UserProfileUpdateRequest): Promise<APIResponse<User>> => {
    const response: any = await api.put('/users/profile', data);
    
    if (response && typeof response === 'object' && 'success' in response) {
      if (!response.success) {
        throw new Error(response.message || (response as any).error?.message || 'Failed to update user profile');
      }
      return response as APIResponse<User>;
    }

    // Unwrapped case
    const user = response as User;
    if (!user || typeof user !== 'object' || !('id' in user)) {
      throw new Error('Failed to update user profile');
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
    const response: any = await api.put('/users/password', data);
    
    if (response && typeof response === 'object' && 'success' in response) {
      if (!response.success) {
        throw new Error(response.message || (response as any).error?.message || 'Failed to change password');
      }
      return response as APIResponse<null>;
    }

    // Unwrapped case: treat as success with no data
    return {
      success: true,
      data: null,
      message: 'Password changed',
      timestamp: new Date().toISOString(),
    } as APIResponse<null>;
  },
};
