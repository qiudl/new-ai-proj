import { Customer, CustomerRequest, CustomerContact, CustomerContactRequest, CustomerFilter, CustomerStats, CustomerUser, CustomerUserRequest, ApiResponse, PaginatedResponse, PaginationParams } from '../types/customer';

const API_BASE_URL = '/api/v1/customers';

class CustomerService {
  // Get list of customers with pagination and filtering
  async getCustomers(pagination?: PaginationParams, filters?: CustomerFilter): Promise<PaginatedResponse<Customer[]>> {
    const params = new URLSearchParams();
    
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.pageSize) params.append('pageSize', pagination.pageSize.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.industry) params.append('industry', filters.industry);
    if (filters?.search) params.append('search', filters.search);

    const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<PaginatedResponse<Customer[]>> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to fetch customers');
    }

    return apiResponse.data;
  }

  // Create new customer
  async createCustomer(customerData: CustomerRequest): Promise<Customer> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<Customer> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to create customer');
    }

    return apiResponse.data;
  }

  // Get customer by ID
  async getCustomer(id: number): Promise<Customer> {
    const response = await fetch(`${API_BASE_URL}/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<Customer> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to fetch customer');
    }

    return apiResponse.data;
  }

  // Update customer
  async updateCustomer(id: number, customerData: Partial<CustomerRequest>): Promise<Customer> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<Customer> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to update customer');
    }

    return apiResponse.data;
  }

  // Delete customer
  async deleteCustomer(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<null> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to delete customer');
    }
  }

  // Get customer statistics
  async getCustomerStats(): Promise<CustomerStats> {
    const response = await fetch(`${API_BASE_URL}/stats`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<CustomerStats> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to fetch customer statistics');
    }

    return apiResponse.data;
  }

  // Associate user with customer
  async addCustomerUser(customerId: number, userData: CustomerUserRequest): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${customerId}/users`, {
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

    const apiResponse: ApiResponse<null> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to associate user with customer');
    }
  }

  // Remove user from customer
  async removeCustomerUser(customerId: number, userId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${customerId}/users/${userId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<null> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to remove user from customer');
    }
  }

  // Get customer contacts
  async getCustomerContacts(customerId: number, pagination?: PaginationParams): Promise<PaginatedResponse<CustomerContact[]>> {
    const params = new URLSearchParams();
    
    if (pagination?.page) params.append('page', pagination.page.toString());
    if (pagination?.pageSize) params.append('pageSize', pagination.pageSize.toString());

    const response = await fetch(`${API_BASE_URL}/${customerId}/contacts?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiResponse: ApiResponse<PaginatedResponse<CustomerContact[]>> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to fetch customer contacts');
    }

    return apiResponse.data;
  }

  // Create customer contact
  async createCustomerContact(customerId: number, contactData: CustomerContactRequest): Promise<CustomerContact> {
    const response = await fetch(`${API_BASE_URL}/${customerId}/contacts`, {
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

    const apiResponse: ApiResponse<CustomerContact> = await response.json();
    if (!apiResponse.success) {
      throw new Error(apiResponse.message || 'Failed to create customer contact');
    }

    return apiResponse.data;
  }

  // Helper method to get customer status options
  getStatusOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'active', label: '活跃' },
      { value: 'inactive', label: '非活跃' },
      { value: 'potential', label: '潜在' },
      { value: 'closed', label: '已关闭' }
    ];
  }

  // Helper method to get customer priority options
  getPriorityOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'high', label: '高' },
      { value: 'medium', label: '中' },
      { value: 'low', label: '低' }
    ];
  }

  // Helper method to get contact type options
  getContactTypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'email', label: '邮件' },
      { value: 'phone', label: '电话' },
      { value: 'meeting', label: '会议' },
      { value: 'visit', label: '拜访' },
      { value: 'other', label: '其他' }
    ];
  }

  // Helper method to get user role options
  getUserRoleOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'contact', label: '联系人' },
      { value: 'manager', label: '管理员' },
      { value: 'viewer', label: '查看者' },
      { value: 'admin', label: '超级管理员' }
    ];
  }
}

export default new CustomerService();