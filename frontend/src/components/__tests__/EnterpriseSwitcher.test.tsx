import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnterpriseSwitcher } from '../EnterpriseSwitcher';
import { useEnterprise } from '../../contexts/EnterpriseContext';
import { useImpersonationState } from '../../hooks/useImpersonationState';

// Mock the hooks and contexts
jest.mock('../../contexts/EnterpriseContext');
jest.mock('../../hooks/useImpersonationState');

const mockUseEnterprise = useEnterprise as jest.MockedFunction<typeof useEnterprise>;
const mockUseImpersonationState = useImpersonationState as jest.MockedFunction<typeof useImpersonationState>;

describe('EnterpriseSwitcher', () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();
  const mockStartImpersonation = jest.fn();
  const mockRefreshEnterprises = jest.fn();

  const mockEnterprises = [
    {
      id: 1,
      name: '企业A',
      code: 'CORP_A',
      description: '测试企业A的描述',
      status: 'active',
      user_count: 10
    },
    {
      id: 2,
      name: '企业B',
      code: 'CORP_B',
      description: '测试企业B的描述',
      status: 'inactive',
      user_count: 5
    },
    {
      id: 3,
      name: '企业C',
      code: 'CORP_C',
      description: '测试企业C的描述',
      status: 'active',
      user_count: 20
    }
  ];

  const defaultMockEnterpriseContext = {
    enterprises: mockEnterprises,
    loading: false,
    error: null,
    refreshEnterprises: mockRefreshEnterprises,
    currentEnterprise: null,
    setCurrentEnterprise: jest.fn()
  };

  const defaultMockImpersonationState = {
    isImpersonating: false,
    startImpersonation: mockStartImpersonation,
    loading: false,
    permissions: {
      canStartImpersonation: true,
      canExitImpersonation: true,
      canViewHistory: true,
      restrictedActions: []
    },
    enterpriseInfo: null,
    sessionInfo: null,
    originalUserInfo: null,
    sessionTimeLeft: null,
    isExpired: false,
    isExpiringSoon: false,
    exitImpersonation: jest.fn(),
    error: null,
    warnings: [],
    canPerformSensitiveActions: true,
    refreshStatus: jest.fn(),
    getImpersonationHistory: jest.fn(),
    impersonationStatus: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEnterprise.mockReturnValue(defaultMockEnterpriseContext);
    mockUseImpersonationState.mockReturnValue(defaultMockImpersonationState);
  });

  describe('基础渲染', () => {
    it('应该在visible为true时显示模态框', () => {
      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText(/选择要模拟的企业/)).toBeInTheDocument();
    });

    it('应该在visible为false时不显示模态框', () => {
      render(
        <EnterpriseSwitcher
          visible={false}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.queryByText(/选择要模拟的企业/)).not.toBeInTheDocument();
    });

    it('应该显示企业列表', () => {
      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('企业A')).toBeInTheDocument();
      expect(screen.getByText('企业B')).toBeInTheDocument();
      expect(screen.getByText('企业C')).toBeInTheDocument();
    });

    it('应该显示企业详细信息', () => {
      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('CORP_A')).toBeInTheDocument();
      expect(screen.getByText('测试企业A的描述')).toBeInTheDocument();
      expect(screen.getByText(/10 用户/)).toBeInTheDocument();
    });
  });

  describe('搜索功能', () => {
    it('应该能够搜索企业', () => {
      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText(/搜索企业名称、代码或描述/);
      fireEvent.change(searchInput, { target: { value: '企业A' } });

      expect(screen.getByText('企业A')).toBeInTheDocument();
      expect(screen.queryByText('企业B')).not.toBeInTheDocument();
      expect(screen.queryByText('企业C')).not.toBeInTheDocument();
    });

    it('应该支持按企业代码搜索', () => {
      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText(/搜索企业名称、代码或描述/);
      fireEvent.change(searchInput, { target: { value: 'CORP_B' } });

      expect(screen.queryByText('企业A')).not.toBeInTheDocument();
      expect(screen.getByText('企业B')).toBeInTheDocument();
      expect(screen.queryByText('企业C')).not.toBeInTheDocument();
    });

    it('应该支持按描述搜索', () => {
      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText(/搜索企业名称、代码或描述/);
      fireEvent.change(searchInput, { target: { value: '企业C的描述' } });

      expect(screen.queryByText('企业A')).not.toBeInTheDocument();
      expect(screen.queryByText('企业B')).not.toBeInTheDocument();
      expect(screen.getByText('企业C')).toBeInTheDocument();
    });

    it('应该在无搜索结果时显示空状态', () => {
      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText(/搜索企业名称、代码或描述/);
      fireEvent.change(searchInput, { target: { value: '不存在的企业' } });

      expect(screen.getByText(/未找到匹配的企业/)).toBeInTheDocument();
    });
  });

  describe('企业状态显示', () => {
    it('应该正确显示活跃状态', () => {
      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      const activeStatusTags = screen.getAllByText('活跃');
      expect(activeStatusTags).toHaveLength(2); // 企业A和企业C
    });

    it('应该正确显示不活跃状态', () => {
      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('不活跃')).toBeInTheDocument();
    });

    it('应该禁用不活跃企业的选择按钮', () => {
      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      const selectButtons = screen.getAllByText('选择模拟');
      // 企业B是不活跃的，其按钮应该被禁用
      expect(selectButtons[1]).toBeDisabled();
    });
  });

  describe('模拟流程', () => {
    it('应该在点击选择后显示原因输入界面', () => {
      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      const selectButtons = screen.getAllByText('选择模拟');
      fireEvent.click(selectButtons[0]); // 选择企业A

      expect(screen.getByText(/输入模拟原因/)).toBeInTheDocument();
      expect(screen.getByText(/将要模拟企业: 企业A/)).toBeInTheDocument();
    });

    it('应该要求输入模拟原因', () => {
      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      const selectButtons = screen.getAllByText('选择模拟');
      fireEvent.click(selectButtons[0]);

      const startButton = screen.getByText('开始模拟');
      expect(startButton).toBeDisabled(); // 没有输入原因时应该禁用

      const reasonInput = screen.getByPlaceholderText(/例如：协助客户解决权限问题/);
      fireEvent.change(reasonInput, { target: { value: '测试模拟原因' } });

      expect(startButton).not.toBeDisabled();
    });

    it('应该调用startImpersonation并关闭模态框', async () => {
      mockStartImpersonation.mockResolvedValue({});

      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      // 选择企业
      const selectButtons = screen.getAllByText('选择模拟');
      fireEvent.click(selectButtons[0]);

      // 输入原因
      const reasonInput = screen.getByPlaceholderText(/例如：协助客户解决权限问题/);
      fireEvent.change(reasonInput, { target: { value: '测试原因' } });

      // 开始模拟
      const startButton = screen.getByText('开始模拟');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockStartImpersonation).toHaveBeenCalledWith(1, '测试原因');
        expect(mockOnSelect).toHaveBeenCalledWith(1);
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('应该能够返回到企业列表', () => {
      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      // 进入原因输入界面
      const selectButtons = screen.getAllByText('选择模拟');
      fireEvent.click(selectButtons[0]);

      expect(screen.getByText(/输入模拟原因/)).toBeInTheDocument();

      // 点击返回按钮
      const backButton = screen.getByText('返回');
      fireEvent.click(backButton);

      // 应该回到企业列表
      expect(screen.getByText(/选择要模拟的企业/)).toBeInTheDocument();
      expect(screen.queryByText(/输入模拟原因/)).not.toBeInTheDocument();
    });
  });

  describe('权限控制', () => {
    it('应该在无权限时显示警告', () => {
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockImpersonationState,
        permissions: {
          ...defaultMockImpersonationState.permissions,
          canStartImpersonation: false
        }
      });

      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('权限不足')).toBeInTheDocument();
      expect(screen.getByText(/您没有权限开始企业模拟/)).toBeInTheDocument();
    });

    it('应该在无权限时禁用所有选择按钮', () => {
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockImpersonationState,
        permissions: {
          ...defaultMockImpersonationState.permissions,
          canStartImpersonation: false
        }
      });

      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      const selectButtons = screen.getAllByText('选择模拟');
      selectButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('当前模拟状态', () => {
    it('应该标识当前正在模拟的企业', () => {
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockImpersonationState,
        isImpersonating: true,
        enterpriseInfo: {
          id: 1,
          name: '企业A',
          code: 'CORP_A'
        }
      });

      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('正在模拟')).toBeInTheDocument();
      expect(screen.getByText('当前模拟')).toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    it('应该显示加载状态', () => {
      mockUseEnterprise.mockReturnValue({
        ...defaultMockEnterpriseContext,
        loading: true
      });

      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('应该在开始模拟时显示加载状态', () => {
      mockUseImpersonationState.mockReturnValue({
        ...defaultMockImpersonationState,
        loading: true
      });

      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      // 进入原因输入界面
      const selectButtons = screen.getAllByText('选择模拟');
      fireEvent.click(selectButtons[0]);

      const startButton = screen.getByText('开始模拟');
      expect(startButton).toHaveClass('ant-btn-loading');
    });
  });

  describe('刷新功能', () => {
    it('应该能够刷新企业列表', () => {
      render(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      const refreshButton = screen.getByText('刷新列表');
      fireEvent.click(refreshButton);

      expect(mockRefreshEnterprises).toHaveBeenCalled();
    });

    it('应该在打开时自动刷新列表', () => {
      const { rerender } = render(
        <EnterpriseSwitcher
          visible={false}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      expect(mockRefreshEnterprises).not.toHaveBeenCalled();

      rerender(
        <EnterpriseSwitcher
          visible={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
        />
      );

      expect(mockRefreshEnterprises).toHaveBeenCalled();
    });
  });
});