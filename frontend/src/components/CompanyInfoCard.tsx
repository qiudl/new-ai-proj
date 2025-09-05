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
import { Company } from '../types/company';
import companyService from '../services/companyService';
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
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 检查是否应该显示企业信息
  const shouldShowCompanyInfo = () => {
    // 系统管理员不显示企业信息
    if (user.user_type === 'system' && user.role === 'admin') {
      return false;
    }
    
    // 企业用户需要有company_id
    if (user.user_type === 'company' && user.company_id) {
      return true;
    }
    
    return false;
  };

  // 加载企业信息
  const loadCompanyInfo = async () => {
    if (!user.company_id || !shouldShowCompanyInfo()) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🏢 加载企业信息，企业ID:', user.company_id);
      const companyData = await companyService.getCompany(user.company_id);
      setCompany(companyData);
      console.log('✅ 企业信息加载成功:', companyData);
    } catch (err) {
      console.error('❌ 加载企业信息失败:', err);
      setError('加载企业信息失败');
      message.error('加载企业信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyInfo();
  }, [user.company_id]);

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
  if (error && !company) {
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
  if (!company) {
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

  // 获取优先级标签颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'blue';
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
          <Tag color={getStatusColor(company.status)}>
            {company.statusText}
          </Tag>
          <Tag color={getPriorityColor(company.priority)}>
            {company.priorityText}
          </Tag>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 企业名称和类型 */}
        <div>
          <Title level={size === 'small' ? 5 : 4} style={{ margin: 0 }}>
            {company.companyName}
          </Title>
          <Text type="secondary">
            {company.companyTypeText}
            {company.companySizeText && ` • ${company.companySizeText}`}
          </Text>
        </div>

        {/* 联系信息 */}
        <Space direction="vertical" size="small">
          {company.mainPhone && (
            <Space>
              <PhoneOutlined />
              <Text>{company.mainPhone}</Text>
            </Space>
          )}
          
          {company.mainEmail && (
            <Space>
              <MailOutlined />
              <Text>{company.mainEmail}</Text>
            </Space>
          )}
          
          {company.address && (
            <Space>
              <EnvironmentOutlined />
              <Text>
                {company.address}
                {company.city && `, ${company.city}`}
                {company.province && `, ${company.province}`}
              </Text>
            </Space>
          )}
        </Space>

        {/* 企业规模和成立时间 */}
        <Space wrap>
          {company.employeeCount && (
            <Space size="small">
              <TeamOutlined />
              <Text type="secondary">员工数: {company.employeeCount}</Text>
            </Space>
          )}
          
          {company.startDate && (
            <Space size="small">
              <CalendarOutlined />
              <Text type="secondary">
                成立: {new Date(company.startDate).toLocaleDateString()}
              </Text>
            </Space>
          )}
        </Space>

        {/* 行业信息 */}
        {company.industry && (
          <Text type="secondary">
            行业: {company.industry}
          </Text>
        )}
      </Space>
    </Card>
  );
};

export default CompanyInfoCard;