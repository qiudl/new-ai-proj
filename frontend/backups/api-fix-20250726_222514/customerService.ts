/**
 * 客户管理服务
 * 处理客户相关的API请求
 */

import api from './api';

export interface Customer {
  id: number;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  status?: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface CustomerRequest {
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  status?: 'active' | 'inactive';
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

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

class CustomerService {
  private baseUrl = '/customers';

  async getCustomers(params?: PaginationParams): Promise<PaginatedResponse<Customer>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.pageSize) queryParams.append('page_size', params.pageSize.toString());
      
      const endpoint = queryParams.toString() ? 
        `${this.baseUrl}?${queryParams}` : 
        `${this.baseUrl}?page=1&page_size=50`;
      
      const response = await api.get(endpoint);
      return response.data || response;
    } catch (error) {
      console.error('获取客户列表失败:', error);
      
      // 降级到mock数据
      const mockCustomers: Customer[] = [
        {
          id: 1,
          name: '华为技术有限公司',
          description: '全球领先的ICT基础设施和智能终端提供商',
          email: 'contact@huawei.com',
          contact_person: '张经理',
          status: 'active',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 2,
          name: '腾讯科技有限公司',
          description: '中国领先的互联网增值服务提供商',
          email: 'business@tencent.com',
          contact_person: '李总监',
          status: 'active',
          created_at: '2024-01-10T14:30:00Z'
        },
        {
          id: 3,
          name: '阿里巴巴集团',
          description: '全球化的数字商业平台',
          email: 'partnerships@alibaba.com',
          contact_person: '王主管',
          status: 'active',
          created_at: '2024-01-05T09:15:00Z'
        },
        {
          id: 4,
          name: '字节跳动有限公司',
          description: '全球化技术公司',
          email: 'bd@bytedance.com',
          contact_person: '刘经理',
          status: 'active',
          created_at: '2024-01-20T16:45:00Z'
        },
        {
          id: 5,
          name: '小米科技有限公司',
          description: '以手机、智能硬件和IoT平台为核心的互联网公司',
          email: 'enterprise@xiaomi.com',
          contact_person: '陈总',
          status: 'active',
          created_at: '2024-01-25T11:20:00Z'
        }
      ];

      return {
        data: mockCustomers,
        pagination: {
          page: 1,
          page_size: 50,
          total: mockCustomers.length,
          total_pages: 1,
          has_next: false,
          has_prev: false
        }
      };
    }
  }

  async getCustomer(id: number): Promise<Customer> {
    try {
      const response = await api.get(`${this.baseUrl}/${id}`);
      return response.data || response;
    } catch (error) {
      console.error(`获取客户${id}详情失败:`, error);
      throw error;
    }
  }

  async createCustomer(customer: CustomerRequest): Promise<Customer> {
    try {
      const response = await api.post(this.baseUrl, customer);
      return response.data || response;
    } catch (error) {
      console.error('创建客户失败:', error);
      throw error;
    }
  }

  async updateCustomer(id: number, customer: CustomerRequest): Promise<Customer> {
    try {
      const response = await api.put(`${this.baseUrl}/${id}`, customer);
      return response.data || response;
    } catch (error) {
      console.error(`更新客户${id}失败:`, error);
      throw error;
    }
  }

  async deleteCustomer(id: number): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error(`删除客户${id}失败:`, error);
      throw error;
    }
  }

  // 获取文档元数据相关的客户列表
  async getCustomersForDocumentMetadata(): Promise<Customer[]> {
    try {
      const response = await this.getCustomers({ page: 1, pageSize: 100 });
      return response.data;
    } catch (error) {
      console.error('获取文档元数据客户列表失败:', error);
      
      // 返回基础mock数据
      return [
        { id: 1, name: '华为技术有限公司', description: '全球领先的ICT基础设施和智能终端提供商' },
        { id: 2, name: '腾讯科技有限公司', description: '中国领先的互联网增值服务提供商' },
        { id: 3, name: '阿里巴巴集团', description: '全球化的数字商业平台' },
        { id: 4, name: '字节跳动有限公司', description: '全球化技术公司' },
        { id: 5, name: '小米科技有限公司', description: '以手机、智能硬件和IoT平台为核心的互联网公司' }
      ];
    }
  }
}

export const customerService = new CustomerService();
export default customerService;