import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EnterpriseTable from '../EnterpriseTable';
import * as enterpriseService from '../../services/enterpriseService';
import '@testing-library/jest-dom';

// Mock the enterprise service
jest.mock('../../services/enterpriseService');
const mockedEnterpriseService = enterpriseService as jest.Mocked<typeof enterpriseService>;

// Mock Antd's message API
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock data
const mockEnterprises = [
  {
    id: 1,
    name: '测试企业A',
    code: 'TEST001',
    description: '测试企业A的描述',
    business_type: 'llc',
    industry_type: 'technology',
    status: 'active',
    contact_email: 'a@test.com',
    contact_phone: '13800138001',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 2,
    name: '测试企业B',
    code: 'TEST002',
    description: '测试企业B的描述',
    business_type: 'corporation',
    industry_type: 'finance',
    status: 'inactive',
    contact_email: 'b@test.com',
    contact_phone: '13800138002',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
  {
    id: 3,
    name: '测试企业C',
    code: 'TEST003',
    description: '测试企业C的描述',
    business_type: 'partnership',
    industry_type: 'manufacturing',
    status: 'active',
    contact_email: 'c@test.com',
    contact_phone: '13800138003',
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-06T00:00:00Z',
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

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('EnterpriseTable Integration Tests', () => {
  const user = userEvent.setup();
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    mockedEnterpriseService.getEnterprises.mockResolvedValue({
      data: mockEnterprises,
      total: mockEnterprises.length,
      page: 1,
      pageSize: 10,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  describe('Data Loading and Display', () => {
    it('should render table with enterprise data', async () => {
      renderWithQueryClient(<EnterpriseTable />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('测试企业A')).toBeInTheDocument();
        expect(screen.getByText('测试企业B')).toBeInTheDocument();
        expect(screen.getByText('测试企业C')).toBeInTheDocument();
      });

      // Verify service was called
      expect(mockedEnterpriseService.getEnterprises).toHaveBeenCalledTimes(1);
    });

    it('should display loading state initially', () => {
      mockedEnterpriseService.getEnterprises.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithQueryClient(<EnterpriseTable />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should display error state when data loading fails', async () => {
      const errorMessage = '加载企业数据失败';
      mockedEnterpriseService.getEnterprises.mockRejectedValue(
        new Error(errorMessage)
      );

      renderWithQueryClient(<EnterpriseTable />);

      await waitFor(() => {
        expect(screen.getByText(/加载失败/)).toBeInTheDocument();
      });
    });

    it('should display empty state when no data', async () => {
      mockedEnterpriseService.getEnterprises.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 10,
      });

      renderWithQueryClient(<EnterpriseTable />);

      await waitFor(() => {
        expect(screen.getByText(/暂无数据/)).toBeInTheDocument();
      });
    });
  });

  describe('Table Features', () => {
    beforeEach(async () => {
      renderWithQueryClient(<EnterpriseTable />);
      await waitFor(() => {
        expect(screen.getByText('测试企业A')).toBeInTheDocument();
      });
    });

    it('should display all expected columns', () => {
      expect(screen.getByText('企业名称')).toBeInTheDocument();
      expect(screen.getByText('企业代码')).toBeInTheDocument();
      expect(screen.getByText('业务类型')).toBeInTheDocument();
      expect(screen.getByText('行业类型')).toBeInTheDocument();
      expect(screen.getByText('状态')).toBeInTheDocument();
      expect(screen.getByText('联系邮箱')).toBeInTheDocument();
      expect(screen.getByText('操作')).toBeInTheDocument();
    });

    it('should render status badges correctly', () => {
      const activeStatuses = screen.getAllByText('激活');
      const inactiveStatuses = screen.getAllByText('停用');
      
      expect(activeStatuses).toHaveLength(2); // 企业A和C
      expect(inactiveStatuses).toHaveLength(1); // 企业B
    });

    it('should handle row selection', async () => {
      const checkboxes = screen.getAllByRole('checkbox');
      
      // Click on first enterprise checkbox (index 1, since 0 is "select all")
      await user.click(checkboxes[1]);

      expect(checkboxes[1]).toBeChecked();
    });

    it('should handle "select all" functionality', async () => {
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      
      await user.click(selectAllCheckbox);

      // All enterprise checkboxes should be checked
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.slice(1).forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      renderWithQueryClient(<EnterpriseTable />);
      await waitFor(() => {
        expect(screen.getByText('测试企业A')).toBeInTheDocument();
      });
    });

    it('should filter enterprises by search term', async () => {
      const searchInput = screen.getByPlaceholderText(/搜索企业/);
      
      await user.type(searchInput, '企业A');

      await waitFor(() => {
        expect(mockedEnterpriseService.getEnterprises).toHaveBeenCalledWith(
          expect.objectContaining({
            search: '企业A',
          })
        );
      });
    });

    it('should filter by business type', async () => {
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
    });

    it('should filter by status', async () => {
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
    });

    it('should clear all filters', async () => {
      // Apply some filters first
      const searchInput = screen.getByPlaceholderText(/搜索企业/);
      await user.type(searchInput, '测试');

      // Clear filters
      const clearButton = screen.getByText(/清除筛选/);
      await user.click(clearButton);

      await waitFor(() => {
        expect(searchInput).toHaveValue('');
        expect(mockedEnterpriseService.getEnterprises).toHaveBeenCalledWith(
          expect.objectContaining({
            search: '',
          })
        );
      });
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
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
    });

    it('should display pagination controls', async () => {
      renderWithQueryClient(<EnterpriseTable />);

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
        expect(screen.getByText('共 25 条')).toBeInTheDocument();
      });
    });

    it('should handle page size changes', async () => {
      renderWithQueryClient(<EnterpriseTable />);

      await waitFor(() => {
        expect(screen.getByText('共 25 条')).toBeInTheDocument();
      });

      // Change page size
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
    });

    it('should handle page navigation', async () => {
      renderWithQueryClient(<EnterpriseTable />);

      await waitFor(() => {
        expect(screen.getByText('共 25 条')).toBeInTheDocument();
      });

      // Go to next page
      const nextPageButton = screen.getByTitle('下一页');
      await user.click(nextPageButton);

      await waitFor(() => {
        expect(mockedEnterpriseService.getEnterprises).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
          })
        );
      });
    });
  });

  describe('Sorting', () => {
    beforeEach(async () => {
      renderWithQueryClient(<EnterpriseTable />);
      await waitFor(() => {
        expect(screen.getByText('测试企业A')).toBeInTheDocument();
      });
    });

    it('should sort by enterprise name', async () => {
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

    it('should sort by creation date', async () => {
      const dateHeader = screen.getByText('创建时间');
      await user.click(dateHeader);

      await waitFor(() => {
        expect(mockedEnterpriseService.getEnterprises).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'created_at',
            sortOrder: 'asc',
          })
        );
      });
    });
  });

  describe('Action Buttons', () => {
    beforeEach(async () => {
      renderWithQueryClient(<EnterpriseTable />);
      await waitFor(() => {
        expect(screen.getByText('测试企业A')).toBeInTheDocument();
      });
    });

    it('should display action buttons for each row', () => {
      const editButtons = screen.getAllByTitle(/编辑/);
      const deleteButtons = screen.getAllByTitle(/删除/);
      const viewButtons = screen.getAllByTitle(/查看/);

      expect(editButtons).toHaveLength(3);
      expect(deleteButtons).toHaveLength(3);
      expect(viewButtons).toHaveLength(3);
    });

    it('should handle edit action', async () => {
      const editButtons = screen.getAllByTitle(/编辑/);
      await user.click(editButtons[0]);

      // Should trigger edit callback
      expect(screen.getByRole('dialog')).toBeInTheDocument(); // Edit modal should open
    });

    it('should handle delete action with confirmation', async () => {
      mockedEnterpriseService.deleteEnterprise.mockResolvedValue(undefined);

      const deleteButtons = screen.getAllByTitle(/删除/);
      await user.click(deleteButtons[0]);

      // Confirmation modal should appear
      await waitFor(() => {
        expect(screen.getByText(/确认删除/)).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByText('确定');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockedEnterpriseService.deleteEnterprise).toHaveBeenCalledWith(1);
      });
    });

    it('should handle view action', async () => {
      const viewButtons = screen.getAllByTitle(/查看/);
      await user.click(viewButtons[0]);

      // Should open view modal or navigate to detail page
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(async () => {
      renderWithQueryClient(<EnterpriseTable />);
      await waitFor(() => {
        expect(screen.getByText('测试企业A')).toBeInTheDocument();
      });
    });

    it('should enable bulk operations when rows are selected', async () => {
      // Select multiple rows
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Select first enterprise
      await user.click(checkboxes[2]); // Select second enterprise

      // Bulk action buttons should appear
      expect(screen.getByText(/批量操作/)).toBeInTheDocument();
      expect(screen.getByText(/批量删除/)).toBeInTheDocument();
    });

    it('should handle bulk delete', async () => {
      mockedEnterpriseService.deleteEnterprises.mockResolvedValue(undefined);

      // Select rows
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      await user.click(checkboxes[2]);

      // Click bulk delete
      const bulkDeleteButton = screen.getByText(/批量删除/);
      await user.click(bulkDeleteButton);

      // Confirm deletion
      await waitFor(() => {
        expect(screen.getByText(/确认批量删除/)).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('确定');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockedEnterpriseService.deleteEnterprises).toHaveBeenCalledWith([1, 2]);
      });
    });

    it('should handle bulk status update', async () => {
      mockedEnterpriseService.updateEnterpriseStatus.mockResolvedValue(undefined);

      // Select rows
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      // Click bulk status update
      const bulkStatusButton = screen.getByText(/批量状态更新/);
      await user.click(bulkStatusButton);

      // Select new status
      await user.click(screen.getByText('停用'));

      await waitFor(() => {
        expect(mockedEnterpriseService.updateEnterpriseStatus).toHaveBeenCalledWith([1], 'inactive');
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should refresh data when refetch is called', async () => {
      renderWithQueryClient(<EnterpriseTable />);

      await waitFor(() => {
        expect(screen.getByText('测试企业A')).toBeInTheDocument();
      });

      // Clear the mock to track new calls
      mockedEnterpriseService.getEnterprises.mockClear();

      // Trigger refresh
      const refreshButton = screen.getByTitle(/刷新/);
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockedEnterpriseService.getEnterprises).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle data updates from external sources', async () => {
      const { rerender } = renderWithQueryClient(<EnterpriseTable />);

      await waitFor(() => {
        expect(screen.getByText('测试企业A')).toBeInTheDocument();
      });

      // Simulate external update
      const updatedData = [...mockEnterprises];
      updatedData[0].name = '更新后的企业A';
      
      mockedEnterpriseService.getEnterprises.mockResolvedValue({
        data: updatedData,
        total: updatedData.length,
        page: 1,
        pageSize: 10,
      });

      // Force re-query
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });

      await waitFor(() => {
        expect(screen.getByText('更新后的企业A')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithQueryClient(<EnterpriseTable />);

      // Should render mobile-optimized version
      expect(screen.getByTestId('mobile-table')).toBeInTheDocument();
    });

    it('should show/hide columns based on screen size', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      renderWithQueryClient(<EnterpriseTable />);

      // Some columns might be hidden on smaller screens
      expect(screen.queryByText('创建时间')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, index) => ({
        ...mockEnterprises[0],
        id: index + 1,
        name: `企业${index + 1}`,
      }));

      mockedEnterpriseService.getEnterprises.mockResolvedValue({
        data: largeDataset.slice(0, 50),
        total: largeDataset.length,
        page: 1,
        pageSize: 50,
      });

      const startTime = performance.now();
      
      renderWithQueryClient(<EnterpriseTable />);

      await waitFor(() => {
        expect(screen.getByText('企业1')).toBeInTheDocument();
      });

      const endTime = performance.now();

      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should debounce search input', async () => {
      renderWithQueryClient(<EnterpriseTable />);

      const searchInput = screen.getByPlaceholderText(/搜索企业/);
      
      // Type rapidly
      await user.type(searchInput, 'test');

      // Should only call service once after debounce period
      await waitFor(() => {
        expect(mockedEnterpriseService.getEnterprises).toHaveBeenCalledTimes(2); // Initial load + debounced search
      }, { timeout: 1000 });
    });
  });
});