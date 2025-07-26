/**
 * JWT调试功能使用示例
 * 展示如何在实际组件中集成JWT调试功能
 */

import React, { useEffect, useState } from 'react';
import { Card, Button, Space, Alert, Typography, Divider } from 'antd';
import { BugOutlined, ReloadOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useJWTStatus } from '../hooks/useJWTStatus';
import { createModuleRequest } from '../utils/enhancedRequest';
import { jwtDebugger, checkJWT, testJWT } from '../utils/jwtDebugger';
import { runJWTTests } from '../utils/jwtTestScript';

const { Title, Text, Paragraph } = Typography;

// 创建该组件专用的请求实例
const exampleRequest = createModuleRequest('JWTDebugExample');

const JWTDebugUsageExample: React.FC = () => {
  const [apiTestResult, setApiTestResult] = useState<any>(null);
  const [testResults, setTestResults] = useState<any[]>([]);

  // 使用JWT状态Hook
  const {
    hasToken,
    isValid,
    isExpired,
    hasErrors,
    userInfo,
    expiresIn,
    refresh,
    testJWT: hookTestJWT
  } = useJWTStatus({
    moduleName: 'JWTDebugExample',
    checkInterval: 10000, // 10秒检查一次
    autoRefresh: true
  });

  // 组件加载时记录JWT状态
  useEffect(() => {
    console.log('🔍 JWTDebugExample组件加载，检查JWT状态');
    checkJWT('JWTDebugExample_Mount');
  }, []);

  // 模拟API调用
  const handleApiCall = async () => {
    try {
      console.log('📡 发起API调用...');
      const response = await exampleRequest.get('/api/v1/users/profile');
      setApiTestResult({ success: true, data: response.data });
    } catch (error: any) {
      setApiTestResult({ success: false, error: error.message });
    }
  };

  // 测试JWT有效性
  const handleJWTTest = async () => {
    console.log('🧪 测试JWT...');
    const result = await testJWT('/api/v1/users/profile');
    setApiTestResult(result);
  };

  // 运行完整测试套件
  const handleRunTests = async () => {
    console.log('🧪 运行JWT调试功能测试套件...');
    const results = await runJWTTests();
    setTestResults(results);
  };

  // 手动打印调试信息
  const handlePrintDebugInfo = () => {
    console.log('📋 手动打印JWT调试信息:');
    jwtDebugger.printJWTStatus('JWTDebugExample_Manual');
    
    // 生成并打印报告
    const report = jwtDebugger.generateDebugReport();
    console.log('📊 调试报告:\n', report);
  };

  // 清除token（测试用）
  const handleClearToken = () => {
    localStorage.removeItem('token');
    refresh(); // 刷新状态
  };

  // 设置测试token（测试用）
  const handleSetTestToken = () => {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InRlc3QiLCJyb2xlIjoiYWRtaW4iLCJ1c2VyX3R5cGUiOiJzeXN0ZW0iLCJzdWIiOiJ0ZXN0IiwiZXhwIjoxNzg1MDE4NDcyLCJuYmYiOjE3NTM0ODI0NzIsImlhdCI6MTc1MzQ4MjQ3Mn0.fake_signature';
    localStorage.setItem('token', testToken);
    refresh(); // 刷新状态
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>
        <BugOutlined /> JWT调试功能使用示例
      </Title>
      
      <Paragraph>
        这个页面展示了如何在实际组件中使用JWT调试功能。所有的调试信息都会输出到浏览器控制台。
      </Paragraph>

      {/* JWT状态显示 */}
      <Card title="📊 当前JWT状态" style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Token状态: </Text>
            <Text type={hasToken ? 'success' : 'danger'}>
              {hasToken ? '✅ 存在' : '❌ 不存在'}
            </Text>
          </div>
          
          <div>
            <Text strong>有效性: </Text>
            <Text type={isValid ? 'success' : 'danger'}>
              {isValid ? '✅ 有效' : '❌ 无效'}
            </Text>
          </div>
          
          <div>
            <Text strong>过期状态: </Text>
            <Text type={isExpired ? 'warning' : 'success'}>
              {isExpired ? '⚠️ 已过期' : '✅ 未过期'}
            </Text>
          </div>

          {hasErrors && (
            <Alert
              message="发现JWT问题"
              description="请查看浏览器控制台获取详细信息"
              type="warning"
              showIcon
            />
          )}

          {userInfo && (
            <div>
              <Text strong>用户信息: </Text>
              <Text>ID: {userInfo.user_id}, 用户名: {userInfo.username}, 角色: {userInfo.role}</Text>
            </div>
          )}

          {expiresIn && (
            <div>
              <Text strong>剩余时间: </Text>
              <Text>{Math.floor(expiresIn / 3600)}小时{Math.floor((expiresIn % 3600) / 60)}分钟</Text>
            </div>
          )}
        </Space>
      </Card>

      {/* 操作按钮 */}
      <Card title="🛠️ 调试操作" style={{ marginBottom: '16px' }}>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={refresh}>
            刷新JWT状态
          </Button>
          
          <Button icon={<ExperimentOutlined />} onClick={handleJWTTest}>
            测试JWT
          </Button>
          
          <Button onClick={handleApiCall}>
            模拟API调用
          </Button>
          
          <Button onClick={handlePrintDebugInfo}>
            打印调试信息
          </Button>
          
          <Button onClick={handleRunTests}>
            运行测试套件
          </Button>
          
          <Divider type="vertical" />
          
          <Button onClick={handleClearToken} danger>
            清除Token
          </Button>
          
          <Button onClick={handleSetTestToken}>
            设置测试Token
          </Button>
        </Space>
      </Card>

      {/* API测试结果 */}
      {apiTestResult && (
        <Card title="📡 API测试结果" style={{ marginBottom: '16px' }}>
          <Alert
            message={apiTestResult.success ? 'API调用成功' : 'API调用失败'}
            description={
              <pre style={{ marginTop: '8px', fontSize: '12px' }}>
                {JSON.stringify(apiTestResult, null, 2)}
              </pre>
            }
            type={apiTestResult.success ? 'success' : 'error'}
            showIcon
          />
        </Card>
      )}

      {/* 测试结果 */}
      {testResults.length > 0 && (
        <Card title="🧪 测试套件结果" style={{ marginBottom: '16px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {testResults.map((result, index) => (
              <div key={index}>
                <Text strong type={result.passed ? 'success' : 'danger'}>
                  {result.passed ? '✅' : '❌'} {result.testName}
                </Text>
                <br />
                <Text type="secondary">{result.message}</Text>
              </div>
            ))}
            
            <Alert
              message={`测试完成: ${testResults.filter(r => r.passed).length}/${testResults.length} 通过`}
              type={testResults.every(r => r.passed) ? 'success' : 'warning'}
            />
          </Space>
        </Card>
      )}

      {/* 使用说明 */}
      <Card title="📖 使用说明">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>1. 查看实时状态：</Text>
            <Text> 页面会自动显示当前JWT的状态信息</Text>
          </div>
          
          <div>
            <Text strong>2. 控制台调试：</Text>
            <Text> 打开浏览器开发者工具查看详细的调试信息</Text>
          </div>
          
          <div>
            <Text strong>3. 浮动调试按钮：</Text>
            <Text> 页面右下角的调试按钮可以打开可视化调试面板</Text>
          </div>
          
          <div>
            <Text strong>4. 快速命令：</Text>
            <Text> 在控制台中可以使用 checkJWT('模块名')、testJWT()、runJWTTests() 等命令</Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default JWTDebugUsageExample;