import api from './api';
import { User, UserProfileUpdateRequest, PasswordChangeRequest } from '../types/user';
import { APIResponse } from '../types/task';

export const userService = {
  // Get current user profile
  getProfile: async (): Promise<APIResponse<User>> => {
    const response: APIResponse<User> = await api.get('/users/profile');
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch user profile');
    }
    
    return response;
  },

  // Update user profile
  updateProfile: async (data: UserProfileUpdateRequest): Promise<APIResponse<User>> => {
    const response: APIResponse<User> = await api.put('/users/profile', data);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to update user profile');
    }
    
    return response;
  },

  // Change password
  changePassword: async (data: PasswordChangeRequest): Promise<APIResponse<null>> => {
    const response: APIResponse<null> = await api.put('/users/password', data);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to change password');
    }
    
    return response;
  },
};