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

const API_BASE_URL = '/companies';

class CompanyService {
  // 统一的 API 响应处理函数
  private handleApiResponse<T>(response: any): T {
    console.log('CompanyService API Response:', response); // 调试日志
    
    // 处理null或undefined响应
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
    
    // 特殊处理企业列表API：后端返回 {success: true, data: {data: [], pagination: {}}}
    // 需要返回 {data: [], pagination: {}} 格式给前端使用
    if (response && response.success && response.data) {
      // 如果是分页响应格式 {success: true, data: {data: [], pagination: {}}}
      if (response.data.data && Array.isArray(response.data.data) && response.data.pagination) {
        // 确保pagination对象包含所有必需的字段
        const pagination = response.data.pagination;
        return {
          data: response.data.data,
          pagination: {
            page: pagination.page || 1,
            pageSize: pagination.pageSize || pagination.page_size || 20,
            total: pagination.total || 0,
            totalPages: pagination.totalPages || pagination.total_pages || 0,
            hasNext: pagination.hasNext || pagination.has_next || false,
            hasPrev: pagination.hasPrev || pagination.has_prev || false
          }
        } as T;
      }
      
      // 如果是简单的API响应包装 {success: true, data: actualData}
      return response.data;
    }
    
    // 向下兼容：特殊处理分页响应（直接传入data.data的情况）
    if (response && response.data && Array.isArray(response.data) && response.pagination) {
      return {
        data: response.data,
        pagination: response.pagination || {
          page: 1,
          pageSize: response.data.length,
          total: response.data.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      } as T;
    }
    
    // 如果直接返回数组数据
    if (Array.isArray(response)) {
      return {
        data: response,
        pagination: {
          page: 1,
          pageSize: response.length,
          total: response.length,
          totalPages: response.length > 0 ? 1 : 0,
          hasNext: false,
          hasPrev: false
        }
      } as T;
    }
    
    // 否则直接返回响应数据
    return response;
  }

  // 统一的错误处理函数
  private handleError(error: any): never {
    console.error('CompanyService Error:', error);
    throw error; // 让上层组件处理错误
  }

  // 将 camelCase 对象转换为 snake_case（用于发送到后端）
  private convertToSnakeCase(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      converted[snakeKey] = value;
    }
    return converted;
  }

