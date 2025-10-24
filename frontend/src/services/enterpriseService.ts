import api from './api';

// Enterprise data types based on backend models
export interface Enterprise {
  id: number;
  name: string;
  code: string;
  description?: string;
  industry_type?: string;
  industry_type_text?: string;
  business_type: 'individual' | 'partnership' | 'corporation' | 'llc';
  business_type_text: string;
  registration_number?: string;
  tax_id?: string;
  legal_representative?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  website?: string;
  status: 'active' | 'inactive' | 'suspended';
  status_text: string;
  user_count?: number;
  department_count?: number;
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

// Enterprise User data types
export interface EnterpriseUser {
  id: number;
  enterprise_id: number;
  username: string;
  email?: string;
  name: string;
  phone?: string;
  position?: string;
  department_id?: number;
  department_name?: string;
  is_primary_contact: boolean;
  access_level: number;
  status: 'active' | 'inactive' | 'suspended';
  status_text: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// Enterprise Department data types
export interface EnterpriseDepartment {
  id: number;
  enterprise_id: number;
  name: string;
  code?: string;
  description?: string;
  parent_id?: number;
  parent_name?: string;
  level: number;
  path?: string;
  status: 'active' | 'inactive';
  status_text: string;
  user_count: number;
  created_at: string;
  updated_at: string;
}

// Request types
export interface EnterpriseRequest {
  name: string;
  code: string;
  description?: string;
  industry_type?: string;
  business_type: 'individual' | 'partnership' | 'corporation' | 'llc';
  registration_number?: string;
  tax_id?: string;
  legal_representative?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  website?: string;
  status: 'active' | 'inactive' | 'suspended';
}

export interface EnterpriseUpdateRequest {
  name?: string;
  code?: string;
  description?: string;
  industry_type?: string;
  business_type?: 'individual' | 'partnership' | 'corporation' | 'llc';
  registration_number?: string;
  tax_id?: string;
  legal_representative?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  website?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface EnterpriseUserRequest {
  username: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department_id?: number;
  is_primary_contact?: boolean;
  access_level?: number;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface EnterpriseUserUpdateRequest {
  enterprise_id?: number;
  username: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  department_id?: number;
  is_primary_contact?: boolean;
  access_level: number;
  status: 'active' | 'inactive' | 'archived';
}

export interface EnterpriseDepartmentRequest {
  name: string;
  code?: string;
  description?: string;
  parent_id?: number;
  status?: 'active' | 'inactive';
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface EnterpriseStats {
  total_enterprises: number;
  active_enterprises: number;
  inactive_enterprises: number;
  suspended_enterprises: number;
  total_users: number;
  total_departments: number;
  enterprises_by_business_type: Array<{
    business_type: string;
    count: number;
  }>;
  enterprises_by_industry: Array<{
    industry_type: string;
    count: number;
  }>;
}

class EnterpriseService {
  private readonly API_BASE_URL = '/enterprises';

  // 统一的 API 响应处理函数
  private handleApiResponse<T>(response: any): T {
    
    if (!response) {
      return {
        data: [],
        pagination: {
          page: 1,
          page_size: 20,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false
        }
      } as T;
    }

    // 新增：如果响应本身就是数组（拦截器已解包为数组），包装为统一的分页结构
    if (Array.isArray(response)) {
      return {
        data: response,
        pagination: {
          page: 1,
          page_size: response.length,
          total: response.length,
          total_pages: 1,
          has_next: false,
          has_prev: false
        }
      } as T;
    }

    // 处理嵌套的 data 响应格式（拦截器已解包response.data，所以原来的data.data变成了data）
    if (response && typeof response === 'object' && Array.isArray(response.data)) {
      return {
        data: response.data,
        pagination: response.pagination
      } as T;
    }

    // 处理API返回的 { data: [] } 直接数组格式（拦截器已解包）
    // 这种情况在上面的条件中已处理，这里保留作为后备

    // 直接返回响应数据，API拦截器已经处理了标准响应格式
    return response as T;
  }

  // 获取企业列表
  async getEnterprises(page: number = 1, pageSize: number = 20, filters?: any): Promise<PaginatedResponse<Enterprise>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...filters
      });
      const response = await api.get(`${this.API_BASE_URL}?${params}`);
      const result = this.handleApiResponse<PaginatedResponse<Enterprise>>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取企业列表失败:', error);
      throw error;
    }
  }

  // 获取单个企业详情
  async getEnterprise(id: number): Promise<Enterprise> {
    try {
      const response = await api.get(`${this.API_BASE_URL}/${id}`);
      const result = this.handleApiResponse<Enterprise>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取企业详情失败:', error);
      throw error;
    }
  }

  // 创建企业
  async createEnterprise(enterprise: EnterpriseRequest): Promise<Enterprise> {
    try {
      const response = await api.post(this.API_BASE_URL, enterprise);
      const result = this.handleApiResponse<Enterprise>(response);
      return result;
    } catch (error) {
      console.error('❌ 创建企业失败:', error);
      throw error;
    }
  }

  // 更新企业
  async updateEnterprise(id: number, enterprise: EnterpriseUpdateRequest): Promise<Enterprise> {
    try {
      const response = await api.put(`${this.API_BASE_URL}/${id}`, enterprise);
      const result = this.handleApiResponse<Enterprise>(response);
      return result;
    } catch (error) {
      console.error('❌ 更新企业失败:', error);
      throw error;
    }
  }

