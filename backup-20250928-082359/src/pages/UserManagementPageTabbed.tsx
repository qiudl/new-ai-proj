import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Tabs,
  Breadcrumb,
  Typography,
  message
} from 'antd';
import { UserOutlined, BankOutlined } from '@ant-design/icons';
import '../components/UserManagement/UserManagement.css';
import TabLabel from '../components/UserManagement/TabLabel';
import SystemUsersTab from '../components/UserManagement/SystemUsersTab';
import EnterpriseUsersTab from '../components/UserManagement/EnterpriseUsersTab';
import { useUserTabs, useSystemUsers, useEnterpriseUsers } from '../hooks/useUserManagement';
import { UserTabType } from '../types/user';
import { Enterprise } from '../types/enterprise';
import enterpriseService from '../services/enterpriseService';

const { Title } = Typography;

const UserManagementPageTabbed: React.FC = () => {
  // Tab状态管理
  const {
    activeTab,
    systemParams,
    enterpriseParams,
    handleTabChange,
    updateSystemParams,
    updateEnterpriseParams
  } = useUserTabs();

  // 企业数据
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);

  // 获取企业列表
  const fetchEnterprises = useCallback(async () => {
    try {
      const response = await enterpriseService.getEnterprises(1, 100);
      setEnterprises(response.data);
    } catch (error) {
      console.error('Error fetching enterprises:', error);
      setEnterprises([]);
    }
  }, []);

  useEffect(() => {
    fetchEnterprises();
  }, [fetchEnterprises]);

  // 获取各Tab的统计数据用于标签显示
  const { stats: systemStats, loading: systemLoading } = useSystemUsers(systemParams);
  const { stats: enterpriseStats, loading: enterpriseLoading } = useEnterpriseUsers(enterpriseParams);

  // 统计点击处理
  const handleSystemStatClick = useCallback((type: string, value?: string) => {
    const newParams: any = { ...systemParams, page: 1 };
    
    switch (type) {
      case 'total':
        // 显示所有用户，清除筛选
        newParams.role = undefined;
        newParams.status = undefined;
        break;
      case 'role':
        newParams.role = value;
        break;
      case 'status':
        newParams.status = value;
        break;
      default:
        return;
    }
    
    updateSystemParams(newParams);
    message.success(`已筛选${type === 'total' ? '全部' : (value || type)}用户`);
  }, [systemParams, updateSystemParams]);

  const handleEnterpriseStatClick = useCallback((type: string, value?: string) => {
    const newParams: any = { ...enterpriseParams, page: 1 };
    
    switch (type) {
      case 'total':
        // 显示所有用户，清除筛选
        newParams.contact_type = undefined;
        newParams.status = undefined;
        newParams.enterprise_ids = undefined;
        break;
      case 'contact_type':
        newParams.contact_type = value;
        break;
      case 'status':
        newParams.status = value;
        break;
      case 'expiring':
        // 筛选即将过期的账户（需要后端支持）
        message.info('即将过期账户筛选功能需要后端支持');
        return;
      default:
        return;
    }
    
    updateEnterpriseParams(newParams);
    message.success(`已筛选${type === 'total' ? '全部' : (value || type)}用户`);
  }, [enterpriseParams, updateEnterpriseParams]);

  // Tab项配置
  const tabItems = [
    {
      key: 'system',
      label: (
        <TabLabel 
          type="system" 
          stats={systemStats} 
          loading={systemLoading}
        />
      ),
      children: (
        <SystemUsersTab
          params={systemParams}
          onParamsChange={updateSystemParams}
          onStatClick={handleSystemStatClick}
        />
      )
    },
    {
      key: 'enterprise',
      label: (
        <TabLabel 
          type="enterprise" 
          stats={enterpriseStats} 
          loading={enterpriseLoading}
        />
      ),
      children: (
        <EnterpriseUsersTab
          params={enterpriseParams}
          onParamsChange={updateEnterpriseParams}
          onStatClick={handleEnterpriseStatClick}
          enterprises={enterprises}
        />
      )
    }
  ];

  return (
    <div className="user-management-page">
      {/* 页面标题和面包屑 */}
      <div style={{ marginBottom: 24 }}>
        <Breadcrumb style={{ marginBottom: 16 }} items={[{ title: '系统管理' }, { title: '用户管理' }]} />
        
        <Title level={2} style={{ margin: 0 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          用户管理
        </Title>
        
        <div style={{ marginTop: 8, color: '#666' }}>
          分别管理系统用户和企业用户，提供专门的筛选和操作功能
        </div>
      </div>

      {/* Tab容器 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange as (key: string) => void}
          items={tabItems}
          size="large"
          tabBarStyle={{ 
            paddingLeft: 0,
            marginBottom: 24 
          }}
        />
      </Card>
    </div>
  );
};

export default UserManagementPageTabbed;