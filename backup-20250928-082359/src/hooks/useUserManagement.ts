import { useState, useCallback, useEffect } from 'react';
import userManagementService from '../services/userManagementService';
import { 
  User, 
  UserListResponse,
  SystemUserParams, 
  EnterpriseUserParams,
  SystemUserStats,
  EnterpriseUserStats 
} from '../types/user';

// 系统用户管理Hook
export const useSystemUsers = (params: SystemUserParams) => {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<SystemUserStats>();
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userManagementService.getUserList({
        ...params,
        user_type: 'system'
      });
      setUsers(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Error fetching system users:', error);
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await userManagementService.getUserStats();
      // 过滤出系统用户统计 - 目前后端返回的是所有用户统计，需要分离
      const systemStats: SystemUserStats = {
        total: statsData.total || 0,
        by_role: statsData.by_role || {},
        by_status: statsData.by_status || {},
        recent_registrations: statsData.recent_registrations || 0
      };
      setStats(systemStats);
    } catch (error) {
      console.error('Error fetching system user stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refetch = useCallback(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers, fetchStats]);

  return { 
    users, 
    total,
    stats, 
    loading, 
    refetch,
    refreshUsers: fetchUsers,
    refreshStats: fetchStats
  };
};

// 企业用户管理Hook
export const useEnterpriseUsers = (params: EnterpriseUserParams) => {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<EnterpriseUserStats>();
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userManagementService.getUserList({
        ...params,
        user_type: 'company'
      });
      setUsers(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Error fetching enterprise users:', error);
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await userManagementService.getUserStats();
      // 构建企业用户统计 - 需要后端支持分离统计
      const enterpriseStats: EnterpriseUserStats = {
        total: total, // 使用实际的企业用户总数
        by_enterprise: {}, // 需要后端提供
        by_status: statsData.by_status || {},
        primary_contacts: 0, // 需要后端提供
        expiring_accounts: 0, // 需要后端提供
        recent_registrations: statsData.recent_registrations || 0
      };
      setStats(enterpriseStats);
    } catch (error) {
      console.error('Error fetching enterprise user stats:', error);
    }
  }, [total]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refetch = useCallback(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers, fetchStats]);

  return { 
    users, 
    total,
    stats, 
    loading, 
    refetch,
    refreshUsers: fetchUsers,
    refreshStats: fetchStats
  };
};

// Tab状态管理Hook
export const useUserTabs = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'enterprise'>('system');
  const [systemParams, setSystemParams] = useState<SystemUserParams>({
    user_type: 'system',
    page: 1,
    page_size: 10
  });
  const [enterpriseParams, setEnterpriseParams] = useState<EnterpriseUserParams>({
    user_type: 'company',
    page: 1,
    page_size: 10
  });

  const handleTabChange = useCallback((tab: 'system' | 'enterprise') => {
    setActiveTab(tab);
  }, []);

  const updateSystemParams = useCallback((newParams: Partial<SystemUserParams>) => {
    setSystemParams(prev => ({ ...prev, ...newParams }));
  }, []);

  const updateEnterpriseParams = useCallback((newParams: Partial<EnterpriseUserParams>) => {
    setEnterpriseParams(prev => ({ ...prev, ...newParams }));
  }, []);

  return {
    activeTab,
    systemParams,
    enterpriseParams,
    handleTabChange,
    updateSystemParams,
    updateEnterpriseParams
  };
};