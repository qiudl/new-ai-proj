import api from './api';
import {
  CompanyUserCreateRequest,
  CompanyUserCreateResponse,
  CompanyUserUpdateRequest,
  CompanyUserStatusUpdateRequest,
  CompanyUserListParams,
  CompanyUserListResponse,
  CompanyUserStats,
  BatchCompanyUserRequest,
  EnterpriseUserResponse,
  User,
} from '../types/user';
import { APIResponse } from '../types/api';

// Company User Management Service
export class CompanyUserService {
  private static readonly BASE_PATH = '/admin/company-users';

  /**
   * Create a new company user
   */
  static async createCompanyUser(
    data: CompanyUserCreateRequest
  ): Promise<CompanyUserCreateResponse> {
    const response = await api.post<APIResponse<CompanyUserCreateResponse>>(
      this.BASE_PATH,
      data
    );
    return response.data;
  }

  /**
   * Get company users list with pagination and filtering
   */
  static async getCompanyUserList(
    params: CompanyUserListParams = {}
  ): Promise<CompanyUserListResponse> {
    const {
      page = 1,
      page_size = 20,
      company_id,
      status,
      search,
    } = params;

    const queryParams = new URLSearchParams({
      page: page.toString(),
      page_size: page_size.toString(),
    });

    if (company_id) {
      queryParams.append('company_id', company_id.toString());
    }
    if (status) {
      queryParams.append('status', status);
    }
    if (search) {
      queryParams.append('search', search);
    }

    const response = await api.get<APIResponse<CompanyUserListResponse>>(
      `${this.BASE_PATH}?${queryParams.toString()}`
    );
    return response.data;
  }

  /**
   * Get a company user by ID
   */
  static async getCompanyUser(id: number): Promise<EnterpriseUserResponse> {
    const response = await api.get<APIResponse<EnterpriseUserResponse>>(
      `${this.BASE_PATH}/${id}`
    );
    return response.data;
  }

  /**
   * Update a company user
   */
  static async updateCompanyUser(
    id: number,
    data: CompanyUserUpdateRequest
  ): Promise<User> {
    const response = await api.put<APIResponse<User>>(
      `${this.BASE_PATH}/${id}`,
      data
    );
    return response.data;
  }

  /**
   * Update company user status
   */
  static async updateCompanyUserStatus(
    id: number,
    data: CompanyUserStatusUpdateRequest
  ): Promise<User> {
    const response = await api.put<APIResponse<User>>(
      `${this.BASE_PATH}/${id}/status`,
      data
    );
    return response.data;
  }

  /**
   * Delete (soft delete) a company user
   */
  static async deleteCompanyUser(id: number): Promise<void> {
    await api.delete(`${this.BASE_PATH}/${id}`);
  }

  /**
   * Batch update company users
   */
  static async batchUpdateCompanyUsers(
    data: BatchCompanyUserRequest
  ): Promise<void> {
    await api.post(`${this.BASE_PATH}/batch`, data);
  }

  /**
   * Get company user statistics
   */
  static async getCompanyUserStats(): Promise<CompanyUserStats> {
    const response = await api.get<APIResponse<CompanyUserStats>>(
      `${this.BASE_PATH}/stats`
    );
    return response.data;
  }

  /**
   * Activate multiple company users
   */
  static async activateUsers(userIds: number[]): Promise<void> {
    return this.batchUpdateCompanyUsers({
      user_ids: userIds,
      action: 'activate',
    });
  }

  /**
   * Deactivate multiple company users
   */
  static async deactivateUsers(userIds: number[]): Promise<void> {
    return this.batchUpdateCompanyUsers({
      user_ids: userIds,
      action: 'deactivate',
    });
  }

  /**
   * Extend expiry for multiple company users
   */
  static async extendUsersExpiry(userIds: number[]): Promise<void> {
    return this.batchUpdateCompanyUsers({
      user_ids: userIds,
      action: 'extend_expiry',
    });
  }

  /**
   * Check if user account is expired
   */
  static isAccountExpired(user: EnterpriseUserResponse): boolean {
    if (!user.account_expires_at) return false;
    return new Date(user.account_expires_at) < new Date();
  }

  /**
   * Check if user account is expiring soon (within 30 days)
   */
  static isAccountExpiringSoon(user: EnterpriseUserResponse, days: number = 30): boolean {
    if (!user.account_expires_at) return false;
    const expiryDate = new Date(user.account_expires_at);
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + days);
    return expiryDate <= warningDate && expiryDate >= new Date();
  }

  /**
   * Get user status badge configuration
   */
  static getStatusConfig(status: string) {
    const configs = {
      active: { text: '正常', color: 'success' },
      inactive: { text: '停用', color: 'default' },
    };
    return configs[status as keyof typeof configs] || { text: status, color: 'default' };
  }

  /**
   * Get user role badge configuration
   */
  static getRoleConfig(isPrimaryContact: boolean) {
    return isPrimaryContact
      ? { text: '主要联系人', color: 'blue' }
      : { text: '普通用户', color: 'default' };
  }

  /**
   * Format last login time
   */
  static formatLastLogin(lastLoginAt?: string): string {
    if (!lastLoginAt) return '从未登录';
    
    const now = new Date();
    const loginTime = new Date(lastLoginAt);
    const diffTime = Math.abs(now.getTime() - loginTime.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)}周前`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)}个月前`;
    
    return `${Math.ceil(diffDays / 365)}年前`;
  }

  /**
   * Validate company user form data
   */
  static validateCompanyUserData(data: Partial<CompanyUserCreateRequest>): string[] {
    const errors: string[] = [];

    if (!data.company_id) {
      errors.push('请选择企业');
    }

    if (!data.username || data.username.trim().length < 3) {
      errors.push('用户名不能少于3个字符');
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('请输入有效的邮箱地址');
    }

    if (!data.contact_person_name || data.contact_person_name.trim().length === 0) {
      errors.push('请输入联系人姓名');
    }

    if (!data.contact_phone || !/^1[3-9]\d{9}$/.test(data.contact_phone)) {
      errors.push('请输入有效的手机号码');
    }

    if (!data.department_title || data.department_title.trim().length === 0) {
      errors.push('请输入职务/部门');
    }

    return errors;
  }

  /**
   * Generate user display name
   */
  static getDisplayName(user: EnterpriseUserResponse): string {
    return user.contact_person_name || user.username;
  }

  /**
   * Check if user can be deleted (business rules)
   */
  static canDeleteUser(user: EnterpriseUserResponse): boolean {
    // Primary contacts cannot be deleted if they are the only contact for the company
    // This would need additional API call to check, for now just return true
    return user.status === 'inactive';
  }
}

export default CompanyUserService;