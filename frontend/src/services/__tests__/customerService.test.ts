import customerService from '../customerService';
import { Customer, CustomerRequest, CustomerStats } from '../../types/customer';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('CustomerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCustomers', () => {
    it('should fetch customers with pagination and filters', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [
            {
              id: 1,
              name: 'Test Customer',
              company: 'Test Company',
              email: 'test@example.com',
              status: 'active',
              priority: 'high',
            },
          ],
          pagination: {
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
        message: 'Success',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await customerService.getCustomers(
        { page: 1, pageSize: 20 },
        { status: 'active', priority: 'high' }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/customers?page=1&pageSize=20&status=active&priority=high'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(
        customerService.getCustomers({ page: 1, pageSize: 20 })
      ).rejects.toThrow('HTTP error! status: 500');
    });

    it('should handle API response errors', async () => {
      const mockResponse = {
        success: false,
        message: 'Failed to fetch customers',
        data: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await expect(
        customerService.getCustomers({ page: 1, pageSize: 20 })
      ).rejects.toThrow('Failed to fetch customers');
    });
  });

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      const customerRequest: CustomerRequest = {
        name: 'New Customer',
        company: 'New Company',
        industry: 'Technology',
        contactPerson: 'John Doe',
        email: 'john@example.com',
        phone: '13800138000',
        address: 'Test Address',
        status: 'potential',
        priority: 'medium',
      };

      const createdCustomer: Customer = {
        id: 1,
        ...customerRequest,
        createdBy: 1,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      const mockResponse = {
        success: true,
        data: createdCustomer,
        message: 'Customer created successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await customerService.createCustomer(customerRequest);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerRequest),
      });
      expect(result).toEqual(createdCustomer);
    });

    it('should handle creation errors', async () => {
      const customerRequest: CustomerRequest = {
        name: 'New Customer',
        company: 'New Company',
        industry: 'Technology',
        contactPerson: 'John Doe',
        email: 'john@example.com',
        phone: '13800138000',
        address: 'Test Address',
        status: 'potential',
        priority: 'medium',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Validation failed',
        }),
      } as Response);

      await expect(
        customerService.createCustomer(customerRequest)
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('getCustomer', () => {
    it('should fetch a single customer', async () => {
      const customer: Customer = {
        id: 1,
        name: 'Test Customer',
        company: 'Test Company',
        industry: 'Technology',
        contactPerson: 'John Doe',
        email: 'john@example.com',
        phone: '13800138000',
        address: 'Test Address',
        status: 'active',
        priority: 'high',
        createdBy: 1,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      const mockResponse = {
        success: true,
        data: customer,
        message: 'Customer retrieved successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await customerService.getCustomer(1);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/customers/1');
      expect(result).toEqual(customer);
    });
  });

  describe('updateCustomer', () => {
    it('should update a customer successfully', async () => {
      const customerUpdate = {
        name: 'Updated Customer',
        company: 'Updated Company',
      };

      const updatedCustomer: Customer = {
        id: 1,
        name: 'Updated Customer',
        company: 'Updated Company',
        industry: 'Technology',
        contactPerson: 'John Doe',
        email: 'john@example.com',
        phone: '13800138000',
        address: 'Test Address',
        status: 'active',
        priority: 'high',
        createdBy: 1,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      const mockResponse = {
        success: true,
        data: updatedCustomer,
        message: 'Customer updated successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await customerService.updateCustomer(1, customerUpdate);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/customers/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerUpdate),
      });
      expect(result).toEqual(updatedCustomer);
    });
  });

  describe('deleteCustomer', () => {
    it('should delete a customer successfully', async () => {
      const mockResponse = {
        success: true,
        data: null,
        message: 'Customer deleted successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await customerService.deleteCustomer(1);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/customers/1', {
        method: 'DELETE',
      });
    });
  });

  describe('getCustomerStats', () => {
    it('should fetch customer statistics', async () => {
      const stats: CustomerStats = {
        totalCustomers: 100,
        activeCustomers: 80,
        inactiveCustomers: 15,
        potentialCustomers: 5,
        closedCustomers: 0,
        highPriorityCustomers: 20,
        mediumPriorityCustomers: 60,
        lowPriorityCustomers: 20,
        totalContractValue: 1000000,
        averageContractValue: 10000,
        byIndustry: [],
        byStatus: [],
        byPriority: [],
      };

      const mockResponse = {
        success: true,
        data: stats,
        message: 'Statistics retrieved successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await customerService.getCustomerStats();

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/customers/stats');
      expect(result).toEqual(stats);
    });
  });

  describe('addCustomerUser', () => {
    it('should associate a user with a customer', async () => {
      const userRequest = {
        userId: 1,
        role: 'manager' as const,
        permissions: ['read', 'write'],
      };

      const mockResponse = {
        success: true,
        data: null,
        message: 'User associated successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await customerService.addCustomerUser(1, userRequest);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/customers/1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userRequest),
      });
    });
  });

  describe('helper methods', () => {
    it('should return status options', () => {
      const options = customerService.getStatusOptions();
      expect(options).toEqual([
        { value: 'active', label: '活跃' },
        { value: 'inactive', label: '非活跃' },
        { value: 'potential', label: '潜在' },
        { value: 'closed', label: '已关闭' },
      ]);
    });

    it('should return priority options', () => {
      const options = customerService.getPriorityOptions();
      expect(options).toEqual([
        { value: 'high', label: '高' },
        { value: 'medium', label: '中' },
        { value: 'low', label: '低' },
      ]);
    });

    it('should return contact type options', () => {
      const options = customerService.getContactTypeOptions();
      expect(options).toEqual([
        { value: 'email', label: '邮件' },
        { value: 'phone', label: '电话' },
        { value: 'meeting', label: '会议' },
        { value: 'visit', label: '拜访' },
        { value: 'other', label: '其他' },
      ]);
    });

    it('should return user role options', () => {
      const options = customerService.getUserRoleOptions();
      expect(options).toEqual([
        { value: 'contact', label: '联系人' },
        { value: 'manager', label: '管理员' },
        { value: 'viewer', label: '查看者' },
        { value: 'admin', label: '超级管理员' },
      ]);
    });
  });
});