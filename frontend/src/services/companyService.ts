import { 
  Company, 
  CompanyRequest, 
  CompanyUser,
  CompanyUserRequest,
  CompanyContact, 
  CompanyContactRequest, 
  CompanyFilter, 
  CompanyStats,
  ApiResponse, 
  PaginatedResponse, 
  PaginationParams 
} from '../types/company';

const API_BASE_URL = '/api/v1/companies';

class CompanyService {
  // Get list of companies with pagination and filtering
  async getCompanies(pagination?: PaginationParams, filters?: CompanyFilter): Promise<PaginatedResponse<Company[]>> {
    const params = new URLSearchParams();
    
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.pageSize) params.append('page_size', pagination.pageSize.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.industry) params.append('industry', filters.industry);
    if (filters?.search) params.append('search', filters.search);

    const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<PaginatedResponse<Company[]>> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to fetch companies');
    }

    return apiResponse.data;
  }

  // Create new company
  async createCompany(companyData: CompanyRequest): Promise<Company> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(companyData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<Company> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to create company');
    }

    return apiResponse.data;
  }

  // Get company by ID
  async getCompany(id: number): Promise<Company> {
    const response = await fetch(`${API_BASE_URL}/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<Company> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to fetch company');
    }

    return apiResponse.data;
  }

  // Update company
  async updateCompany(id: number, companyData: Partial<CompanyRequest>): Promise<Company> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(companyData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<Company> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to update company');
    }

    return apiResponse.data;
  }

  // Delete company
  async deleteCompany(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<null> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to delete company');
    }
  }

  // Get company statistics
  async getCompanyStats(): Promise<CompanyStats> {
    const response = await fetch(`${API_BASE_URL}/stats`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<CompanyStats> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to fetch company statistics');
    }

    return apiResponse.data;
  }

  // Get company users
  async getCompanyUsers(companyId: number): Promise<CompanyUser[]> {
    const response = await fetch(`${API_BASE_URL}/${companyId}/users`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<CompanyUser[]> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to fetch company users');
    }

    return apiResponse.data;
  }

  // Create company user
  async createCompanyUser(companyId: number, userData: CompanyUserRequest): Promise<CompanyUser> {
    const response = await fetch(`${API_BASE_URL}/${companyId}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<CompanyUser> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to create company user');
    }

    return apiResponse.data;
  }

  // Get company contacts
  async getCompanyContacts(companyId: number, pagination?: PaginationParams): Promise<PaginatedResponse<CompanyContact[]>> {
    const params = new URLSearchParams();
    
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.pageSize) params.append('page_size', pagination.pageSize.toString());

    const response = await fetch(`${API_BASE_URL}/${companyId}/contacts?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<PaginatedResponse<CompanyContact[]>> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to fetch company contacts');
    }

    return apiResponse.data;
  }

  // Create company contact
  async createCompanyContact(companyId: number, contactData: CompanyContactRequest): Promise<CompanyContact> {
    const response = await fetch(`${API_BASE_URL}/${companyId}/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<CompanyContact> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to create company contact');
    }

    return apiResponse.data;
  }

  // Helper method to get company status options
  getStatusOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'active', label: '活跃客户' },
      { value: 'inactive', label: '非活跃客户' },
      { value: 'potential', label: '潜在客户' },
      { value: 'suspended', label: '暂停合作' }
    ];
  }

  // Helper method to get company priority options
  getPriorityOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'high', label: '高优先级' },
      { value: 'medium', label: '中优先级' },
      { value: 'low', label: '低优先级' }
    ];
  }

  // Helper method to get company type options
  getCompanyTypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'limited_company', label: '有限责任公司' },
      { value: 'joint_stock', label: '股份有限公司' },
      { value: 'individual', label: '个体工商户' },
      { value: 'partnership', label: '合伙企业' }
    ];
  }

  // Helper method to get company size options
  getCompanySizeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'startup', label: '初创公司' },
      { value: 'small', label: '小型企业' },
      { value: 'medium', label: '中型企业' },
      { value: 'large', label: '大型企业' },
      { value: 'enterprise', label: '超大型企业' }
    ];
  }

  // Helper method to get contact type options
  getContactTypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'email', label: '邮件' },
      { value: 'phone', label: '电话' },
      { value: 'meeting', label: '会议' },
      { value: 'visit', label: '拜访' },
      { value: 'video_call', label: '视频会议' },
      { value: 'other', label: '其他' }
    ];
  }

  // Helper method to get user role options
  getUserRoleOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'primary_contact', label: '主要联系人' },
      { value: 'technical_contact', label: '技术联系人' },
      { value: 'decision_maker', label: '决策人' },
      { value: 'finance_contact', label: '财务联系人' },
      { value: 'normal', label: '普通用户' }
    ];
  }

  // Helper method to get user status options
  getUserStatusOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'active', label: '在职' },
      { value: 'inactive', label: '暂停' },
      { value: 'left', label: '离职' }
    ];
  }

  // Helper method to get contact status options
  getContactStatusOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'planned', label: '计划中' },
      { value: 'completed', label: '已完成' },
      { value: 'cancelled', label: '已取消' },
      { value: 'rescheduled', label: '已改期' }
    ];
  }

  // Helper method to get contact result options
  getContactResultOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'positive', label: '积极' },
      { value: 'neutral', label: '中性' },
      { value: 'negative', label: '消极' },
      { value: 'no_response', label: '无回应' },
      { value: 'follow_up_needed', label: '需要跟进' }
    ];
  }
}

export default new CompanyService();