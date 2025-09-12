import React from 'react';
import { Badge, Space } from 'antd';
import { UserOutlined, BankOutlined } from '@ant-design/icons';
import { UserTabType, SystemUserStats, EnterpriseUserStats } from '../../types/user';

interface TabLabelProps {
  type: UserTabType;
  stats?: SystemUserStats | EnterpriseUserStats;
  loading?: boolean;
}

const TabLabel: React.FC<TabLabelProps> = ({ type, stats, loading = false }) => {
  const getTabConfig = (tabType: UserTabType) => {
    switch (tabType) {
      case 'system':
        return {
          title: '系统用户',
          icon: <UserOutlined />,
          color: '#1890ff'
        };
      case 'enterprise':
        return {
          title: '企业用户', 
          icon: <BankOutlined />,
          color: '#722ed1'
        };
      default:
        return {
          title: '未知',
          icon: <UserOutlined />,
          color: '#666'
        };
    }
  };

  const config = getTabConfig(type);
  const count = stats?.total || 0;

  return (
    <Space >
      <span style={{ color: config.color }}>
        {config.icon}
      </span>
      <span className="tab-title">
        {config.title}
      </span>
      <Badge 
        count={loading ? 0 : count} 
        showZero 
        style={{ 
          backgroundColor: config.color,
          fontSize: '12px'
        }} 
      />
    </Space>
  );
};

export default TabLabel;