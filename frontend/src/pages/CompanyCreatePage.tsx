import React from 'react';
import { Card, Typography, Alert, Space } from 'antd';
import { BuildOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const CompanyCreatePage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <BuildOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            <Title level={2}>创建企业客户</Title>
          </div>
          
          <Alert
            message="功能开发中"
            description="企业客户创建功能正在开发中，敬请期待。该功能将支持完整的企业信息录入、联系人管理等功能。"
            type="info"
            showIcon
          />
          
          <div>
            <Title level={4}>即将支持的功能：</Title>
            <ul>
              <li>企业基本信息管理（公司名称、类型、规模等）</li>
              <li>企业联系人管理</li>
              <li>企业用户权限管理</li>
              <li>合同金额和商务信息</li>
              <li>企业项目关联管理</li>
            </ul>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default CompanyCreatePage;