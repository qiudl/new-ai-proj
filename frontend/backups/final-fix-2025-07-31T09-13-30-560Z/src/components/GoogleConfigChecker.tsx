// @ts-nocheck
/**
 * Google API 配置检查组件
 * 帮助用户验证和调试 Google API 配置
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Alert,
  Button,
  Space,
  Typography,
  Steps,
  Descriptions,
  Tag,
  Modal,
  List,
  Divider,
  Progress,
  message,
  Collapse
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  GoogleOutlined,
  KeyOutlined,
  LinkOutlined,
  BugOutlined
} from '@ant-design/icons';

import { getConfigStatus, validateGoogleConfig, GOOGLE_CONFIG, FEATURE_FLAGS } from '../config/googleConfig';
import { googleDocsService } from '../services/googleDocsService';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Panel } = Collapse;

interface ConfigCheckResult {
  step: number;
  title: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  description: string;
  details?: string;
  action?: () => void;
  actionText?: string;
}

const GoogleConfigChecker: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResults, setCheckResults] = useState<ConfigCheckResult[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [overallStatus, setOverallStatus] = useState<'success' | 'error' | 'warning'>('warning');

  // 获取配置状态
  const configStatus = getConfigStatus();

  // 执行配置检查
  const performConfigCheck = async () => {
    setChecking(true);
    setCurrentStep(0);
    
    const results: ConfigCheckResult[] = [];
    
    // 步骤 1: 检查环境变量
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentStep(1);
    
    if (!GOOGLE_CONFIG.CLIENT_ID || !GOOGLE_CONFIG.API_KEY) {
      results.push({
        step: 1,
        title: '环境变量检查',
        status: 'error',
        description: '缺少必要的环境变量',
        details: `
缺少的配置项：
${!GOOGLE_CONFIG.CLIENT_ID ? '- REACT_APP_GOOGLE_CLIENT_ID' : ''}
${!GOOGLE_CONFIG.API_KEY ? '- REACT_APP_GOOGLE_API_KEY' : ''}

请检查 .env 文件并添加相应配置。
        `
      });
    } else {
      results.push({
        step: 1,
        title: '环境变量检查',
        status: 'success',
        description: '环境变量配置正确',
        details: `
Client ID: ${GOOGLE_CONFIG.CLIENT_ID.slice(0, 20)}...
API Key: ${GOOGLE_CONFIG.API_KEY.slice(0, 10)}...
        `
      });
    }
    
    // 步骤 2: 检查网络连接
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentStep(2);
    
    try {
      const response = await fetch('https://www.googleapis.com/discovery/v1/apis', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      results.push({
        step: 2,
        title: '网络连接检查',
        status: 'success',
        description: 'Google APIs 网络连接正常'
      });
    } catch (error) {
      results.push({
        step: 2,
        title: '网络连接检查',
        status: 'error',
        description: '无法连接到 Google APIs',
        details: '请检查网络连接或防火墙设置'
      });
    }
    
    // 步骤 3: 检查 GAPI 加载
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentStep(3);
    
    try {
      await googleDocsService.initialize();
      
      results.push({
        step: 3,
        title: 'Google API 客户端加载',
        status: 'success',
        description: 'Google API 客户端库加载成功'
      });
    } catch (error) {
      results.push({
        step: 3,
        title: 'Google API 客户端加载',
        status: 'error',
        description: 'Google API 客户端库加载失败',
        details: `错误信息: ${error}`
      });
    }
    
    // 步骤 4: 检查认证状态
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentStep(4);
    
    if (googleDocsService.isAuthenticated()) {
      const user = await googleDocsService.getCurrentUser();
      results.push({
        step: 4,
        title: '用户认证检查',
        status: 'success',
        description: `已认证用户: ${user?.name || 'Unknown'}`,
        details: `邮箱: ${user?.email || 'Unknown'}`
      });
    } else {
      results.push({
        step: 4,
        title: '用户认证检查',
        status: 'warning',
        description: '用户未认证',
        details: '点击下方按钮进行 Google 认证',
        action: async () => {
          try {
            const success = await googleDocsService.authenticate();
            if (success) {
              message.success('认证成功！');
              performConfigCheck(); // 重新检查
            } else {
              message.error('认证失败');
            }
          } catch (error) {
            message.error(`认证失败: ${error}`);
          }
        },
        actionText: '开始认证'
      });
    }
    
    // 步骤 5: 测试基础功能
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentStep(5);
    
    if (googleDocsService.isAuthenticated()) {
      try {
        const documents = await googleDocsService.listDocuments(5);
        results.push({
          step: 5,
          title: '功能测试',
          status: 'success',
          description: `成功获取文档列表 (${documents.length} 个文档)`,
          details: documents.map(doc => `- ${doc.name}`).join('\n')
        });
      } catch (error) {
        results.push({
          step: 5,
          title: '功能测试',
          status: 'error',
          description: '文档列表获取失败',
          details: `错误信息: ${error}`
        });
      }
    } else {
      results.push({
        step: 5,
        title: '功能测试',
        status: 'pending',
        description: '需要先完成用户认证'
      });
    }
    
    setCheckResults(results);
    
    // 确定整体状态
    const hasError = results.some(r => r.status === 'error');
    const hasWarning = results.some(r => r.status === 'warning');
    setOverallStatus(hasError ? 'error' : hasWarning ? 'warning' : 'success');
    
    setChecking(false);
    setCurrentStep(0);
  };

  // 渲染配置状态
  const renderConfigStatus = () => (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Descriptions title="当前配置状态" column={2} size="small">
        <Descriptions.Item label="配置完整性">
          <Tag color={configStatus.isConfigured ? 'success' : 'error'}>
            {configStatus.isConfigured ? '已配置' : '未配置'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Google Docs">
          <Tag color={FEATURE_FLAGS.ENABLE_GOOGLE_DOCS ? 'success' : 'default'}>
            {FEATURE_FLAGS.ENABLE_GOOGLE_DOCS ? '已启用' : '已禁用'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Client ID">
          <Text code>{configStatus.clientId}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="API Key">
          <Text code>{configStatus.apiKey}</Text>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );

  // 渲染检查步骤
  const renderCheckSteps = () => (
    <Card title="配置检查步骤" size="small" style={{ marginBottom: 16 }}>
      <Steps
        current={currentStep}
        status={checking ? 'process' : 'wait'}
        size="small"
        direction="vertical"
      >
        <Step title="环境变量检查" description="验证必要的环境变量是否配置" />
        <Step title="网络连接检查" description="测试与 Google APIs 的网络连接" />
        <Step title="客户端库加载" description="加载 Google API 客户端库" />
        <Step title="用户认证检查" description="检查用户认证状态" />
        <Step title="功能测试" description="测试基础 API 功能" />
      </Steps>
    </Card>
  );

  // 渲染检查结果
  const renderCheckResults = () => {
    if (checkResults.length === 0) return null;

    return (
      <Card title="检查结果" size="small">
        <List
          dataSource={checkResults}
          renderItem={(result) => (
            <List.Item
              actions={result.action ? [
                <Button 
                  key="action" 
                  type="primary" 
                  size="small"
                  onClick={result.action}
                >
                  {result.actionText}
                </Button>
              ] : undefined}
            >
              <List.Item.Meta
                avatar={
                  result.status === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                  result.status === 'error' ? <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> :
                  result.status === 'warning' ? <ExclamationCircleOutlined style={{ color: '#faad14' }} /> :
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                }
                title={
                  <Space>
                    <Text strong>步骤 {result.step}: {result.title}</Text>
                    <Tag color={
                      result.status === 'success' ? 'success' :
                      result.status === 'error' ? 'error' :
                      result.status === 'warning' ? 'warning' :
                      'default'
                    }>
                      {result.status === 'success' ? '通过' :
                       result.status === 'error' ? '失败' :
                       result.status === 'warning' ? '警告' :
                       '待检查'}
                    </Tag>
                  </Space>
                }
                description={
                  <div>
                    <div>{result.description}</div>
                    {result.details && (
                      <Collapse ghost size="small" style={{ marginTop: 8 }}>
                        <Panel header="详细信息" key="details">
                          <Text style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                            {result.details}
                          </Text>
                        </Panel>
                      </Collapse>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };

  // 渲染快速修复建议
  const renderQuickFixes = () => (
    <Card title="快速修复建议" size="small" style={{ marginTop: 16 }}>
      <List size="small">
        <List.Item>
          <Space>
            <KeyOutlined />
            <Text strong>配置 API 密钥：</Text>
            <Text>在 .env 文件中设置 REACT_APP_GOOGLE_API_KEY</Text>
          </Space>
        </List.Item>
        <List.Item>
          <Space>
            <GoogleOutlined />
            <Text strong>配置客户端 ID：</Text>
            <Text>在 .env 文件中设置 REACT_APP_GOOGLE_CLIENT_ID</Text>
          </Space>
        </List.Item>
        <List.Item>
          <Space>
            <LinkOutlined />
            <Text strong>检查域名配置：</Text>
            <Text>在 Google Cloud Console 中添加当前域名到授权列表</Text>
          </Space>
        </List.Item>
        <List.Item>
          <Space>
            <SettingOutlined />
            <Text strong>启用必要的 API：</Text>
            <Text>在 Google Cloud Console 中启用 Google Docs API 和 Google Drive API</Text>
          </Space>
        </List.Item>
      </List>
    </Card>
  );

  return (
    <>
      <Button
        type="primary"
        icon={<BugOutlined />}
        onClick={() => setVisible(true)}
      >
        Google API 配置检查
      </Button>

      <Modal
        title={
          <Space>
            <GoogleOutlined style={{ color: '#4285f4' }} />
            Google API 配置检查器
          </Space>
        }
        open={visible}
        onCancel={() => setVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="check" 
            type="primary" 
            loading={checking}
            onClick={performConfigCheck}
          >
            {checking ? '检查中...' : '开始检查'}
          </Button>
        ]}
      >
        {/* 整体状态提示 */}
        {checkResults.length > 0 && (
          <Alert
            message={
              overallStatus === 'success' ? 'Google API 配置正常' :
              overallStatus === 'warning' ? 'Google API 配置存在警告' :
              'Google API 配置存在问题'
            }
            type={overallStatus}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 当前配置状态 */}
        {renderConfigStatus()}

        {/* 检查进度 */}
        {checking && (
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <Progress 
                percent={Math.round((currentStep / 5) * 100)} 
                status="active"
                style={{ marginBottom: 8 }}
              />
              <Text>正在执行配置检查... 第 {currentStep} 步，共 5 步</Text>
            </div>
          </Card>
        )}

        {/* 检查步骤 */}
        {renderCheckSteps()}

        {/* 检查结果 */}
        {renderCheckResults()}

        {/* 快速修复建议 */}
        {checkResults.length > 0 && overallStatus !== 'success' && renderQuickFixes()}

        {/* 帮助链接 */}
        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Space>
            <Text type="secondary">需要帮助？</Text>
            <Button 
              type="link" 
              size="small" 
              onClick={() => {
                window.open('/GOOGLE_API_SETUP.md', '_blank');
              }}
            >
              查看配置指南
            </Button>
            <Button 
              type="link" 
              size="small"
              onClick={() => {
                window.open('https://console.developers.google.com/', '_blank');
              }}
            >
              Google Cloud Console
            </Button>
          </Space>
        </div>
      </Modal>
    </>
  );
};

export default GoogleConfigChecker;