  // 将 snake_case 对象转换为 camelCase（用于前端使用）
  private convertToCamelCase(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      converted[camelKey] = value;
    }
    return converted;
  }

  // 清理请求数据（移除 undefined 值）
  private cleanRequestData(data: any): any {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, value === '' ? null : value])
    );
  }

  // Get list of companies with pagination and filtering
  async getCompanies(pagination?: PaginationParams, filters?: CompanyFilter): Promise<PaginatedResponse<Company[]>> {
    try {
      const params = new URLSearchParams();
      
      if (pagination?.page) params.append('page', pagination.page.toString());
      if (pagination?.pageSize) params.append('page_size', pagination.pageSize.toString());
      if (filters?.status) params.append('status', filters.status);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.industry) params.append('industry', filters.industry);
      if (filters?.search) params.append('search', filters.search);

      const response = await api.get(`${API_BASE_URL}?${params.toString()}`);
      return this.handleApiResponse<PaginatedResponse<Company[]>>(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Create new company
  async createCompany(companyData: CompanyRequest): Promise<Company> {
    try {
      // 将前端的 camelCase 数据转换为后端需要的 snake_case
      const backendData = this.convertToSnakeCase(companyData);
      const cleanedData = this.cleanRequestData(backendData);

      const response = await api.post(API_BASE_URL, cleanedData);
      return this.handleApiResponse<Company>(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Get company by ID
  async getCompany(id: number): Promise<Company> {
    try {
      const response = await api.get(`${API_BASE_URL}/${id}`);
      const data = this.handleApiResponse<any>(response);
      
      // 处理后端返回的 snake_case 数据，转换为前端需要的格式
      const company: Company = {
        id: data.id,
        companyName: data.company_name,
        companyCode: data.company_code,
        industry: data.industry,
        companyType: data.company_type,
        companyTypeText: this.getCompanyTypeText(data.company_type),
        businessLicense: data.business_license,
        taxNumber: data.tax_number,
        legalRepresentative: data.legal_representative,
        
        // Contact information
        address: data.address,
        city: data.city,
        province: data.province,
        postalCode: data.postal_code,
        website: data.website,
        mainPhone: data.main_phone,
        mainEmail: data.main_email,
        
        // Business information
        status: data.status,
        statusText: this.getStatusText(data.status),
        priority: data.priority,
        priorityText: this.getPriorityText(data.priority),
        annualContractValue: data.annual_contract_value,
        totalContractValue: data.total_contract_value,
        startDate: data.start_date,
        
        // Company scale
        employeeCount: data.employee_count,
        companySize: data.company_size,
        companySizeText: this.getCompanySizeText(data.company_size),
        
        // Metadata
        createdBy: data.created_by,
        createdByName: data.created_by_name,
        updatedBy: data.updated_by,
        updatedByName: data.updated_by_name,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        
        // Related data
        userCount: data.user_count,
        projectCount: data.project_count,
        contractCount: data.contract_count,
        lastContactDate: data.last_contact_date,
      };
      
      return company;
    } catch (error) {
      this.handleError(error);
    }
  }

  // Update company
  async updateCompany(id: number, companyData: Partial<CompanyRequest>): Promise<Company> {
    try {
      const backendData = this.convertToSnakeCase(companyData);
      // 对于更新操作，只保留非空值
      const cleanedData = Object.fromEntries(
        Object.entries(backendData).filter(([_, value]) => 
          value !== undefined && value !== null && value !== ''
        )
      );

      const response = await api.put(`${API_BASE_URL}/${id}`, cleanedData);
      return this.handleApiResponse<Company>(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Delete company
  async deleteCompany(id: number): Promise<void> {
    try {
      await api.delete(`${API_BASE_URL}/${id}`);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Get company statistics
  async getCompanyStats(): Promise<CompanyStats> {
    try {
      const response = await api.get(`${API_BASE_URL}/stats`);
      return this.handleApiResponse<CompanyStats>(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Get company users
  async getCompanyUsers(companyId: number): Promise<CompanyUser[]> {
    try {
      const response = await api.get(`${API_BASE_URL}/${companyId}/users`);
      return this.handleApiResponse<CompanyUser[]>(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Create company user
  async createCompanyUser(companyId: number, userData: CompanyUserRequest): Promise<CompanyUser> {
    try {
      const backendData = this.convertToSnakeCase(userData);
      const cleanedData = this.cleanRequestData(backendData);

      const response = await api.post(`${API_BASE_URL}/${companyId}/users`, cleanedData);
      return this.handleApiResponse<CompanyUser>(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Update company user
  async updateCompanyUser(companyId: number, userId: number, userData: CompanyUserRequest): Promise<CompanyUser> {
    try {
      const backendData = this.convertToSnakeCase(userData);
      const cleanedData = this.cleanRequestData(backendData);

      const response = await api.put(`${API_BASE_URL}/${companyId}/users/${userId}`, cleanedData);
      return this.handleApiResponse<CompanyUser>(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Get company contacts
  async getCompanyContacts(companyId: number, pagination?: PaginationParams): Promise<PaginatedResponse<CompanyContact[]>> {
    try {
      const params = new URLSearchParams();
      
      if (pagination?.page) params.append('page', pagination.page.toString());
      if (pagination?.pageSize) params.append('page_size', pagination.pageSize.toString());

      const response = await api.get(`${API_BASE_URL}/${companyId}/contacts?${params.toString()}`);
      return this.handleApiResponse<PaginatedResponse<CompanyContact[]>>(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Create company contact
  async createCompanyContact(companyId: number, contactData: CompanyContactRequest): Promise<CompanyContact> {
    try {
      const response = await api.post(`${API_BASE_URL}/${companyId}/contacts`, contactData);
      return this.handleApiResponse<CompanyContact>(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  // 搜索客户（用于选择器）
  async searchCompanies(keyword: string): Promise<Company[]> {
    try {
      const params = new URLSearchParams();
      params.append('search', keyword);
      params.append('page_size', '50'); // 限制返回数量
      
      const response = await api.get(`${API_BASE_URL}?${params.toString()}`);
      const paginatedResponse = this.handleApiResponse<PaginatedResponse<Company[]>>(response);
      return paginatedResponse.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // 批量获取客户信息
  async getCompaniesByIds(ids: number[]): Promise<Company[]> {
    try {
      if (ids.length === 0) return [];
      
      const params = new URLSearchParams();
      params.append('ids', ids.join(','));
      
      const response = await api.get(`${API_BASE_URL}/batch?${params.toString()}`);
      return this.handleApiResponse<Company[]>(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  // 获取多个客户的用户列表
  async getUsersByCompanies(companyIds: number[]): Promise<{ companyId: number; users: CompanyUser[] }[]> {
    try {
      if (companyIds.length === 0) return [];
      
      const params = new URLSearchParams();
      params.append('company_ids', companyIds.join(','));
      
      const response = await api.get(`${API_BASE_URL}/users/batch?${params.toString()}`);
      return this.handleApiResponse<{ companyId: number; users: CompanyUser[] }[]>(response);
    } catch (error) {
      this.handleError(error);
    }
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

export default new CompanyService();
