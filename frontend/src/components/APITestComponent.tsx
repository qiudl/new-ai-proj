/**
 * API测试组件
 * 用于验证文档API修复效果
 */

import React, { useState } from 'react';
import { Card, Button, Space, Typography, Alert, Divider, Tag, message } from 'antd';
import { ExperimentOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { projectService } from '../services/projectService';
import { customerService } from '../services/customerService';
import { documentVersionService } from '../services/documentVersionService';

const { Title, Text, Paragraph } = Typography;

const APITestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<{
    projects: { status: 'pending' | 'success' | 'error'; data?: any; error?: string };
    customers: { status: 'pending' | 'success' | 'error'; data?: any; error?: string };
    versions: { status: 'pending' | 'success' | 'error'; data?: any; error?: string };
  }>({
    projects: { status: 'pending' },
    customers: { status: 'pending' },
    versions: { status: 'pending' }
  });

  const testProjectsAPI = async () => {
    console.log('开始测试项目API...');
    setTestResults(prev => ({ ...prev, projects: { status: 'pending' } }));
    
    try {
      const response = await projectService.getProjects({ page: 1, pageSize: 5 });
      console.log('项目API测试成功:', response);
      setTestResults(prev => ({ 
        ...prev, 
        projects: { status: 'success', data: response.data.slice(0, 3) } 
      }));
      message.success('项目API测试成功');
    } catch (error) {
      console.error('项目API测试失败:', error);
      setTestResults(prev => ({ 
        ...prev, 
        projects: { status: 'error', error: (error as Error).message || '未知错误' } 
      }));
      message.error('项目API测试失败');
    }
  };

  const testCustomersAPI = async () => {
    console.log('开始测试客户API...');
    setTestResults(prev => ({ ...prev, customers: { status: 'pending' } }));
    
    try {
      const customers = await customerService.getCustomersForDocumentMetadata();
      console.log('客户API测试成功:', customers);
      setTestResults(prev => ({ 
        ...prev, 
        customers: { status: 'success', data: customers.slice(0, 3) } 
      }));
      message.success('客户API测试成功');
    } catch (error) {
      console.error('客户API测试失败:', error);
      setTestResults(prev => ({ 
        ...prev, 
        customers: { status: 'error', error: (error as Error).message || '未知错误' } 
      }));
      message.error('客户API测试失败');
    }
  };

  const testVersionsAPI = async () => {
    console.log('开始测试版本历史API...');
    setTestResults(prev => ({ ...prev, versions: { status: 'pending' } }));
    
    try {
      const response = await documentVersionService.getVersionHistory(1); // 测试文档ID 1
      console.log('版本历史API测试成功:', response);
      setTestResults(prev => ({ 
        ...prev, 
        versions: { status: 'success', data: response } 
      }));
      message.success('版本历史API测试成功');
    } catch (error) {
      console.error('版本历史API测试失败:', error);
      setTestResults(prev => ({ 
        ...prev, 
        versions: { status: 'error', error: (error as Error).message || '未知错误' } 
      }));
      message.error('版本历史API测试失败');
    }
  };

  const runAllTests = async () => {
    console.log('开始运行所有API测试...');
    await testProjectsAPI();
    await testCustomersAPI();
    await testVersionsAPI();
    console.log('所有API测试完成');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ExperimentOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'success':
        return <Tag color="success">成功</Tag>;
      case 'error':
        return <Tag color="error">失败</Tag>;
      case 'pending':
        return <Tag color="processing">待测试</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  return (
    <Card 
      title={
        <Space>
          <ExperimentOutlined />
          <span>API修复测试工具</span>
        </Space>
      }
      style={{ margin: '16px' }}
    >
      <Alert
        message="API修复验证"
        description="此工具用于验证文档查看页面的API修复效果。点击下方按钮测试各个API接口。"
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 测试控制按钮 */}
        <div>
          <Space>
            <Button type="primary" onClick={runAllTests}>
              运行所有测试
            </Button>
            <Button onClick={testProjectsAPI}>
              测试项目API
            </Button>
            <Button onClick={testCustomersAPI}>
              测试客户API
            </Button>
            <Button onClick={testVersionsAPI}>
              测试版本历史API
            </Button>
          </Space>
        </div>

        <Divider />

        {/* 项目API测试结果 */}
        <Card size="small" title={
          <Space>
            {getStatusIcon(testResults.projects.status)}
            <span>项目API测试</span>
            {getStatusTag(testResults.projects.status)}
          </Space>
        }>
          {testResults.projects.status === 'success' && testResults.projects.data && (
            <div>
              <Text strong>成功加载 {testResults.projects.data.length} 个项目:</Text>
              <ul>
                {testResults.projects.data.map((project: any) => (
                  <li key={project.id}>
                    <Text>{project.name}</Text>
                    {project.description && (
                      <Text type="secondary"> - {project.description}</Text>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {testResults.projects.status === 'error' && (
            <Alert
              message="项目API调用失败"
              description={testResults.projects.error}
              type="error"
            />
          )}
        </Card>

        {/* 客户API测试结果 */}
        <Card size="small" title={
          <Space>
            {getStatusIcon(testResults.customers.status)}
            <span>客户API测试</span>
            {getStatusTag(testResults.customers.status)}
          </Space>
        }>
          {testResults.customers.status === 'success' && testResults.customers.data && (
            <div>
              <Text strong>成功加载 {testResults.customers.data.length} 个客户:</Text>
              <ul>
                {testResults.customers.data.map((customer: any) => (
                  <li key={customer.id}>
                    <Text>{customer.name}</Text>
                    {customer.description && (
                      <Text type="secondary"> - {customer.description}</Text>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {testResults.customers.status === 'error' && (
            <Alert
              message="客户API调用失败"
              description={testResults.customers.error}
              type="error"
            />
          )}
        </Card>

        {/* 版本历史API测试结果 */}
        <Card size="small" title={
          <Space>
            {getStatusIcon(testResults.versions.status)}
            <span>版本历史API测试</span>
            {getStatusTag(testResults.versions.status)}
          </Space>
        }>
          {testResults.versions.status === 'success' && testResults.versions.data && (
            <div>
              <Text strong>版本历史信息:</Text>
              <ul>
                <li>总版本数: {testResults.versions.data.totalCount}</li>
                <li>当前版本: {testResults.versions.data.currentVersion}</li>
                <li>版本列表: {testResults.versions.data.versions.length} 个版本</li>
              </ul>
            </div>
          )}
          {testResults.versions.status === 'error' && (
            <Alert
              message="版本历史API调用失败"
              description={testResults.versions.error}
              type="error"
            />
          )}
        </Card>

        <Divider />

        {/* 环境信息 */}
        <Card size="small" title="环境配置信息">
          <ul>
            <li>API基础URL: {process.env.REACT_APP_API_URL || '未设置'}</li>
            <li>启用Mock: {process.env.REACT_APP_ENABLE_MOCK || 'false'}</li>
            <li>环境: {process.env.REACT_APP_ENV || '未设置'}</li>
            <li>Token存在: {localStorage.getItem('token') ? '是' : '否'}</li>
          </ul>
        </Card>
      </Space>
    </Card>
  );
};

export default APITestComponent;