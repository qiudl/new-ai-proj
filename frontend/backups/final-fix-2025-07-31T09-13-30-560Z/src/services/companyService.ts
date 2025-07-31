import { 
 Company as CompanyType, 
 CompanyRequest, 
 CompanyUser as CompanyUserType,
 CompanyUserRequest,
 CompanyContact, 
 CompanyContactRequest, 
 CompanyFilter, 
 CompanyStats,
 ApiResponse, 
 PaginatedResponse, 
 PaginationParams 
} from '../types/company';
import api from './api';

// 兼容项目类型定义
type Company = CompanyType;
type CompanyUser = CompanyUserType;

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
    return response.data;
  }

  // Create new company
  async createCompany(companyData: CompanyRequest): Promise<Company> {
    // Convert camelCase to snake_case for backend
    const backendData = {
      company_name: companyData.companyName,
      company_code: companyData.companyCode,
      industry: companyData.industry,
      company_type: companyData.companyType,
      business_license: companyData.businessLicense,
      tax_number: companyData.taxNumber,
      legal_representative: companyData.legalRepresentative,
      address: companyData.address,
      city: companyData.city,
      province: companyData.province,
      postal_code: companyData.postalCode,
      website: companyData.website,
      main_phone: companyData.mainPhone,
      main_email: companyData.mainEmail,
      status: companyData.status,
      priority: companyData.priority,
      annual_contract_value: companyData.annualContractValue,
      start_date: companyData.startDate,
      employee_count: companyData.employeeCount,
      company_size: companyData.companySize};

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(backendData).filter(([_, value]) => value !== undefined)
    );
    return response.data;
  }

  // Get company by ID
  async getCompany(id: number): Promise<Company> {
    const data = response.data;
    
    // Convert snake_case from backend to camelCase for frontend
    const company: Company = {
      id: data.id,
      companyName: data.company_name || data.companyName,
      companyCode: data.company_code || data.companyCode,
      industry: data.industry,
      companyType: data.company_type || data.companyType,
      companyTypeText: this.getCompanyTypeText(data.company_type || data.companyType),
      businessLicense: data.business_license || data.businessLicense,
      taxNumber: data.tax_number || data.taxNumber,
      legalRepresentative: data.legal_representative || data.legalRepresentative,
      
      // Contact information
      address: data.address,
      city: data.city,
      province: data.province,
      postalCode: data.postal_code || data.postalCode,
      website: data.website,
      mainPhone: data.main_phone || data.mainPhone,
      mainEmail: data.main_email || data.mainEmail,
      
      // Business information
      status: data.status,
      statusText: this.getStatusText(data.status),
      priority: data.priority,
      priorityText: this.getPriorityText(data.priority),
      annualContractValue: data.annual_contract_value || data.annualContractValue,
      totalContractValue: data.total_contract_value || data.totalContractValue,
      startDate: data.start_date || data.startDate,
      
      // Company scale
      employeeCount: data.employee_count || data.employeeCount,
      companySize: data.company_size || data.companySize,
      companySizeText: this.getCompanySizeText(data.company_size || data.companySize),
      
      // Metadata
      createdBy: data.created_by || data.createdBy,
      createdByName: data.created_by_name || data.createdByName,
      updatedBy: data.updated_by || data.updatedBy,
      updatedByName: data.updated_by_name || data.updatedByName,
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
      
      // Related data
      userCount: data.user_count || data.userCount,
      projectCount: data.project_count || data.projectCount,
      contractCount: data.contract_count || data.contractCount,
      lastContactDate: data.last_contact_date || data.lastContactDate};
    
    return company;
  }

  // Update company
  async updateCompany(id: number, companyData: Partial<CompanyRequest>): Promise<Company> {
    // Convert camelCase to snake_case for backend
    const backendData = {
      company_name: companyData.companyName,
      company_code: companyData.companyCode,
      industry: companyData.industry,
      company_type: companyData.companyType,
      business_license: companyData.businessLicense,
      tax_number: companyData.taxNumber,
      legal_representative: companyData.legalRepresentative,
      address: companyData.address,
      city: companyData.city,
      province: companyData.province,
      postal_code: companyData.postalCode,
      website: companyData.website,
      main_phone: companyData.mainPhone,
      main_email: companyData.mainEmail,
      status: companyData.status,
      priority: companyData.priority,
      annual_contract_value: companyData.annualContractValue,
      start_date: companyData.startDate,
      employee_count: companyData.employeeCount,
      company_size: companyData.companySize};

    // Remove undefined, null, and empty string values
    const cleanedData = Object.fromEntries(
      Object.entries(backendData).filter(([_, value]) => 
        value !== undefined && value !== null && value !== ''
      )
    );

    console.log('更新企业数据:', cleanedData);
    return response.data;
  }

  // Delete company
  async deleteCompany(id: number): Promise<void> {
    await api.delete(`${API_BASE_URL}/${id}`);
  }

  // Get company statistics
  async getCompanyStats(): Promise<CompanyStats> {
    return response.data;
  }

  // Get company users
  async getCompanyUsers(companyId: number): Promise<CompanyUser[]> {
    return response.data;
  }

  // Create company user
  async createCompanyUser(companyId: number, userData: CompanyUserRequest): Promise<CompanyUser> {
    // Convert camelCase to snake_case for backend
    const backendData = {
      customer_id: userData.customerId,
      name: userData.name,
      position: userData.position,
      department: userData.department,
      email: userData.email,
      phone: userData.phone,
      mobile: userData.mobile,
      work_phone: userData.workPhone,
      role: userData.role,
      is_primary_contact: userData.isPrimaryContact,
      can_make_decisions: userData.canMakeDecisions,
      access_level: userData.accessLevel,
      status: userData.status,
      notes: userData.notes};

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(backendData).filter(([_, value]) => value !== undefined)
    );

    const response = await fetch(`${API_BASE_URL}/${companyId}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'},
      body: JSON.stringify(cleanedData)});

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

  // Update company user
  async updateCompanyUser(companyId: number, userId: number, userData: CompanyUserRequest): Promise<CompanyUser> {
    // Convert camelCase to snake_case for backend
    const backendData = {
      customer_id: userData.customerId,
      name: userData.name,
      position: userData.position,
      department: userData.department,
      email: userData.email,
      phone: userData.phone,
      mobile: userData.mobile,
      work_phone: userData.workPhone,
      role: userData.role,
      is_primary_contact: userData.isPrimaryContact,
      can_make_decisions: userData.canMakeDecisions,
      access_level: userData.accessLevel,
      status: userData.status,
      notes: userData.notes};

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(backendData).filter(([_, value]) => value !== undefined)
    );

    const response = await fetch(`${API_BASE_URL}/${companyId}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'},
      body: JSON.stringify(cleanedData)});

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<CompanyUser> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to update company user');
    }

    return apiResponse.data;
  }

  // Get company contacts
  async getCompanyContacts(companyId: number, pagination?: PaginationParams): Promise<PaginatedResponse<CompanyContact[]>> {
    const params = new URLSearchParams();
    
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.pageSize) params.append('page_size', pagination.pageSize.toString());
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
        'Content-Type': 'application/json'},
      body: JSON.stringify(contactData)});

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

  // 搜索客户（用于选择器）
  async searchCompanies(keyword: string): Promise<Company[]> {
    const params = new URLSearchParams();
    params.append('search', keyword);
    params.append('page_size', '50'); // 限制返回数量
    return response.data.data;
  }

  // 批量获取客户信息
  async getCompaniesByIds(ids: number[]): Promise<Company[]> {
    if (ids.length === 0) return [];
    
    const params = new URLSearchParams();
    params.append('ids', ids.join(','));
    return response.data;
  }

  // 获取多个客户的用户列表
  async getUsersByCompanies(companyIds: number[]): Promise<{ companyId: number; users: CompanyUser[] }[]> {
    if (companyIds.length === 0) return [];
    
    const params = new URLSearchParams();
    params.append('company_ids', companyIds.join(','));
    return response.data;
  }

  // Helper methods for text conversion
  private getCompanyTypeText(type: string): string {
    const typeMap: Record<string, string> = {
      'limited_company': '有限责任公司',
      'joint_stock': '股份有限公司',
      'individual': '个体工商户',
      'partnership': '合伙企业'
    };
    return typeMap[type] || '未知';
  }

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'active': '活跃',
      'inactive': '非活跃',
      'potential': '潜在客户',
      'suspended': '暂停合作'
    };
    return statusMap[status] || '未知';
  }

  private getPriorityText(priority: string): string {
    const priorityMap: Record<string, string> = {
      'high': '高',
      'medium': '中',
      'low': '低'
    };
    return priorityMap[priority] || '中';
  }

  private getCompanySizeText(size: string): string {
    const sizeMap: Record<string, string> = {
      'startup': '初创公司',
      'small': '小型企业',
      'medium': '中型企业',
      'large': '大型企业',
      'enterprise': '集团企业'
    };
    return sizeMap[size] || '未知';
  }
}

const instance = new CompanyService();
export default instance;