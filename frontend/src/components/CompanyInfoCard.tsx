import React, { useState, useEffect } from 'react';
import { Card, Typography, Space, Tag, Skeleton, message } from 'antd';
import {
  BankOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { Enterprise } from '../types/enterprise';
import enterpriseService from '../services/enterpriseService';
import { User } from '../types/user';

const { Text, Title } = Typography;

interface CompanyInfoCardProps {
  user: User;
  style?: React.CSSProperties;
  size?: 'default' | 'small';
}

/**
 * 企业信息显示卡片组件
 * 显示用户所在企业的基本信息
 * 仅对企业用户显示，系统管理员不显示
 */
const CompanyInfoCard: React.FC<CompanyInfoCardProps> = ({ 
  user, 
  style,
  size = 'default'
}) => {
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 检查是否应该显示企业信息
  const shouldShowCompanyInfo = () => {
    // 系统管理员不显示企业信息
    if (user.user_type === 'system' && user.role === 'admin') {
      return false;
    }
    
    // 企业用户需要有enterprise_id或company_id (向后兼容)
    if (user.user_type === 'company' && (user.enterprise_id || user.company_id)) {
      return true;
    }
    
    return false;
  };

  // 加载企业信息
  const loadEnterpriseInfo = async () => {
    const enterpriseId = user.enterprise_id || user.company_id;
    if (!enterpriseId || !shouldShowCompanyInfo()) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🏢 加载企业信息，企业ID:', enterpriseId);
      const enterpriseData = await enterpriseService.getEnterprise(enterpriseId);
      setEnterprise(enterpriseData);
      console.log('✅ 企业信息加载成功:', enterpriseData);
    } catch (err) {
      console.error('❌ 加载企业信息失败:', err);
      setError('加载企业信息失败');
      message.error('加载企业信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnterpriseInfo();
  }, [user.enterprise_id, user.company_id]);

  // 如果不应该显示企业信息，返回null
  if (!shouldShowCompanyInfo()) {
    return null;
  }

  // 加载中状态
  if (loading) {
    return (
      <Card 
        style={style}
        size={size}
        title={
          <Space>
            <BankOutlined />
            <Text strong>企业信息</Text>
          </Space>
        }
      >
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }

  // 错误状态
  if (error && !enterprise) {
    return (
      <Card 
        style={style}
        size={size}
        title={
          <Space>
            <BankOutlined />
            <Text strong>企业信息</Text>
          </Space>
        }
      >
        <Text type="secondary">{error}</Text>
      </Card>
    );
  }

  // 没有企业信息
  if (!enterprise) {
    return null;
  }

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'orange';
      case 'suspended': return 'red';
      case 'potential': return 'blue';
      default: return 'default';
    }
  };

  // 获取业务类型标签颜色
  const getBusinessTypeColor = (businessType: string) => {
    switch (businessType) {
      case 'corporation': return 'blue';
      case 'llc': return 'cyan';
      case 'partnership': return 'purple';
      case 'individual': return 'orange';
      default: return 'default';
    }
  };

  return (
    <Card 
      style={style}
      size={size}
      title={
        <Space>
          <BankOutlined />
          <Text strong>企业信息</Text>
        </Space>
      }
      extra={
        <Space>
          <Tag color={getStatusColor(enterprise.status)}>
            {enterprise.status_text}
          </Tag>
          <Tag color={getBusinessTypeColor(enterprise.business_type)}>
            {enterprise.business_type_text}
          </Tag>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 企业名称和类型 */}
        <div>
          <Title level={size === 'small' ? 5 : 4} style={{ margin: 0 }}>
            {enterprise.name}
          </Title>
          <Text type="secondary">
            {enterprise.business_type_text}
            {enterprise.industry_type_text && ` • ${enterprise.industry_type_text}`}
          </Text>
        </div>

        {/* 联系信息 */}
        <Space direction="vertical" size="small">
          {enterprise.contact_phone && (
            <Space>
              <PhoneOutlined />
              <Text>{enterprise.contact_phone}</Text>
            </Space>
          )}
          
          {enterprise.contact_email && (
            <Space>
              <MailOutlined />
              <Text>{enterprise.contact_email}</Text>
            </Space>
          )}
          
          {enterprise.address && (
            <Space>
              <EnvironmentOutlined />
              <Text>
                {enterprise.address}
                {enterprise.city && `, ${enterprise.city}`}
                {enterprise.province && `, ${enterprise.province}`}
              </Text>
            </Space>
          )}
        </Space>

        {/* 企业统计信息 */}
        <Space wrap>
          {enterprise.user_count !== undefined && (
            <Space size="small">
              <TeamOutlined />
              <Text type="secondary">用户数: {enterprise.user_count}</Text>
            </Space>
          )}
          
          {enterprise.department_count !== undefined && (
            <Space size="small">
              <TeamOutlined />
              <Text type="secondary">部门数: {enterprise.department_count}</Text>
            </Space>
          )}
          
          <Space size="small">
            <CalendarOutlined />
            <Text type="secondary">
              创建: {new Date(enterprise.created_at).toLocaleDateString()}
            </Text>
          </Space>
        </Space>

        {/* 注册信息 */}
        <Space direction="vertical" size="small">
          {enterprise.registration_number && (
            <Text type="secondary">
              注册号: {enterprise.registration_number}
            </Text>
          )}
          
          {enterprise.tax_id && (
            <Text type="secondary">
              税务识别号: {enterprise.tax_id}
            </Text>
          )}
          
          {enterprise.legal_representative && (
            <Text type="secondary">
              法定代表人: {enterprise.legal_representative}
            </Text>
          )}
        </Space>
      </Space>
    </Card>
  );
};

export default CompanyInfoCard;