  // 删除企业
  async deleteEnterprise(id: number): Promise<void> {
    try {
      await api.delete(`${this.API_BASE_URL}/${id}`);
    } catch (error) {
      console.error('❌ 删除企业失败:', error);
      throw error;
    }
  }

  // 获取企业统计信息
  async getEnterpriseStats(): Promise<EnterpriseStats> {
    try {
      const response = await api.get(`${this.API_BASE_URL}/stats`);
      const result = this.handleApiResponse<EnterpriseStats>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取企业统计信息失败:', error);
      // 返回默认统计信息
      return {
        total_enterprises: 0,
        active_enterprises: 0,
        inactive_enterprises: 0,
        suspended_enterprises: 0,
        total_users: 0,
        total_departments: 0,
        enterprises_by_business_type: [],
        enterprises_by_industry: []
      };
    }
  }

  // 获取企业用户列表
  async getEnterpriseUsers(enterpriseId: number, page: number = 1, pageSize: number = 20, filters?: any): Promise<PaginatedResponse<EnterpriseUser>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...filters
      });
      const response = await api.get(`${this.API_BASE_URL}/${enterpriseId}/users?${params}`);
      const result = this.handleApiResponse<PaginatedResponse<EnterpriseUser>>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取企业用户列表失败:', error);
      throw error;
    }
  }

  // 获取单个企业用户详情
  async getEnterpriseUser(enterpriseId: number, userId: number): Promise<EnterpriseUser> {
    try {
      const response = await api.get(`${this.API_BASE_URL}/${enterpriseId}/users/${userId}`);
      const result = this.handleApiResponse<EnterpriseUser>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取企业用户详情失败:', error);
      throw error;
    }
  }

  // 创建企业用户
  async createEnterpriseUser(enterpriseId: number, user: EnterpriseUserRequest): Promise<{
    user: EnterpriseUser;
    generated_password?: string;
  }> {
    try {
      const response = await api.post(`${this.API_BASE_URL}/${enterpriseId}/users`, user);
      const result = this.handleApiResponse<{
        user: EnterpriseUser;
        generated_password?: string;
      }>(response);
      return result;
    } catch (error) {
      console.error('❌ 创建企业用户失败:', error);
      throw error;
    }
  }

  // 更新企业用户
  async updateEnterpriseUser(enterpriseId: number, userId: number, user: Partial<EnterpriseUserRequest>): Promise<EnterpriseUser> {
    try {
      const response = await api.put(`${this.API_BASE_URL}/${enterpriseId}/users/${userId}`, user);
      const result = this.handleApiResponse<EnterpriseUser>(response);
      return result;
    } catch (error) {
      console.error('❌ 更新企业用户失败:', error);
      throw error;
    }
  }

  // 获取企业部门列表
  async getEnterpriseDepartments(enterpriseId: number, page: number = 1, pageSize: number = 20, filters?: any): Promise<PaginatedResponse<EnterpriseDepartment>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...filters
      });
      const response = await api.get(`${this.API_BASE_URL}/${enterpriseId}/departments?${params}`);
      const result = this.handleApiResponse<PaginatedResponse<EnterpriseDepartment>>(response);
      return result;
    } catch (error) {
      console.error('❌ 获取企业部门列表失败:', error);
      throw error;
    }
  }

  // 创建企业部门
  async createEnterpriseDepartment(enterpriseId: number, department: EnterpriseDepartmentRequest): Promise<EnterpriseDepartment> {
    try {
      const response = await api.post(`${this.API_BASE_URL}/${enterpriseId}/departments`, department);
      const result = this.handleApiResponse<EnterpriseDepartment>(response);
      return result;
    } catch (error) {
      console.error('❌ 创建企业部门失败:', error);
      throw error;
    }
  }

  // 更新企业部门
  async updateEnterpriseDepartment(enterpriseId: number, departmentId: number, department: EnterpriseDepartmentRequest): Promise<EnterpriseDepartment> {
    try {
      const response = await api.put(`${this.API_BASE_URL}/${enterpriseId}/departments/${departmentId}`, department);
      const result = this.handleApiResponse<EnterpriseDepartment>(response);
      return result;
    } catch (error) {
      console.error('❌ 更新企业部门失败:', error);
      throw error;
    }
  }

  // 删除企业部门
  async deleteEnterpriseDepartment(enterpriseId: number, departmentId: number): Promise<void> {
    try {
      await api.delete(`${this.API_BASE_URL}/${enterpriseId}/departments/${departmentId}`);
    } catch (error) {
      console.error('❌ 删除企业部门失败:', error);
      throw error;
    }
  }

  // 获取业务类型选项
  getBusinessTypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'individual', label: '个人' },
      { value: 'partnership', label: '合伙制' },
      { value: 'corporation', label: '股份制' },
      { value: 'llc', label: '有限责任公司' }
    ];
  }

  // 获取状态选项
  getStatusOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'active', label: '活跃' },
      { value: 'inactive', label: '非活跃' },
      { value: 'suspended', label: '暂停' }
    ];
  }

  // 获取访问级别选项
  getAccessLevelOptions(): Array<{ value: number; label: string }> {
    return [
      { value: 1, label: '基础权限' },
      { value: 2, label: '一般权限' },
      { value: 3, label: '中级权限' },
      { value: 4, label: '高级权限' },
      { value: 5, label: '最高权限' }
    ];
  }
}

export default new EnterpriseService();