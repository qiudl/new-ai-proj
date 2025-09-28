import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import EnterpriseManagementPage from '../../pages/EnterpriseManagementPage';
import * as enterpriseService from '../../services/enterpriseService';
import '@testing-library/jest-dom';

// Mock services
jest.mock('../../services/enterpriseService');
const mockedEnterpriseService = enterpriseService as jest.Mocked<typeof enterpriseService>;

// Mock Antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

const mockEnterprises = [
  {
    id: 1,
    name: '科技创新企业',
    code: 'TECH001',
    description: '专注于技术创新的企业',
    business_type: 'llc',
    industry_type: 'technology',
    status: 'active',
    contact_email: 'tech@example.com',
    contact_phone: '13800138001',
    address: '北京市海淀区中关村大街1号',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 2,
    name: '制造业集团',
    code: 'MFG001',
    description: '传统制造业企业',
    business_type: 'corporation',
    industry_type: 'manufacturing',
    status: 'active',
    contact_email: 'mfg@example.com',
    contact_phone: '13800138002',
    address: '上海市浦东新区张江高科技园区',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
];

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Enterprise Management User Flow E2E Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockedEnterpriseService.getEnterprises.mockResolvedValue({
      data: mockEnterprises,
      total: mockEnterprises.length,
      page: 1,
      pageSize: 10,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Enterprise Creation Flow', () => {
    it('should allow user to create a new enterprise from start to finish', async () => {
      const newEnterprise = {
        id: 3,
        name: '新创建的企业',
        code: 'NEW001',
        description: '这是一个新创建的企业',
        business_type: 'llc',
        industry_type: 'finance',
        status: 'active',
        contact_email: 'new@example.com',
        contact_phone: '13800138003',
        address: '深圳市南山区科技园',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockedEnterpriseService.createEnterprise.mockResolvedValue(newEnterprise);

      renderWithProviders(<EnterpriseManagementPage />);

      // Wait for initial data to load
      await waitFor(() => {
        expect(screen.getByText('科技创新企业')).toBeInTheDocument();
      });

      // Step 1: Click "新建企业" button
      const createButton = screen.getByText('新建企业');
      await user.click(createButton);

      // Step 2: Verify modal opens
      await waitFor(() => {
        expect(screen.getByText('新建企业')).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Step 3: Fill out required fields
      await user.type(screen.getByLabelText(/企业名称/), '新创建的企业');
      await user.type(screen.getByLabelText(/企业代码/), 'NEW001');
      await user.type(screen.getByLabelText(/企业描述/), '这是一个新创建的企业');
      
      // Select business type
      const businessTypeSelect = screen.getByLabelText(/业务类型/);
      await user.click(businessTypeSelect);
      await user.click(screen.getByText('有限责任公司'));

      // Select industry type
      const industryTypeSelect = screen.getByLabelText(/行业类型/);
      await user.click(industryTypeSelect);
      await user.click(screen.getByText('金融服务'));

      // Fill contact information
      await user.type(screen.getByLabelText(/联系邮箱/), 'new@example.com');
      await user.type(screen.getByLabelText(/联系电话/), '13800138003');
      await user.type(screen.getByLabelText(/详细地址/), '深圳市南山区科技园');

      // Step 4: Submit the form
      const submitButton = screen.getByText('确定');
      await user.click(submitButton);

      // Step 5: Verify API call was made with correct data
      await waitFor(() => {
        expect(mockedEnterpriseService.createEnterprise).toHaveBeenCalledWith({
          name: '新创建的企业',
          code: 'NEW001',
          description: '这是一个新创建的企业',
          business_type: 'llc',
          industry_type: 'finance',
          status: 'active',
          contact_email: 'new@example.com',
          contact_phone: '13800138003',
          address: '深圳市南山区科技园',
        });
      });

      // Step 6: Verify success message
      expect(screen.getByText('企业创建成功')).toBeInTheDocument();

      // Step 7: Verify modal closes and table refreshes
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Step 8: Verify new enterprise appears in the list
      // (This would require mocking the refresh call)
      mockedEnterpriseService.getEnterprises.mockResolvedValue({
        data: [...mockEnterprises, newEnterprise],
        total: mockEnterprises.length + 1,
        page: 1,
        pageSize: 10,
      });

      await waitFor(() => {
        expect(screen.getByText('新创建的企业')).toBeInTheDocument();
      });
    });

    it('should handle form validation errors during creation', async () => {
      renderWithProviders(<EnterpriseManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('企业管理')).toBeInTheDocument();
      });

      // Open creation modal
      await user.click(screen.getByText('新建企业'));

      // Try to submit without required fields
      const submitButton = screen.getByText('确定');
      await user.click(submitButton);

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('请输入企业名称')).toBeInTheDocument();
        expect(screen.getByText('请输入企业代码')).toBeInTheDocument();
      });

      // Fill partial information and test incremental validation
      await user.type(screen.getByLabelText(/企业名称/), '测试企业');
      
      // Should clear name validation error
      await waitFor(() => {
        expect(screen.queryByText('请输入企业名称')).not.toBeInTheDocument();
      });

      // Test email format validation
      await user.type(screen.getByLabelText(/联系邮箱/), 'invalid-email');
      await user.tab(); // Blur the field to trigger validation

      await waitFor(() => {
        expect(screen.getByText('请输入正确的邮箱格式')).toBeInTheDocument();
      });
    });

    it('should handle server errors during creation', async () => {
      mockedEnterpriseService.createEnterprise.mockRejectedValue(
        new Error('企业代码已存在')
      );

      renderWithProviders(<EnterpriseManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('企业管理')).toBeInTheDocument();
      });

      // Fill out and submit form
      await user.click(screen.getByText('新建企业'));
      await user.type(screen.getByLabelText(/企业名称/), '重复代码企业');
      await user.type(screen.getByLabelText(/企业代码/), 'TECH001'); // Duplicate code
      
      const businessTypeSelect = screen.getByLabelText(/业务类型/);
      await user.click(businessTypeSelect);
      await user.click(screen.getByText('有限责任公司'));

      await user.click(screen.getByText('确定'));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('企业创建失败')).toBeInTheDocument();
      });

      // Modal should remain open for user to fix the issue
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Complete Enterprise Edit Flow', () => {
    it('should allow user to edit an existing enterprise', async () => {
      const updatedEnterprise = {
        ...mockEnterprises[0],
        name: '更新后的科技企业',
        description: '更新后的企业描述',
        contact_phone: '13900139001',
      };

      mockedEnterpriseService.updateEnterprise.mockResolvedValue(updatedEnterprise);

      renderWithProviders(<EnterpriseManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('科技创新企业')).toBeInTheDocument();
      });

      // Step 1: Find and click edit button for first enterprise
      const firstRow = screen.getByText('科技创新企业').closest('tr');
      const editButton = within(firstRow!).getByTitle('编辑');
      await user.click(editButton);

      // Step 2: Verify edit modal opens with existing data
      await waitFor(() => {
        expect(screen.getByText('编辑企业')).toBeInTheDocument();
        expect(screen.getByDisplayValue('科技创新企业')).toBeInTheDocument();
        expect(screen.getByDisplayValue('TECH001')).toBeInTheDocument();
      });

      // Step 3: Modify some fields
      const nameInput = screen.getByDisplayValue('科技创新企业');
      await user.clear(nameInput);
      await user.type(nameInput, '更新后的科技企业');

      const descriptionInput = screen.getByDisplayValue('专注于技术创新的企业');
      await user.clear(descriptionInput);
      await user.type(descriptionInput, '更新后的企业描述');

      const phoneInput = screen.getByDisplayValue('13800138001');
      await user.clear(phoneInput);
      await user.type(phoneInput, '13900139001');

      // Step 4: Submit changes
      await user.click(screen.getByText('确定'));

      // Step 5: Verify API call was made
      await waitFor(() => {
        expect(mockedEnterpriseService.updateEnterprise).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            name: '更新后的科技企业',
            description: '更新后的企业描述',
            contact_phone: '13900139001',
          })
        );
      });

      // Step 6: Verify success message and modal closes
      expect(screen.getByText('企业更新成功')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Complete Enterprise Search and Filter Flow', () => {
    it('should allow user to search and filter enterprises effectively', async () => {
      renderWithProviders(<EnterpriseManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('科技创新企业')).toBeInTheDocument();
        expect(screen.getByText('制造业集团')).toBeInTheDocument();
      });

      // Step 1: Test text search
      const searchInput = screen.getByPlaceholderText(/搜索企业/);
      await user.type(searchInput, '科技');

      await waitFor(() => {
        expect(mockedEnterpriseService.getEnterprises).toHaveBeenCalledWith(
          expect.objectContaining({
            search: '科技',
          })
        );
      });

      // Mock filtered results
      mockedEnterpriseService.getEnterprises.mockResolvedValue({
        data: [mockEnterprises[0]], // Only tech company
        total: 1,
        page: 1,
        pageSize: 10,
      });

      // Step 2: Test business type filter
      const businessTypeFilter = screen.getByLabelText(/业务类型/);
      await user.click(businessTypeFilter);
      await user.click(screen.getByText('有限责任公司'));

      await waitFor(() => {
        expect(mockedEnterpriseService.getEnterprises).toHaveBeenCalledWith(
          expect.objectContaining({
            business_type: 'llc',
          })
        );
      });

      // Step 3: Test status filter
      const statusFilter = screen.getByLabelText(/状态/);
      await user.click(statusFilter);
      await user.click(screen.getByText('激活'));

      await waitFor(() => {
        expect(mockedEnterpriseService.getEnterprises).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'active',
          })
        );
      });

      // Step 4: Test combined filters
      await waitFor(() => {
        expect(mockedEnterpriseService.getEnterprises).toHaveBeenLastCalledWith(
          expect.objectContaining({
            search: '科技',
            business_type: 'llc',
            status: 'active',
          })
        );
      });

      // Step 5: Clear all filters
      const clearButton = screen.getByText(/清除筛选/);
      await user.click(clearButton);

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
      });

      // Should reload all data
      mockedEnterpriseService.getEnterprises.mockResolvedValue({
        data: mockEnterprises,
        total: mockEnterprises.length,
        page: 1,
        pageSize: 10,
      });
    });
  });

  describe('Complete Enterprise Deletion Flow', () => {
    it('should handle single enterprise deletion with confirmation', async () => {
      mockedEnterpriseService.deleteEnterprise.mockResolvedValue(undefined);

      renderWithProviders(<EnterpriseManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('科技创新企业')).toBeInTheDocument();
      });

      // Step 1: Click delete button
      const firstRow = screen.getByText('科技创新企业').closest('tr');
      const deleteButton = within(firstRow!).getByTitle('删除');
      await user.click(deleteButton);

      // Step 2: Verify confirmation dialog appears
      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
        expect(screen.getByText(/确定要删除企业.*科技创新企业.*吗/)).toBeInTheDocument();
      });

      // Step 3: Cancel first to test cancellation
      await user.click(screen.getByText('取消'));
      await waitFor(() => {
        expect(screen.queryByText('确认删除')).not.toBeInTheDocument();
      });

      // Should not have called delete API
      expect(mockedEnterpriseService.deleteEnterprise).not.toHaveBeenCalled();

      // Step 4: Delete again and confirm
      await user.click(deleteButton);
      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
      });

      await user.click(screen.getByText('删除'));

      // Step 5: Verify API call and success message
      await waitFor(() => {
        expect(mockedEnterpriseService.deleteEnterprise).toHaveBeenCalledWith(1);
        expect(screen.getByText('企业删除成功')).toBeInTheDocument();
      });
    });

    it('should handle bulk enterprise deletion', async () => {
      mockedEnterpriseService.deleteEnterprises.mockResolvedValue(undefined);

      renderWithProviders(<EnterpriseManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('科技创新企业')).toBeInTheDocument();
      });

      // Step 1: Select multiple enterprises
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // First enterprise
      await user.click(checkboxes[2]); // Second enterprise

      // Step 2: Verify bulk actions appear
      await waitFor(() => {
        expect(screen.getByText(/已选择.*2.*项/)).toBeInTheDocument();
        expect(screen.getByText('批量删除')).toBeInTheDocument();
      });

      // Step 3: Click bulk delete
      await user.click(screen.getByText('批量删除'));

      // Step 4: Confirm bulk deletion
      await waitFor(() => {
        expect(screen.getByText('确认批量删除')).toBeInTheDocument();
        expect(screen.getByText(/确定要删除选中的.*2.*个企业吗/)).toBeInTheDocument();
      });

      await user.click(screen.getByText('确定'));

      // Step 5: Verify API call
      await waitFor(() => {
        expect(mockedEnterpriseService.deleteEnterprises).toHaveBeenCalledWith([1, 2]);
        expect(screen.getByText('批量删除成功')).toBeInTheDocument();
      });
    });

    it('should handle deletion errors gracefully', async () => {
      mockedEnterpriseService.deleteEnterprise.mockRejectedValue(
        new Error('无法删除，该企业有关联数据')
      );

      renderWithProviders(<EnterpriseManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('科技创新企业')).toBeInTheDocument();
      });

      // Attempt to delete
      const firstRow = screen.getByText('科技创新企业').closest('tr');
      const deleteButton = within(firstRow!).getByTitle('删除');
      await user.click(deleteButton);
      await user.click(screen.getByText('删除'));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('企业删除失败')).toBeInTheDocument();
      });

      // Enterprise should still be in the list
      expect(screen.getByText('科技创新企业')).toBeInTheDocument();
    });
  });

  describe('Complete Enterprise View Details Flow', () => {
    it('should allow user to view enterprise details', async () => {
      renderWithProviders(<EnterpriseManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('科技创新企业')).toBeInTheDocument();
      });

      // Step 1: Click view button or enterprise name
      const firstRow = screen.getByText('科技创新企业').closest('tr');
      const viewButton = within(firstRow!).getByTitle('查看');
      await user.click(viewButton);

      // Step 2: Verify details modal opens
      await waitFor(() => {
        expect(screen.getByText('企业详情')).toBeInTheDocument();
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Step 3: Verify all enterprise details are displayed
      expect(screen.getByText('科技创新企业')).toBeInTheDocument();
      expect(screen.getByText('TECH001')).toBeInTheDocument();
      expect(screen.getByText('专注于技术创新的企业')).toBeInTheDocument();
      expect(screen.getByText('tech@example.com')).toBeInTheDocument();
      expect(screen.getByText('13800138001')).toBeInTheDocument();
      expect(screen.getByText('北京市海淀区中关村大街1号')).toBeInTheDocument();

      // Step 4: Test action buttons in detail view
      expect(screen.getByText('编辑')).toBeInTheDocument();
      expect(screen.getByText('删除')).toBeInTheDocument();

      // Step 5: Close modal
      await user.click(screen.getByText('关闭'));
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Complete Pagination and Sorting Flow', () => {
    it('should handle pagination and sorting correctly', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 25 }, (_, index) => ({
        ...mockEnterprises[0],
        id: index + 1,
        name: `企业${index + 1}`,
        code: `CODE${index + 1}`,
      }));

      mockedEnterpriseService.getEnterprises.mockResolvedValue({
        data: largeDataset.slice(0, 10),
        total: largeDataset.length,
        page: 1,
        pageSize: 10,
      });

      renderWithProviders(<EnterpriseManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('企业1')).toBeInTheDocument();
        expect(screen.getByText('共 25 条')).toBeInTheDocument();
      });

      // Step 1: Test page size change
      const pageSizeSelector = screen.getByTitle('10 条/页');
      await user.click(pageSizeSelector);
      await user.click(screen.getByText('20 条/页'));

      await waitFor(() => {
        expect(mockedEnterpriseService.getEnterprises).toHaveBeenCalledWith(
          expect.objectContaining({
            pageSize: 20,
          })
        );
      });

      // Step 2: Test page navigation
      const nextPageButton = screen.getByTitle('下一页');
      await user.click(nextPageButton);

      await waitFor(() => {
        expect(mockedEnterpriseService.getEnterprises).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
          })
        );
      });

      // Step 3: Test sorting
      const nameHeader = screen.getByText('企业名称');
      await user.click(nameHeader);

      await waitFor(() => {
        expect(mockedEnterpriseService.getEnterprises).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'name',
            sortOrder: 'asc',
          })
        );
      });

      // Click again for descending order
      await user.click(nameHeader);

      await waitFor(() => {
        expect(mockedEnterpriseService.getEnterprises).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'name',
            sortOrder: 'desc',
          })
        );
      });
    });
  });

  describe('Complete Error Recovery Flow', () => {
    it('should handle network errors and allow user to recover', async () => {
      // Initial successful load
      renderWithProviders(<EnterpriseManagementPage />);

      await waitFor(() => {
        expect(screen.getByText('科技创新企业')).toBeInTheDocument();
      });

      // Simulate network error on next request
      mockedEnterpriseService.getEnterprises.mockRejectedValueOnce(
        new Error('网络连接失败')
      );

      // Trigger a refresh
      const refreshButton = screen.getByTitle('刷新');
      await user.click(refreshButton);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText('加载失败')).toBeInTheDocument();
        expect(screen.getByText('重试')).toBeInTheDocument();
      });

      // Click retry button
      mockedEnterpriseService.getEnterprises.mockResolvedValue({
        data: mockEnterprises,
        total: mockEnterprises.length,
        page: 1,
        pageSize: 10,
      });

      await user.click(screen.getByText('重试'));

      // Should recover and show data again
      await waitFor(() => {
        expect(screen.getByText('科技创新企业')).toBeInTheDocument();
        expect(screen.queryByText('加载失败')).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design Flow', () => {
    it('should adapt to mobile viewport correctly', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithProviders(<EnterpriseManagementPage />);

      // Should render mobile-optimized components
      expect(screen.getByTestId('mobile-enterprise-management')).toBeInTheDocument();
      
      // Some desktop features should be hidden or adapted
      expect(screen.queryByText('创建时间')).not.toBeInTheDocument(); // Column might be hidden
    });
  });
});